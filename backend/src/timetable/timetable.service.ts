import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  async createSlot(data: {
    classId: string;
    subjectId: string;
    teacherId: string;
    day: string;
    startTime: string;
    endTime: string;
    room?: string;
  }) {
    return this.prisma.timetableSlot.create({
      data: {
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        day: data.day as any,
        startTime: data.startTime,
        endTime: data.endTime,
        room: data.room,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        class: { select: { id: true, name: true, section: true } },
      },
    });
  }

  async updateSlot(id: string, data: Partial<{
    subjectId: string;
    teacherId: string;
    day: string;
    startTime: string;
    endTime: string;
    room: string;
  }>) {
    const slot = await this.prisma.timetableSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Timetable slot not found');

    return this.prisma.timetableSlot.update({
      where: { id },
      data: {
        ...(data.subjectId && { subjectId: data.subjectId }),
        ...(data.teacherId && { teacherId: data.teacherId }),
        ...(data.day && { day: data.day as any }),
        ...(data.startTime && { startTime: data.startTime }),
        ...(data.endTime && { endTime: data.endTime }),
        ...(data.room !== undefined && { room: data.room }),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        class: { select: { id: true, name: true, section: true } },
      },
    });
  }

  async deleteSlot(id: string) {
    const slot = await this.prisma.timetableSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Timetable slot not found');
    return this.prisma.timetableSlot.delete({ where: { id } });
  }

  async getClassTimetable(classId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { classId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getTeacherTimetable(teacherId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { teacherId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true, section: true } },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getStudentTimetable(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { classId: true },
    });
    if (!student?.classId) return [];
    return this.getClassTimetable(student.classId);
  }
}
