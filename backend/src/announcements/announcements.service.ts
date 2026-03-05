import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, AnnouncementScope } from '@prisma/client';

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(
    userId: string,
    data: {
      title: string;
      content: string;
      scope: AnnouncementScope;
      classId?: string;
      publishAt?: string;
    },
  ) {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        scope: data.scope,
        classId: data.classId,
        authorId: userId,
        isPublished: !data.publishAt,
        publishAt: data.publishAt ? new Date(data.publishAt) : null,
      },
      include: { author: { select: { firstName: true, lastName: true } }, class: true },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Announcement',
      entityId: announcement.id,
    });

    return announcement;
  }

  async getAll(role: Role, userId: string, classId?: string) {
    const now = new Date();
    const where: any = {
      OR: [
        { isPublished: true },
        { publishAt: { lte: now } },
      ],
    };

    if (classId) {
      where.OR = [
        { scope: 'SCHOOL' },
        { scope: 'CLASS', classId },
      ];
    }

    return this.prisma.announcement.findMany({
      where,
      include: {
        author: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async update(
    userId: string,
    id: string,
    data: { title?: string; content?: string; isPublished?: boolean },
  ) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');

    const updated = await this.prisma.announcement.update({
      where: { id },
      data,
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Announcement',
      entityId: id,
    });

    return updated;
  }

  async delete(userId: string, id: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');

    await this.prisma.announcement.delete({ where: { id } });

    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Announcement',
      entityId: id,
    });

    return { message: 'Announcement deleted' };
  }
}
