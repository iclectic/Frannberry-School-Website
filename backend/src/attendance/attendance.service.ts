import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { pupilName } from '../common/pupil-name';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async markAttendance(
    markedById: string,
    classId: string,
    date: string,
    records: { studentId: string; status: string; remark?: string }[],
  ) {
    const results = [];

    for (const record of records) {
      const upserted = await this.prisma.attendanceRecord.upsert({
        where: {
          studentId_classId_date: {
            studentId: record.studentId,
            classId,
            date: new Date(date),
          },
        },
        update: {
          status: record.status as any,
          remark: record.remark,
          markedById,
        },
        create: {
          studentId: record.studentId,
          classId,
          date: new Date(date),
          status: record.status as any,
          remark: record.remark,
          markedById,
        },
        include: {
          student: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      });
      results.push(upserted);

      // Notify parents if student is absent
      if (record.status === 'ABSENT') {
        const parentLinks = await this.prisma.parentStudent.findMany({
          where: { studentId: record.studentId },
          include: { parent: { select: { userId: true } } },
        });
        for (const link of parentLinks) {
          await this.notificationsService.create({
            userId: link.parent.userId,
            type: 'ATTENDANCE',
            title: 'Absence Notification',
            body: `${pupilName(upserted.student).firstName} ${pupilName(upserted.student).lastName} was marked absent on ${date}.`,
            link: '/portal/attendance',
          });
        }
      }
    }

    return results;
  }

  async getByClassAndDate(classId: string, date: string) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { classId, date: new Date(date) },
      include: {
        student: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { student: { user: { lastName: 'asc' } } },
    });

    // Also get all students in the class for unmarked ones
    const allStudents = await this.prisma.studentProfile.findMany({
      where: { classId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { user: { lastName: 'asc' } },
    });

    return { records, students: allStudents };
  }

  async getStudentAttendance(studentId: string, startDate?: string, endDate?: string) {
    const where: any = { studentId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const excused = records.filter((r) => r.status === 'EXCUSED').length;

    return {
      records,
      summary: { total, present, absent, late, excused, rate: total > 0 ? Math.round((present / total) * 100) : 0 },
    };
  }

  async getMyAttendance(userId: string, role: string, startDate?: string, endDate?: string) {
    if (role === 'STUDENT') {
      const student = await this.prisma.studentProfile.findUnique({ where: { userId } });
      if (!student) return { records: [], summary: { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0 } };
      return this.getStudentAttendance(student.id, startDate, endDate);
    }

    if (role === 'PARENT') {
      const parent = await this.prisma.parentProfile.findUnique({
        where: { userId },
        include: { childLinks: { select: { studentId: true } } },
      });
      if (!parent) return [];
      const results = [];
      for (const link of parent.childLinks) {
        const data = await this.getStudentAttendance(link.studentId, startDate, endDate);
        const student = await this.prisma.studentProfile.findUnique({
          where: { id: link.studentId },
          include: { user: { select: { firstName: true, lastName: true } } },
        });
        results.push({ student, ...data });
      }
      return results;
    }

    return [];
  }
}
