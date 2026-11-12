import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, AnnouncementScope } from '@prisma/client';
import { TeachingScopeService } from '../teaching/teaching-scope.service';
import { groupByPlacement, ScopedRecord, trustWideItems } from '../teaching/scope';
import { phaseRule } from '../school/phase-rules';

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private teachingScope: TeachingScopeService,
  ) {}

  async create(
    userId: string,
    role: Role,
    data: {
      title: string;
      content: string;
      scope: AnnouncementScope;
      classId?: string;
      schoolId?: string;
      publishAt?: string;
    },
  ) {
    let schoolId = data.schoolId ?? null;
    if (role === Role.HEAD) {
      const head = await this.prisma.headProfile.findUnique({ where: { userId } });
      schoolId = head?.schoolId ?? schoolId;
    }
    if (data.classId) {
      const schoolClass = await this.prisma.class.findUnique({ where: { id: data.classId }, select: { schoolId: true } });
      schoolId = schoolClass?.schoolId ?? schoolId;
    }

    const announcement = await this.prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        scope: data.scope,
        classId: data.classId,
        schoolId,
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

  async getAll(role: Role, userId: string) {
    const now = new Date();
    const rows = await this.prisma.announcement.findMany({
      where: {
        OR: [
          { isPublished: true },
          { publishAt: { lte: now } },
        ],
      },
      include: {
        author: { select: { firstName: true, lastName: true } },
        school: { select: { id: true, name: true, phase: true } },
        class: { select: { id: true, name: true, keyStage: true, school: { select: { id: true, name: true, phase: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const shaped = rows.map((row) => {
      const school = row.class?.school ?? row.school;
      const rule = school ? phaseRule(school.phase) : undefined;
      const record: ScopedRecord = {
        schoolId: school?.id ?? null,
        keyStage: row.class?.keyStage ?? null,
        classId: row.scope === 'CLASS' ? row.classId : null,
      };
      return {
        ...record,
        id: row.id,
        title: row.title,
        content: row.content,
        scope: row.scope,
        createdAt: row.createdAt,
        author: row.author,
        schoolName: rule?.name ?? school?.name ?? null,
        keyStage: row.class?.keyStage ?? null,
        className: row.class?.name ?? null,
      };
    });

    const scope = await this.teachingScope.forUser(userId, role);
    if (scope.audience === 'all') {
      return { audience: 'all' as const, trust: [], groups: [], announcements: shaped };
    }

    const groups = groupByPlacement(shaped, scope.placements, 'stage').map((group) => ({
      pupilId: group.placement.pupilId,
      pupilName: group.placement.pupilName,
      schoolName: group.placement.schoolName,
      phase: group.placement.phase,
      keyStage: group.placement.keyStage,
      className: group.placement.className,
      announcements: group.items,
    }));
    const trust = trustWideItems(shaped);
    const seen = new Set<string>();
    const announcements = [...trust, ...groups.flatMap((group) => group.announcements)].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return { audience: 'scoped' as const, trust, groups, announcements };
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
