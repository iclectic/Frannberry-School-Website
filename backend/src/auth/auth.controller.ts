import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, EnableMfaDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out and revoke refresh tokens' })
  async logout(@CurrentUser('id') userId: string, @Body('refreshToken') refreshToken?: string) {
    return this.authService.logout(userId, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate MFA setup – returns secret and QR URI' })
  async enableMfa(@CurrentUser('id') userId: string) {
    return this.authService.enableMfa(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/confirm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm MFA setup with a TOTP code' })
  async confirmMfa(@CurrentUser('id') userId: string, @Body() dto: EnableMfaDto) {
    return this.authService.confirmMfa(userId, dto.totpCode);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA' })
  async disableMfa(@CurrentUser('id') userId: string) {
    return this.authService.disableMfa(userId);
  }
}
