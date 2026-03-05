import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 12;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── User Management ─────────────────────────────────────────────────────────

  async getAllUsers(page = 1, limit = 50, role?: Role) {
    const skip = (page - 1) * limit;
    const where = role ? { role } : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, createdAt: true, mfaEnabled: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total, page, limit };
  }

  async createUser(
    adminId: string,
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: Role;
    },
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
    });

    // Create role-specific profile
    if (data.role === Role.TEACHER) {
      await this.prisma.teacherProfile.create({
        data: {
          userId: user.id,
          employeeId: `TCH-${uuidv4().slice(0, 8).toUpperCase()}`,
        },
      });
    } else if (data.role === Role.STUDENT) {
      await this.prisma.studentProfile.create({
        data: {
          userId: user.id,
          admissionNo: `STU-${uuidv4().slice(0, 8).toUpperCase()}`,
        },
      });
    } else if (data.role === Role.PARENT) {
      await this.prisma.parentProfile.create({
        data: { userId: user.id },
      });
    } else if (data.role === Role.STAFF) {
      await this.prisma.staffProfile.create({
        data: {
          userId: user.id,
          employeeId: `STF-${uuidv4().slice(0, 8).toUpperCase()}`,
        },
      });
    }

    await this.audit.log({
      userId: adminId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      details: `Created ${data.role} user: ${data.email}`,
    });

    return { id: user.id, email: user.email, role: user.role };
  }

  async toggleUserActive(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    await this.audit.log({
      userId: adminId,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      details: `Set active=${updated.isActive}`,
    });

    return { id: updated.id, isActive: updated.isActive };
  }

  // ── Parent-Student Linking ──────────────────────────────────────────────────

  async linkParentStudent(adminId: string, parentUserId: string, studentUserId: string, relation = 'Parent') {
    const parent = await this.prisma.parentProfile.findUnique({ where: { userId: parentUserId } });
    if (!parent) throw new NotFoundException('Parent profile not found');

    const student = await this.prisma.studentProfile.findUnique({ where: { userId: studentUserId } });
    if (!student) throw new NotFoundException('Student profile not found');

    const link = await this.prisma.parentStudent.create({
      data: { parentId: parent.id, studentId: student.id, relation },
    });

    await this.audit.log({
      userId: adminId,
      action: 'CREATE',
      entity: 'ParentStudent',
      entityId: link.id,
      details: `Linked parent ${parentUserId} to student ${studentUserId}`,
    });

    return link;
  }

  // ── Class & Subject Management ──────────────────────────────────────────────

  async createClass(adminId: string, data: { name: string; year: number; section?: string; capacity?: number }) {
    const cls = await this.prisma.class.create({ data });

    await this.audit.log({
      userId: adminId,
      action: 'CREATE',
      entity: 'Class',
      entityId: cls.id,
    });

    return cls;
  }

  async getAllClasses() {
    return this.prisma.class.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: [{ year: 'asc' }, { name: 'asc' }],
    });
  }

  async createSubject(adminId: string, data: { name: string; code: string; description?: string }) {
    const subject = await this.prisma.subject.create({ data });

    await this.audit.log({
      userId: adminId,
      action: 'CREATE',
      entity: 'Subject',
      entityId: subject.id,
    });

    return subject;
  }

  async getAllSubjects() {
    return this.prisma.subject.findMany({ orderBy: { name: 'asc' } });
  }

  async assignTeacherToClass(adminId: string, teacherUserId: string, classId: string, subjectId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({ where: { userId: teacherUserId } });
    if (!teacher) throw new NotFoundException('Teacher profile not found');

    const assignment = await this.prisma.classSubjectTeacher.create({
      data: { classId, subjectId, teacherId: teacher.id },
    });

    await this.audit.log({
      userId: adminId,
      action: 'CREATE',
      entity: 'ClassSubjectTeacher',
      entityId: assignment.id,
    });

    return assignment;
  }

  async assignStudentToClass(adminId: string, studentUserId: string, classId: string) {
    const student = await this.prisma.studentProfile.findUnique({ where: { userId: studentUserId } });
    if (!student) throw new NotFoundException('Student profile not found');

    const updated = await this.prisma.studentProfile.update({
      where: { id: student.id },
      data: { classId },
    });

    await this.audit.log({
      userId: adminId,
      action: 'UPDATE',
      entity: 'StudentProfile',
      entityId: student.id,
      details: `Assigned to class ${classId}`,
    });

    return updated;
  }

  // ── Term & Session Management ───────────────────────────────────────────────

  async createSession(adminId: string, data: { name: string; startDate: string; endDate: string; isCurrent?: boolean }) {
    const session = await this.prisma.academicSession.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isCurrent: data.isCurrent ?? false,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'CREATE',
      entity: 'AcademicSession',
      entityId: session.id,
    });

    return session;
  }

  async createTerm(adminId: string, data: { name: string; sessionId: string; startDate: string; endDate: string; isCurrent?: boolean }) {
    const term = await this.prisma.term.create({
      data: {
        name: data.name,
        sessionId: data.sessionId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isCurrent: data.isCurrent ?? false,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'CREATE',
      entity: 'Term',
      entityId: term.id,
    });

    return term;
  }

  async getSessions() {
    return this.prisma.academicSession.findMany({
      include: { terms: true },
      orderBy: { startDate: 'desc' },
    });
  }

  // ── Grading Scales ─────────────────────────────────────────────────────────

  async createGradingScale(adminId: string, data: { name: string; minScore: number; maxScore: number; grade: string; remark?: string }) {
    return this.prisma.gradingScale.create({ data });
  }

  async getGradingScales() {
    return this.prisma.gradingScale.findMany({ orderBy: { minScore: 'asc' } });
  }

  // ── Invite Codes ────────────────────────────────────────────────────────────

  async createInvite(adminId: string, data: { email: string; role: Role }) {
    const code = uuidv4().slice(0, 12).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.invite.create({
      data: {
        email: data.email,
        role: data.role,
        code,
        invitedBy: adminId,
        expiresAt,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'INVITE_SENT',
      entity: 'Invite',
      entityId: invite.id,
      details: `Invite sent to ${data.email} for role ${data.role}`,
    });

    return invite;
  }
}
