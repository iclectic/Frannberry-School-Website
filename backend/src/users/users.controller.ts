import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Get('me/children')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Get linked children (parents only)' })
  async getMyChildren(@CurrentUser('id') userId: string) {
    return this.usersService.getMyChildren(userId);
  }

  @Get('me/students')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Get students in my classes (teachers only)' })
  async getMyStudents(@CurrentUser('id') userId: string) {
    return this.usersService.getMyStudents(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateProfile(userId, body);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(userId, body.currentPassword, body.newPassword);
  }
}
