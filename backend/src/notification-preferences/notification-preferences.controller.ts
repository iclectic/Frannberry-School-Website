import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationPreferencesService } from './notification-preferences.service';

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(private service: NotificationPreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notification preferences' })
  async get(@CurrentUser('id') userId: string) {
    return this.service.getOrCreate(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update my notification preferences' })
  async update(
    @CurrentUser('id') userId: string,
    @Body() body: Partial<{
      emailAnnouncements: boolean;
      emailMessages: boolean;
      emailAssignments: boolean;
      emailResults: boolean;
      emailEvents: boolean;
      emailFees: boolean;
      pushEnabled: boolean;
      digestEnabled: boolean;
      digestFrequency: string;
    }>,
  ) {
    return this.service.update(userId, body);
  }
}
