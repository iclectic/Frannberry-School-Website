import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
