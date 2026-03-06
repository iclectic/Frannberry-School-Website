import { Module } from '@nestjs/common';
import { ReportCardsService } from './report-cards.service';
import { ReportCardsController } from './report-cards.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ReportCardsController],
  providers: [ReportCardsService],
  exports: [ReportCardsService],
})
export class ReportCardsModule {}
