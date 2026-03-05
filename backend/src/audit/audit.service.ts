import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

interface AuditLogInput {
  userId: string;
  action: AuditAction | string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action as AuditAction,
        entity: input.entity,
        entityId: input.entityId,
        details: input.details,
        ipAddress: input.ipAddress,
      },
    });
  }

  async getLogsForUser(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: { userId } }),
    ]);
    return { logs, total, page, limit };
  }

  async getLogsForEntity(entity: string, entityId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entity, entityId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where: { entity, entityId } }),
    ]);
    return { logs, total, page, limit };
  }
}
