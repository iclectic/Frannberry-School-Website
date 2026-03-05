import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { CreateResultDto, UpdateResultDto } from './dto/result.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ResultsService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateResultDto) {
    const teacherProfileId = await this.users.getTeacherProfileId(userId);
    if (!teacherProfileId) throw new ForbiddenException('Teacher profile not found');

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
    });
    if (!student || !student.classId) throw new NotFoundException('Student not found');

    const ownsClass = await this.users.verifyTeacherOwnsClass(userId, student.classId, dto.subjectId);
    if (!ownsClass) throw new ForbiddenException('You are not assigned to this student\'s class/subject');

    const result = await this.prisma.result.create({
      data: {
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        termId: dto.termId,
        teacherId: teacherProfileId,
        assessmentType: dto.assessmentType,
        score: dto.score,
        maxScore: dto.maxScore ?? 100,
        comment: dto.comment,
      },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: true,
        term: true,
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Result',
      entityId: result.id,
      details: `Entered result: ${dto.score}/${dto.maxScore ?? 100} for ${dto.assessmentType}`,
    });

    return result;
  }

  async update(userId: string, resultId: string, dto: UpdateResultDto) {
    const existing = await this.prisma.result.findUnique({
      where: { id: resultId },
    });
    if (!existing) throw new NotFoundException('Result not found');

    const teacherProfileId = await this.users.getTeacherProfileId(userId);
    if (existing.teacherId !== teacherProfileId) {
      throw new ForbiddenException('You can only update your own results');
    }

    const updated = await this.prisma.result.update({
      where: { id: resultId },
      data: {
        ...(dto.score !== undefined && { score: dto.score }),
        ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
      },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: true,
        term: true,
      },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Result',
      entityId: resultId,
    });

    return updated;
  }

  async getForStudent(userId: string, studentProfileId: string, role: Role, termId?: string) {
    if (role === Role.STUDENT) {
      const isOwner = await this.users.verifyStudentIdentity(userId, studentProfileId);
      if (!isOwner) throw new ForbiddenException('Access denied');
    } else if (role === Role.PARENT) {
      const isParent = await this.users.verifyParentOwnsStudent(userId, studentProfileId);
      if (!isParent) throw new ForbiddenException('Access denied');
    }

    const where: any = { studentId: studentProfileId };
    if (termId) where.termId = termId;

    return this.prisma.result.findMany({
      where,
      include: {
        subject: true,
        term: { include: { session: true } },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ term: { startDate: 'desc' } }, { subject: { name: 'asc' } }],
    });
  }

  async getForClass(userId: string, classId: string, termId: string) {
    const ownsClass = await this.users.verifyTeacherOwnsClass(userId, classId);
    if (!ownsClass) throw new ForbiddenException('Not assigned to this class');

    const students = await this.prisma.studentProfile.findMany({
      where: { classId },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    return this.prisma.result.findMany({
      where: { studentId: { in: studentIds }, termId },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: true,
      },
      orderBy: [{ student: { user: { lastName: 'asc' } } }, { subject: { name: 'asc' } }],
    });
  }
}
