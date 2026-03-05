import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { CreateAssignmentDto, UpdateAssignmentDto, SubmitAssignmentDto, GradeSubmissionDto } from './dto/assignment.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AssignmentsService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private audit: AuditService,
  ) {}

  // ── Teacher creates assignment ──────────────────────────────────────────────
  async create(userId: string, dto: CreateAssignmentDto) {
    const teacherProfileId = await this.users.getTeacherProfileId(userId);
    if (!teacherProfileId) throw new ForbiddenException('Teacher profile not found');

    const ownsClass = await this.users.verifyTeacherOwnsClass(userId, dto.classId, dto.subjectId);
    if (!ownsClass) throw new ForbiddenException('You are not assigned to this class/subject');

    const assignment = await this.prisma.assignment.create({
      data: {
        title: dto.title,
        description: dto.description,
        teacherId: teacherProfileId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        termId: dto.termId,
        dueDate: new Date(dto.dueDate),
        maxScore: dto.maxScore ?? 100,
        status: dto.status ?? 'DRAFT',
      },
      include: { class: true, subject: true, term: true },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Assignment',
      entityId: assignment.id,
      details: `Created assignment: ${assignment.title}`,
    });

    return assignment;
  }

  // ── Teacher updates assignment ──────────────────────────────────────────────
  async update(userId: string, assignmentId: string, dto: UpdateAssignmentDto) {
    const existing = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { teacher: true },
    });
    if (!existing) throw new NotFoundException('Assignment not found');

    const teacherProfileId = await this.users.getTeacherProfileId(userId);
    if (existing.teacherId !== teacherProfileId) {
      throw new ForbiddenException('You can only update your own assignments');
    }

    const updated = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
        ...(dto.status && { status: dto.status }),
      },
      include: { class: true, subject: true, term: true },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Assignment',
      entityId: assignmentId,
    });

    return updated;
  }

  // ── Student submits work ────────────────────────────────────────────────────
  async submitWork(userId: string, assignmentId: string, dto: SubmitAssignmentDto) {
    const studentProfileId = await this.users.getStudentProfileId(userId);
    if (!studentProfileId) throw new ForbiddenException('Student profile not found');

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.status !== 'PUBLISHED') {
      throw new BadRequestException('This assignment is not accepting submissions');
    }

    const isLate = new Date() > assignment.dueDate;

    const submission = await this.prisma.submission.upsert({
      where: {
        assignmentId_studentId: { assignmentId, studentId: studentProfileId },
      },
      create: {
        assignmentId,
        studentId: studentProfileId,
        content: dto.content,
        status: isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: new Date(),
      },
      update: {
        content: dto.content,
        status: isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: { assignment: { include: { subject: true } } },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Submission',
      entityId: submission.id,
      details: `Submitted work for: ${assignment.title}`,
    });

    return submission;
  }

  // ── Teacher grades submission ───────────────────────────────────────────────
  async gradeSubmission(userId: string, submissionId: string, dto: GradeSubmissionDto) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const teacherProfileId = await this.users.getTeacherProfileId(userId);
    if (submission.assignment.teacherId !== teacherProfileId) {
      throw new ForbiddenException('You can only grade submissions for your assignments');
    }

    const graded = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        status: 'GRADED',
        gradedAt: new Date(),
      },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        assignment: { include: { subject: true } },
      },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Submission',
      entityId: submissionId,
      details: `Graded submission: score ${dto.score}`,
    });

    return graded;
  }

  // ── Get assignments for a class (teacher view) ──────────────────────────────
  async getForClass(userId: string, classId: string, role: Role) {
    if (role === Role.TEACHER) {
      const ownsClass = await this.users.verifyTeacherOwnsClass(userId, classId);
      if (!ownsClass) throw new ForbiddenException('Not assigned to this class');
    }

    return this.prisma.assignment.findMany({
      where: { classId },
      include: {
        subject: true,
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Get assignments for a student ───────────────────────────────────────────
  async getForStudent(userId: string, studentProfileId: string, role: Role) {
    if (role === Role.STUDENT) {
      const isOwner = await this.users.verifyStudentIdentity(userId, studentProfileId);
      if (!isOwner) throw new ForbiddenException('Access denied');
    } else if (role === Role.PARENT) {
      const isParent = await this.users.verifyParentOwnsStudent(userId, studentProfileId);
      if (!isParent) throw new ForbiddenException('Access denied');
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });
    if (!student || !student.classId) throw new NotFoundException('Student or class not found');

    return this.prisma.assignment.findMany({
      where: { classId: student.classId, status: 'PUBLISHED' },
      include: {
        subject: true,
        submissions: {
          where: { studentId: studentProfileId },
        },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { dueDate: 'desc' },
    });
  }

  // ── Get single assignment with submissions (teacher) ────────────────────────
  async getOneWithSubmissions(userId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        subject: true,
        class: true,
        term: true,
        submissions: {
          include: {
            student: { include: { user: { select: { firstName: true, lastName: true } } } },
            attachments: true,
          },
        },
        attachments: true,
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const teacherProfileId = await this.users.getTeacherProfileId(userId);
    if (assignment.teacherId !== teacherProfileId) {
      throw new ForbiddenException('Access denied');
    }

    return assignment;
  }
}
