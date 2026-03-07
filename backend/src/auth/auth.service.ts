import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
    private email: EmailService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // MFA check for staff and teachers
    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        return { requiresMfa: true, message: 'MFA code required' };
      }
      const isValid = authenticator.verify({
        token: dto.mfaCode,
        secret: user.mfaSecret!,
      });
      if (!isValid) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    return this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role,
    );
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { revoked: true },
      });
    } else {
      // Revoke all refresh tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { revoked: true },
      });
    }

    await this.audit.log({
      userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId,
    });
  }

  async enableMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.mfaEnabled) throw new ConflictException('MFA already enabled');

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(
      user.email,
      this.config.get<string>('MFA_APP_NAME', 'Frannberry School'),
      secret,
    );

    // Store secret temporarily (will be confirmed on verify)
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return { secret, otpAuthUrl };
  }

  async confirmMfa(userId: string, totpCode: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    const isValid = authenticator.verify({
      token: totpCode,
      secret: user.mfaSecret,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    await this.audit.log({
      userId,
      action: 'MFA_ENABLE',
      entity: 'User',
      entityId: userId,
    });

    return { message: 'MFA enabled successfully' };
  }

  async disableMfa(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });

    await this.audit.log({
      userId,
      action: 'MFA_DISABLE',
      entity: 'User',
      entityId: userId,
    });

    return { message: 'MFA disabled successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If an account exists with that email, a reset link has been sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Store hashed token in mfaSecret field temporarily (reused field)
    // In production, use a dedicated PasswordReset table
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: `reset:${hashedToken}:${Date.now() + 3600000}` },
    });

    const frontendUrl = this.config.get<string>('CORS_ORIGIN', 'http://localhost:3000');
    const resetLink = `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    await this.email.sendPasswordReset(user.email, user.firstName, resetLink);

    return { message: 'If an account exists with that email, a reset link has been sent.' };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.mfaSecret?.startsWith('reset:')) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const parts = user.mfaSecret.split(':');
    const storedHash = parts[1];
    const expiry = parseInt(parts[2], 10);

    if (Date.now() > expiry) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    if (hashedToken !== storedHash) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, mfaSecret: user.mfaEnabled ? user.mfaSecret : null },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    });

    await this.audit.log({
      userId: user.id,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: user.id,
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  private async generateTokens(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwt.sign(payload);

    const refreshToken = uuidv4();
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();
    const days = parseInt(refreshExpiresIn.replace('d', ''), 10) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
