import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pupilName } from '../common/pupil-name';
import { shapeTrustReport } from './trust-report';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ── Trust report for the office admin ─────────────────────────────────────

  async trustReport() {
    const schools = await this.prisma.school.findMany({
      include: {
        headProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        classes: {
          include: {
            _count: { select: { students: true } },
            classSubjects: { select: { teacherId: true } },
          },
          orderBy: [{ year: 'asc' }, { name: 'asc' }],
        },
        students: { select: { userId: true } },
        admissionApplications: { select: { status: true } },
      },
    });
    const attendance = await this.prisma.attendanceRecord.findMany({
      select: { status: true, class: { select: { schoolId: true } } },
    });
    const attendanceBySchool = new Map<string, { status: string }[]>();
    for (const record of attendance) {
      const schoolId = record.class.schoolId;
      const rows = attendanceBySchool.get(schoolId) ?? [];
      rows.push({ status: record.status });
      attendanceBySchool.set(schoolId, rows);
    }

    return shapeTrustReport(schools.map((school) => ({
      phase: school.phase,
      headteacher: school.headProfile
        ? `${school.headProfile.user.firstName} ${school.headProfile.user.lastName}`
        : null,
      teacherIds: school.classes.flatMap((schoolClass) => schoolClass.classSubjects.map((assignment) => assignment.teacherId)),
      pupils: school.students,
      classes: school.classes.map((schoolClass) => ({
        name: schoolClass.name,
        section: schoolClass.section,
        keyStage: schoolClass.keyStage,
        pupilCount: schoolClass._count.students,
      })),
      attendance: attendanceBySchool.get(school.id) ?? [],
      admissions: school.admissionApplications,
    })));
  }

  // ── Enrollment Report ─────────────────────────────────────────────────────

  async enrollmentReport() {
    const [totalStudents, totalTeachers, totalParents, totalStaff] = await Promise.all([
      this.prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
      this.prisma.user.count({ where: { role: 'TEACHER', isActive: true } }),
      this.prisma.user.count({ where: { role: 'PARENT', isActive: true } }),
      this.prisma.user.count({ where: { role: 'STAFF', isActive: true } }),
    ]);

    const classCounts = await this.prisma.class.findMany({
      select: { id: true, name: true, year: true, section: true, _count: { select: { students: true } } },
      orderBy: [{ year: 'asc' }, { name: 'asc' }],
    });

    return { totalStudents, totalTeachers, totalParents, totalStaff, classCounts };
  }

  // ── Attendance Report ─────────────────────────────────────────────────────

  async attendanceReport(classId?: string, from?: string, to?: string) {
    const where: any = {};
    if (classId) where.classId = classId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const records = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const total = records.reduce((s, r) => s + r._count.status, 0);
    const breakdown = records.map((r) => ({ status: r.status, count: r._count.status }));

    return { total, breakdown };
  }

  // ── Fee Collection Report ─────────────────────────────────────────────────

  async feeReport() {
    const invoices = await this.prisma.invoice.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { amount: true, amountPaid: true },
    });

    const totalRevenue = await this.prisma.payment.aggregate({ _sum: { amount: true } });

    return {
      invoiceBreakdown: invoices.map((i) => ({
        status: i.status,
        count: i._count.status,
        totalAmount: i._sum.amount,
        totalPaid: i._sum.amountPaid,
      })),
      totalRevenue: totalRevenue._sum.amount || 0,
    };
  }

  // ── Grade Distribution Report ─────────────────────────────────────────────

  async gradeReport(termId?: string, classId?: string) {
    const where: any = {};
    if (termId) where.termId = termId;
    if (classId) {
      where.student = { classId };
    }

    const results = await this.prisma.result.findMany({
      where,
      select: { score: true, maxScore: true, subject: { select: { name: true } } },
    });

    // Group by subject
    const bySubject: Record<string, { scores: number[]; maxScore: number }> = {};
    for (const r of results) {
      if (!bySubject[r.subject.name]) bySubject[r.subject.name] = { scores: [], maxScore: r.maxScore };
      bySubject[r.subject.name].scores.push(r.score);
    }

    const subjectAverages = Object.entries(bySubject).map(([subject, data]) => ({
      subject,
      average: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      highest: Math.max(...data.scores),
      lowest: Math.min(...data.scores),
      count: data.scores.length,
      maxScore: data.maxScore,
    }));

    return { subjectAverages, totalResults: results.length };
  }

  // ── CSV Export helper ─────────────────────────────────────────────────────

  async exportUsersCsv(role?: string) {
    const where: any = {};
    if (role) where.role = role;

    const users = await this.prisma.user.findMany({
      where,
      select: {
        email: true, firstName: true, lastName: true, role: true,
        isActive: true, createdAt: true, phone: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Email,First Name,Last Name,Role,Active,Phone,Created At';
    const rows = users.map((u) =>
      `${u.email},${u.firstName},${u.lastName},${u.role},${u.isActive},${u.phone || ''},${u.createdAt.toISOString()}`,
    );

    return [header, ...rows].join('\n');
  }

  async exportAttendanceCsv(classId?: string, from?: string, to?: string) {
    const where: any = {};
    if (classId) where.classId = classId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        class: { select: { name: true } },
      },
      orderBy: [{ date: 'desc' }],
    });

    const header = 'Date,Student Name,Email,Class,Status,Remark';
    const rows = records.map((r) =>
      `${r.date.toISOString().split('T')[0]},${pupilName(r.student).firstName} ${pupilName(r.student).lastName},${pupilName(r.student).email},${r.class.name},${r.status},${r.remark || ''}`,
    );

    return [header, ...rows].join('\n');
  }
}
