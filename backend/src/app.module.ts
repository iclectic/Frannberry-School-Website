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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
