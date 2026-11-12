import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { pupilName } from '../common/pupil-name';
import { TeachingScopeService } from '../teaching/teaching-scope.service';
import { matchesPlacement, recordsForPlacement } from '../teaching/scope';
import { phaseRule } from '../school/phase-rules';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private teachingScope: TeachingScopeService,
  ) {}

  async classesFor(userId: string, role: string) {
    if (role === 'ADMIN') {
      const classes = await this.prisma.class.findMany({
        include: { school: { select: { phase: true, name: true } } },
        orderBy: [{ year: 'asc' }, { name: 'asc' }],
      });
      return classes.map((schoolClass) => this.describeClass(schoolClass));
    }
    const scope = await this.teachingScope.forUser(userId, role);
    const ids = scope.placements.map((placement) => placement.classId).filter((id): id is string => !!id);
    if (!ids.length) return [];
    const classes = await this.prisma.class.findMany({
      where: { id: { in: ids } },
      include: { school: { select: { phase: true, name: true } } },
      orderBy: [{ year: 'asc' }, { name: 'asc' }],
    });
    return classes.map((schoolClass) => this.describeClass(schoolClass));
  }

  async markAttendance(
    markedById: string,
    role: string,
    classId: string,
    date: string,
    records: { studentId: string; status: string; remark?: string }[],
  ) {
    await this.assertCanUseClass(markedById, role, classId);
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

  async getByClassAndDate(userId: string, role: string, classId: string, date: string) {
    await this.assertCanUseClass(userId, role, classId);
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

    return {
      records,
      students: allStudents.map((student) => {
        const name = pupilName(student);
        return { ...student, firstName: name.firstName, lastName: name.lastName };
      }),
    };
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
      include: { class: { select: { id: true, schoolId: true, keyStage: true, name: true } } },
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
    const scope = await this.teachingScope.forUser(userId, role);
    const placements = scope.placements.filter((placement) => placement.pupilId);
    const groups = [];
    for (const placement of placements) {
      const data = await this.getStudentAttendance(placement.pupilId as string, startDate, endDate);
      const records = recordsForPlacement(
        data.records.map((record) => ({
          ...record,
          schoolId: record.class?.schoolId ?? null,
          keyStage: record.class?.keyStage ?? null,
          classId: record.classId,
        })),
        placement,
        'class',
      );
      groups.push({
        pupilId: placement.pupilId,
        pupilName: placement.pupilName,
        schoolName: placement.schoolName,
        phase: placement.phase,
        keyStage: placement.keyStage,
        className: placement.className,
        records,
        summary: summarise(records),
      });
    }
    return { groups };
  }

  private async assertCanUseClass(userId: string, role: string, classId: string) {
    if (role === 'ADMIN') return;
    const scope = await this.teachingScope.forUser(userId, role);
    const schoolClass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!schoolClass) throw new NotFoundException('Class not found');
    const allowed = scope.placements.some((placement) =>
      matchesPlacement(
        { schoolId: schoolClass.schoolId, keyStage: schoolClass.keyStage, classId: schoolClass.id },
        placement,
        'class',
      ),
    );
    if (!allowed) throw new ForbiddenException('This class is outside your school');
  }

  private describeClass(schoolClass: { id: string; name: string; section: string | null; keyStage: string; school: { phase: string; name: string } }) {
    const rule = phaseRule(schoolClass.school.phase);
    return {
      id: schoolClass.id,
      name: schoolClass.name,
      section: schoolClass.section,
      keyStage: schoolClass.keyStage,
      schoolName: rule?.name ?? schoolClass.school.name,
    };
  }
}

function summarise(records: { status: string }[]) {
  const total = records.length;
  const present = records.filter((record) => record.status === 'PRESENT').length;
  const absent = records.filter((record) => record.status === 'ABSENT').length;
  const late = records.filter((record) => record.status === 'LATE').length;
  const excused = records.filter((record) => record.status === 'EXCUSED').length;
  return { total, present, absent, late, excused, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
}
