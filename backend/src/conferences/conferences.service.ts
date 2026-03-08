import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '@prisma/client';

@Injectable()
export class ConferencesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  // ── Teacher creates available slots ───────────────────────────────────────

  async createSlots(
    userId: string,
    data: { date: string; slots: { startTime: string; endTime: string }[]; location?: string; meetingUrl?: string },
  ) {
    const teacher = await this.prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');

    const created = await this.prisma.conferenceSlot.createMany({
      data: data.slots.map((s) => ({
        teacherId: teacher.id,
        date: new Date(data.date),
        startTime: s.startTime,
        endTime: s.endTime,
        location: data.location,
        meetingUrl: data.meetingUrl,
      })),
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'ConferenceSlot',
      details: `Created ${created.count} conference slots for ${data.date}`,
    });

    return { created: created.count };
  }

  // ── Get available slots for a teacher ─────────────────────────────────────

  async getAvailableSlots(teacherId?: string, fromDate?: string) {
    const where: any = { status: 'AVAILABLE' };
    if (teacherId) where.teacherId = teacherId;
    if (fromDate) where.date = { gte: new Date(fromDate) };
    else where.date = { gte: new Date() };

    return this.prisma.conferenceSlot.findMany({
      where,
      include: {
        teacher: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  // ── Parent books a slot ───────────────────────────────────────────────────

  async bookSlot(
    userId: string,
    slotId: string,
    data: { studentId: string; notes?: string },
  ) {
    const parent = await this.prisma.parentProfile.findUnique({ where: { userId } });
    if (!parent) throw new ForbiddenException('Parent profile not found');

    const slot = await this.prisma.conferenceSlot.findUnique({
      where: { id: slotId },
      include: { teacher: { include: { user: true } } },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.status !== 'AVAILABLE') throw new BadRequestException('Slot is no longer available');

    const booked = await this.prisma.conferenceSlot.update({
      where: { id: slotId },
      data: {
        parentId: parent.id,
        studentId: data.studentId,
        notes: data.notes,
        status: 'BOOKED',
      },
      include: {
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        parent: { include: { user: { select: { firstName: true, lastName: true } } } },
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });

    // Notify the teacher
    await this.notifications.create({
      userId: slot.teacher.userId,
      type: 'GENERAL',
      title: 'Conference Booked',
      body: `A parent has booked your ${slot.startTime}-${slot.endTime} slot on ${slot.date.toISOString().split('T')[0]}.`,
      link: '/portal/conferences',
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'ConferenceSlot',
      entityId: slotId,
      details: 'Parent booked conference slot',
    });

    return booked;
  }

  // ── Cancel a booking ──────────────────────────────────────────────────────

  async cancelSlot(userId: string, slotId: string, role: Role) {
    const slot = await this.prisma.conferenceSlot.findUnique({
      where: { id: slotId },
      include: { teacher: true, parent: true },
    });
    if (!slot) throw new NotFoundException('Slot not found');

    // Teachers can cancel their own slots, parents can cancel their bookings, admins can cancel any
    if (role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findUnique({ where: { userId } });
      if (slot.teacherId !== teacher?.id) throw new ForbiddenException('Not your slot');
    } else if (role === Role.PARENT) {
      const parent = await this.prisma.parentProfile.findUnique({ where: { userId } });
      if (slot.parentId !== parent?.id) throw new ForbiddenException('Not your booking');
    } else if (role !== Role.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.prisma.conferenceSlot.update({
      where: { id: slotId },
      data: { status: 'CANCELLED' },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'ConferenceSlot',
      entityId: slotId,
      details: 'Conference slot cancelled',
    });

    return updated;
  }

  // ── Get my conferences ────────────────────────────────────────────────────

  async getMyConferences(userId: string, role: Role) {
    if (role === Role.TEACHER) {
      const teacher = await this.prisma.teacherProfile.findUnique({ where: { userId } });
      if (!teacher) return [];
      return this.prisma.conferenceSlot.findMany({
        where: { teacherId: teacher.id },
        include: {
          parent: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          student: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
      });
    }

    if (role === Role.PARENT) {
      const parent = await this.prisma.parentProfile.findUnique({ where: { userId } });
      if (!parent) return [];
      return this.prisma.conferenceSlot.findMany({
        where: { parentId: parent.id },
        include: {
          teacher: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          student: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
      });
    }

    // Admin sees all booked
    return this.prisma.conferenceSlot.findMany({
      where: { status: 'BOOKED' },
      include: {
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        parent: { include: { user: { select: { firstName: true, lastName: true } } } },
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
    });
  }
}
