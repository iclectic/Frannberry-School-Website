import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { KeyStage, Role } from '@prisma/client';
import { keyStageFitsSchool, placementError, pupilCanLogin } from '../school/phase-rules';
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
          firstName: data.firstName,
          lastName: data.lastName,
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

  async createClass(
    adminId: string,
    data: { name: string; year: number; section?: string; capacity?: number; schoolId: string; keyStage: KeyStage },
  ) {
    if (!data.schoolId || !data.keyStage) {
      throw new BadRequestException('A class needs a school and a key stage');
    }
    const school = await this.prisma.school.findUnique({ where: { id: data.schoolId } });
    if (!school) throw new NotFoundException('School not found');
    const error = placementError(school.phase, data.keyStage);
    if (error) {
      throw new BadRequestException(
        `${error} ${school.phase === 'PRIMARY' ? 'Reception stays in Primary and is still EYFS.' : ''}`.trim(),
      );
    }

    const cls = await this.prisma.class.create({
      data: {
        name: data.name,
        year: data.year,
        section: data.section,
        capacity: data.capacity,
        schoolId: data.schoolId,
        keyStage: data.keyStage,
      },
    });

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
      include: {
        school: { select: { id: true, name: true, phase: true } },
        _count: { select: { students: true, classSubjects: true } },
      },
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

    const schoolClass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { school: true },
    });
    if (!schoolClass) throw new NotFoundException('Class not found');
    if (!pupilCanLogin(schoolClass.school.phase) && student.userId) {
      throw new BadRequestException(
        'Nursery children have a pupil record and cannot log in. Do not place a login account in a Nursery class.',
      );
    }
    if (!keyStageFitsSchool(schoolClass.school.phase, schoolClass.keyStage)) {
      throw new BadRequestException(placementError(schoolClass.school.phase, schoolClass.keyStage) ?? 'Invalid class placement');
    }

    const updated = await this.prisma.studentProfile.update({
      where: { id: student.id },
      data: { classId, schoolId: schoolClass.schoolId },
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

  // ── Bulk CSV Import ──────────────────────────────────────────────────────

  async bulkImportCsv(adminId: string, csvText: string) {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return { created: 0, skipped: 0, errors: ['CSV must have a header row and at least one data row.'] };
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
    const emailIdx = header.indexOf('email');
    const firstNameIdx = header.indexOf('firstname');
    const lastNameIdx = header.indexOf('lastname');
    const roleIdx = header.indexOf('role');
    const passwordIdx = header.indexOf('password');

    if (emailIdx === -1 || firstNameIdx === -1 || lastNameIdx === -1 || roleIdx === -1) {
      return { created: 0, skipped: 0, errors: ['CSV header must include: email, firstname, lastname, role (optionally password).'] };
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    const validRoles = ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'STAFF', 'HEAD'];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const email = cols[emailIdx];
      const firstName = cols[firstNameIdx];
      const lastName = cols[lastNameIdx];
      const roleStr = cols[roleIdx]?.toUpperCase();
      const password = passwordIdx !== -1 && cols[passwordIdx] ? cols[passwordIdx] : 'Welcome123!';

      if (!email || !firstName || !lastName || !roleStr) {
        results.errors.push(`Row ${i + 1}: missing required fields.`);
        results.skipped++;
        continue;
      }

      if (!validRoles.includes(roleStr)) {
        results.errors.push(`Row ${i + 1}: invalid role "${roleStr}".`);
        results.skipped++;
        continue;
      }

      try {
        await this.createUser(adminId, {
          email,
          password,
          firstName,
          lastName,
          role: roleStr as Role,
        });
        results.created++;
      } catch (err: any) {
        results.errors.push(`Row ${i + 1} (${email}): ${err.message || 'Unknown error'}`);
        results.skipped++;
      }
    }

    await this.audit.log({
      userId: adminId,
      action: 'CREATE',
      entity: 'BulkImport',
      details: `CSV import: ${results.created} created, ${results.skipped} skipped`,
    });

    return results;
  }

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
