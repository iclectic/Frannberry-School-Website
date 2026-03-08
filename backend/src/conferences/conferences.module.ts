import { Module } from '@nestjs/common';
import { ConferencesService } from './conferences.service';
import { ConferencesController } from './conferences.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [ConferencesController],
  providers: [ConferencesService],
})
export class ConferencesModule {}
