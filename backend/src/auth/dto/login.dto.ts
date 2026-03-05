import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@frannberry.school' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ required: false, description: 'MFA TOTP code (required for staff/teachers with MFA enabled)' })
  @IsOptional()
  @IsString()
  mfaCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class EnableMfaDto {
  @ApiProperty({ description: 'TOTP code from authenticator app to confirm MFA setup' })
  @IsString()
  totpCode: string;
}
