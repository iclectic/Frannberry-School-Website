import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
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
import {
  canDisableMfa,
  clearSignInLock,
  decryptSecret,
  encryptSecret,
  encryptionKeyFromSecret,
  generateBackupCodes,
  hashBackupCode,
  hashToken,
  isAccountLocked,
  registerFailedSignIn,
  sessionNeedsMfaSetup,
} from './account-security';
import { pupilCanLogin } from '../school/phase-rules';

const SALT_ROUNDS = 12;
const RESET_TTL_MS = 60 * 60 * 1000;

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

    const now = new Date();
    if (isAccountLocked(user, now)) {
      throw new UnauthorizedException(
        `Account locked until ${user.lockedUntil!.toISOString()} after 5 failed sign-ins. Try again in 15 minutes.`,
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.recordFailedSignIn(user.id, user.failedLoginAttempts, user.lockedUntil, now);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role === Role.STUDENT) {
      const pupil = await this.prisma.studentProfile.findUnique({
        where: { userId: user.id },
        include: { school: true, class: { include: { school: true } } },
      });
      const phase = pupil?.school?.phase ?? pupil?.class?.school?.phase;
      if (phase && !pupilCanLogin(phase)) {
        throw new UnauthorizedException('Nursery children cannot sign in');
      }
    }

    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        return { requiresMfa: true, message: 'MFA code required' };
      }
      const totpValid = this.verifyTotp(user.mfaSecret, dto.mfaCode);
      if (!totpValid) {
        const backupValid = await this.consumeBackupCode(user.id, dto.mfaCode);
        if (!backupValid) {
          await this.recordFailedSignIn(user.id, user.failedLoginAttempts, user.lockedUntil, now);
          throw new UnauthorizedException('Invalid MFA code');
        }
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: clearSignInLock(),
    });

    const mfaSetupRequired = sessionNeedsMfaSetup(user.role, user.mfaEnabled);
    const tokens = await this.generateTokens(user.id, user.email, user.role, mfaSetupRequired);

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
      mfaSetupRequired,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        mfaSetupRequired,
      },
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashToken(dto.refreshToken) },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const mfaSetupRequired = sessionNeedsMfaSetup(storedToken.user.role, storedToken.user.mfaEnabled);
    return this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role,
      mfaSetupRequired,
    );
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: hashToken(refreshToken) },
        data: { revoked: true },
      });
    } else {
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

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: encryptSecret(secret, this.encryptionKey()), mfaEnabled: false },
    });

    return { secret, otpAuthUrl };
  }

  async confirmMfa(userId: string, totpCode: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    let secret: string;
    try {
      secret = decryptSecret(user.mfaSecret, this.encryptionKey());
    } catch {
      throw new BadRequestException('MFA setup not initiated');
    }

    const isValid = authenticator.verify({ token: totpCode, secret });
    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    const backupCodes = generateBackupCodes();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      }),
      this.prisma.backupCode.deleteMany({ where: { userId } }),
      this.prisma.backupCode.createMany({
        data: backupCodes.map((code) => ({ userId, codeHash: hashBackupCode(code) })),
      }),
    ]);

    await this.audit.log({
      userId,
      action: 'MFA_ENABLE',
      entity: 'User',
      entityId: userId,
    });

    return {
      message: 'MFA enabled successfully. Save these backup codes now. They will not be shown again.',
      backupCodes,
    };
  }

  async disableMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (!canDisableMfa(user.role)) {
      throw new ForbiddenException('Heads, office admins, and teachers cannot turn MFA off');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false, mfaSecret: null },
      }),
      this.prisma.backupCode.deleteMany({ where: { userId } }),
    ]);

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
    if (!user) return { message: 'If an account exists with that email, a reset link has been sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const now = new Date();

    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    });
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + RESET_TTL_MS),
      },
    });

    const frontendUrl = this.config.get<string>('CORS_ORIGIN', 'http://localhost:3000');
    const resetLink = `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
    await this.email.sendPasswordReset(user.email, user.firstName, resetLink);

    return { message: 'If an account exists with that email, a reset link has been sent.' };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const reset = user
      ? await this.prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } })
      : null;

    if (!user || !reset || reset.userId !== user.id || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, ...clearSignInLock() },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { revoked: true },
      }),
    ]);

    await this.audit.log({
      userId: user.id,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: user.id,
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  private async recordFailedSignIn(
    userId: string,
    attempts: number,
    lockedUntil: Date | null,
    now: Date,
  ) {
    const next = registerFailedSignIn({ failedLoginAttempts: attempts, lockedUntil }, now);
    await this.prisma.user.update({
      where: { id: userId },
      data: next,
    });
  }

  private verifyTotp(storedSecret: string | null, code: string): boolean {
    if (!storedSecret || !/^\d{6}$/.test(code)) return false;
    try {
      const secret = decryptSecret(storedSecret, this.encryptionKey());
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  }

  private async consumeBackupCode(userId: string, code: string): Promise<boolean> {
    const result = await this.prisma.backupCode.updateMany({
      where: { userId, codeHash: hashBackupCode(code), usedAt: null },
      data: { usedAt: new Date() },
    });
    return result.count > 0;
  }

  private encryptionKey() {
    const secret = this.config.get<string>('MFA_ENCRYPTION_KEY')
      || this.config.get<string>('JWT_SECRET')
      || 'frannberry-dev-mfa-key';
    return encryptionKeyFromSecret(secret);
  }

  private async generateTokens(userId: string, email: string, role: Role, mfaSetupRequired: boolean) {
    const payload = { sub: userId, email, role, scope: mfaSetupRequired ? 'mfa-setup' : 'full' };
    const accessToken = this.jwt.sign(payload);

    const refreshToken = uuidv4();
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();
    const days = parseInt(refreshExpiresIn.replace('d', ''), 10) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: {
        token: hashToken(refreshToken),
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
