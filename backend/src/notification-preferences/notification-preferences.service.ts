import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationPreferencesService {
  constructor(private prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({ data: { userId } });
    }
    return prefs;
  }

  async update(userId: string, data: Partial<{
    emailAnnouncements: boolean;
    emailMessages: boolean;
    emailAssignments: boolean;
    emailResults: boolean;
    emailEvents: boolean;
    emailFees: boolean;
    pushEnabled: boolean;
    digestEnabled: boolean;
    digestFrequency: string;
  }>) {
    // Upsert: create if not exists
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async shouldEmail(userId: string, category: string): Promise<boolean> {
    const prefs = await this.getOrCreate(userId);
    const map: Record<string, boolean> = {
      ANNOUNCEMENT: prefs.emailAnnouncements,
      MESSAGE: prefs.emailMessages,
      ASSIGNMENT: prefs.emailAssignments,
      RESULT: prefs.emailResults,
      EVENT: prefs.emailEvents,
      FEE: prefs.emailFees,
    };
    return map[category] ?? true;
  }
}
