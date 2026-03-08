import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ResultsModule } from './results/results.module';
import { MessagingModule } from './messaging/messaging.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { FileStorageModule } from './file-storage/file-storage.module';
import { CmsModule } from './cms/cms.module';
import { TimetableModule } from './timetable/timetable.module';
import { AttendanceModule } from './attendance/attendance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportCardsModule } from './report-cards/report-cards.module';
import { EventsModule } from './events/events.module';
import { FeesModule } from './fees/fees.module';
import { EmailModule } from './email/email.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SearchModule } from './search/search.module';
import { ConferencesModule } from './conferences/conferences.module';
import { NotificationPreferencesModule } from './notification-preferences/notification-preferences.module';
import { ReportsModule } from './reports/reports.module';
import { PermissionsModule } from './permissions/permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AssignmentsModule,
    ResultsModule,
    MessagingModule,
    AnnouncementsModule,
    AdminModule,
    AuditModule,
    FileStorageModule,
    CmsModule,
    TimetableModule,
    AttendanceModule,
    NotificationsModule,
    ReportCardsModule,
    EventsModule,
    FeesModule,
    EmailModule,
    AnalyticsModule,
    SearchModule,
    ConferencesModule,
    NotificationPreferencesModule,
    ReportsModule,
    PermissionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
