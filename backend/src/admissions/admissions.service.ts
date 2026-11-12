import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdmissionStatus, KeyStage, Prisma, Role, SchoolPhase } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { phaseRule, pupilCanLogin } from '../school/phase-rules';
import { ageOn, applicationError, loginForPlace, parseDateOfBirth, reviewScope } from './place';
import { CreateApplicationDto, EnrolApplicationDto } from './dto';

const SALT_ROUNDS = 12;

const applicationInclude = {
  school: { select: { id: true, phase: true, name: true } },
  student: { select: { id: true, admissionNo: true, userId: true } },
} satisfies Prisma.AdmissionApplicationInclude;

type ApplicationRow = Prisma.AdmissionApplicationGetPayload<{ include: typeof applicationInclude }>;

@Injectable()
export class AdmissionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async submit(data: CreateApplicationDto) {
    if (!data.childFirstName.trim() || !data.childLastName.trim() || !data.parentFirstName.trim() || !data.parentLastName.trim()) {
      throw new BadRequestException('Enter the child’s name and the parent’s name.');
    }
    const dateOfBirth = parseDateOfBirth(data.dateOfBirth);
    if (!dateOfBirth) throw new BadRequestException('Enter a date of birth.');
    const error = applicationError(data.phase, data.keyStage, dateOfBirth, todayUtc());
    if (error) throw new BadRequestException(error);

    const school = await this.prisma.school.findUnique({ where: { phase: data.phase as SchoolPhase } });
    if (!school) throw new NotFoundException('School not found');

    const application = await this.prisma.admissionApplication.create({
      data: {
        reference: await this.uniqueReference(),
        schoolId: school.id,
        childFirstName: data.childFirstName.trim(),
        childLastName: data.childLastName.trim(),
        dateOfBirth,
        keyStage: data.keyStage as KeyStage,
        parentFirstName: data.parentFirstName.trim(),
        parentLastName: data.parentLastName.trim(),
        parentEmail: data.parentEmail.trim().toLowerCase(),
        parentPhone: data.parentPhone?.trim() || null,
      },
      include: applicationInclude,
    });

    return this.present(application);
  }

  async list(userId: string, role: string) {
    const scope = await this.scopeFor(userId, role);
    const applications = await this.prisma.admissionApplication.findMany({
      where: scope.all ? {} : { schoolId: scope.schoolId ?? undefined },
      include: applicationInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { applications: applications.map((application) => this.present(application)) };
  }

  async enrol(userId: string, role: string, id: string, data: EnrolApplicationDto) {
    const application = await this.load(userId, role, id);
    if (application.status !== AdmissionStatus.RECEIVED) {
      throw new BadRequestException(
        application.status === AdmissionStatus.ENROLLED
          ? 'This application already has a pupil record.'
          : 'This application was declined.',
      );
    }

    const decision = loginForPlace(application.school.phase, Boolean(data.createLogin));
    if (decision.error) throw new BadRequestException(decision.error);
    const loginEmail = data.loginEmail?.trim().toLowerCase() ?? '';
    if (decision.createLogin && !loginEmail) {
      throw new BadRequestException('A Primary or Secondary login needs an email address.');
    }

    if (data.classId) {
      const schoolClass = await this.prisma.class.findUnique({ where: { id: data.classId } });
      if (!schoolClass || schoolClass.schoolId !== application.schoolId) {
        throw new BadRequestException('This class is outside the school on the application.');
      }
      if (schoolClass.keyStage !== application.keyStage) {
        throw new BadRequestException(`This class is ${schoolClass.keyStage}. The application is for ${application.keyStage}.`);
      }
    }

    const enrolled = await this.prisma.$transaction(async (tx) => {
      let pupilUserId: string | null = null;
      let temporaryPassword: string | null = null;
      if (decision.createLogin) {
        const existing = await tx.user.findUnique({ where: { email: loginEmail } });
        if (existing) throw new ConflictException('That login email is already in use.');
        temporaryPassword = `Place-${randomBytes(4).toString('hex')}`;
        const user = await tx.user.create({
          data: {
            email: loginEmail,
            passwordHash: await bcrypt.hash(temporaryPassword, SALT_ROUNDS),
            firstName: application.childFirstName,
            lastName: application.childLastName,
            role: Role.STUDENT,
          },
        });
        pupilUserId = user.id;
      }

      const student = await tx.studentProfile.create({
        data: {
          userId: pupilUserId,
          firstName: application.childFirstName,
          lastName: application.childLastName,
          admissionNo: await this.nextAdmissionNo(tx, application.school.phase),
          dateOfBirth: application.dateOfBirth,
          schoolId: application.schoolId,
          classId: data.classId ?? null,
        },
      });

      const parent = await tx.user.findUnique({
        where: { email: application.parentEmail },
        include: { parentProfile: true },
      });
      if (parent?.role === Role.PARENT && parent.parentProfile) {
        await tx.parentStudent.create({
          data: { parentId: parent.parentProfile.id, studentId: student.id, relation: 'Parent' },
        });
      }

      const updated = await tx.admissionApplication.update({
        where: { id: application.id },
        data: {
          status: AdmissionStatus.ENROLLED,
          studentId: student.id,
          decidedById: userId,
          decidedAt: new Date(),
        },
        include: applicationInclude,
      });
      return { updated, temporaryPassword };
    });

    const rule = phaseRule(application.school.phase);
    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'AdmissionApplication',
      entityId: application.id,
      details: decision.createLogin
        ? `Enrolled ${application.childFirstName} ${application.childLastName} into ${rule?.name ?? application.school.phase} with a login.`
        : `Enrolled ${application.childFirstName} ${application.childLastName} into ${rule?.name ?? application.school.phase} with a pupil record and no login.`,
    });

    return {
      application: this.present(enrolled.updated),
      pupil: {
        id: enrolled.updated.student?.id,
        admissionNo: enrolled.updated.student?.admissionNo,
        schoolName: rule?.name ?? application.school.name,
        keyStage: application.keyStage,
        canLogin: Boolean(enrolled.updated.student?.userId),
      },
      login: enrolled.temporaryPassword ? { email: loginEmail, temporaryPassword: enrolled.temporaryPassword } : null,
    };
  }

  async decline(userId: string, role: string, id: string) {
    const application = await this.load(userId, role, id);
    if (application.status !== AdmissionStatus.RECEIVED) {
      throw new BadRequestException('Only a received application can be declined.');
    }
    const updated = await this.prisma.admissionApplication.update({
      where: { id: application.id },
      data: { status: AdmissionStatus.DECLINED, decidedById: userId, decidedAt: new Date() },
      include: applicationInclude,
    });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'AdmissionApplication',
      entityId: application.id,
      details: `Declined the application for ${application.childFirstName} ${application.childLastName}.`,
    });
    return this.present(updated);
  }

  private async scopeFor(userId: string, role: string) {
    const head = role === Role.HEAD
      ? await this.prisma.headProfile.findUnique({ where: { userId } })
      : null;
    const scope = reviewScope(role, head?.schoolId ?? null);
    if ('error' in scope) throw new ForbiddenException(scope.error);
    return scope;
  }

  private async load(userId: string, role: string, id: string) {
    const scope = await this.scopeFor(userId, role);
    const application = await this.prisma.admissionApplication.findFirst({
      where: { id, ...(scope.all ? {} : { schoolId: scope.schoolId ?? undefined }) },
      include: applicationInclude,
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  private present(application: ApplicationRow) {
    const rule = phaseRule(application.school.phase);
    return {
      id: application.id,
      reference: application.reference,
      status: application.status,
      phase: application.school.phase,
      schoolName: rule?.name ?? application.school.name,
      keyStage: application.keyStage,
      childFirstName: application.childFirstName,
      childLastName: application.childLastName,
      dateOfBirth: application.dateOfBirth.toISOString().slice(0, 10),
      age: ageOn(application.dateOfBirth, todayUtc()),
      parentFirstName: application.parentFirstName,
      parentLastName: application.parentLastName,
      parentEmail: application.parentEmail,
      parentPhone: application.parentPhone,
      canHaveLogin: pupilCanLogin(application.school.phase),
      hasLogin: Boolean(application.student?.userId),
      admissionNo: application.student?.admissionNo ?? null,
      studentId: application.student?.id ?? null,
      createdAt: application.createdAt,
    };
  }

  private async uniqueReference() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reference = `APP-${randomBytes(4).toString('hex').toUpperCase()}`;
      const existing = await this.prisma.admissionApplication.findUnique({ where: { reference } });
      if (!existing) return reference;
    }
    throw new ConflictException('Could not allocate an application reference.');
  }

  private async nextAdmissionNo(tx: Prisma.TransactionClient, phase: string) {
    const prefix = phase === 'NURSERY' ? 'N' : phase === 'PRIMARY' ? 'P' : 'S';
    const year = new Date().getUTCFullYear();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const admissionNo = `${prefix}-${year}-${randomBytes(3).toString('hex').toUpperCase()}`;
      const existing = await tx.studentProfile.findUnique({ where: { admissionNo } });
      if (!existing) return admissionNo;
    }
    throw new ConflictException('Could not allocate an admission number.');
  }
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
