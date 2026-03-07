import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(createdById: string, data: {
    title: string;
    description?: string;
    type?: string;
    startDate: string;
    endDate: string;
    allDay?: boolean;
    location?: string;
    isPublic?: boolean;
  }) {
    return this.prisma.schoolEvent.create({
      data: {
        title: data.title,
        description: data.description,
        type: (data.type as any) || 'OTHER',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        allDay: data.allDay ?? true,
        location: data.location,
        isPublic: data.isPublic ?? true,
        createdById,
      },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
  }

  async update(id: string, data: any) {
    const event = await this.prisma.schoolEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    return this.prisma.schoolEvent.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type && { type: data.type as any }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.allDay !== undefined && { allDay: data.allDay }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
  }

  async remove(id: string) {
    const event = await this.prisma.schoolEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.schoolEvent.delete({ where: { id } });
  }

  async findAll(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate);
      if (endDate) where.startDate.lte = new Date(endDate);
    }

    return this.prisma.schoolEvent.findMany({
      where,
      include: { createdBy: { select: { firstName: true, lastName: true } } },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.schoolEvent.findUnique({
      where: { id },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async getIcalFeed() {
    const events = await this.prisma.schoolEvent.findMany({
      where: { isPublic: true },
      orderBy: { startDate: 'asc' },
    });

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Frannberry School//Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Frannberry School Events',
    ];

    for (const e of events) {
      const dtStart = e.allDay
        ? `;VALUE=DATE:${formatDateOnly(e.startDate)}`
        : `:${formatDateTime(e.startDate)}`;
      const dtEnd = e.allDay
        ? `;VALUE=DATE:${formatDateOnly(e.endDate)}`
        : `:${formatDateTime(e.endDate)}`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${e.id}@frannberry.school`);
      lines.push(`DTSTART${dtStart}`);
      lines.push(`DTEND${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcal(e.title)}`);
      if (e.description) lines.push(`DESCRIPTION:${escapeIcal(e.description)}`);
      if (e.location) lines.push(`LOCATION:${escapeIcal(e.location)}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}

function formatDateOnly(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('T')[0];
}

function formatDateTime(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

function escapeIcal(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
