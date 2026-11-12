import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { shapeChildView, shapeHeadDashboard } from './dashboard';
import { PHASE_RULES, phaseRule, pupilCanLogin } from './phase-rules';

@Injectable()
export class SchoolService {
  constructor(private prisma: PrismaService) {}

  async listPhases() {
    const schools = await this.prisma.school.findMany({
      include: {
        headProfile: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return {
      trust: 'Frannberry',
      schools: PHASE_RULES.map((rule) => {
        const row = schools.find((school) => school.phase === rule.phase);
        return {
          phase: rule.phase,
          name: rule.name,
          ageMin: rule.ageMin,
          ageMax: rule.ageMax,
          keyStages: [...rule.keyStages],
          pupilsCanLogin: rule.pupilsCanLogin,
          note: rule.note,
          id: row?.id ?? null,
          headteacher: row?.headProfile
            ? {
                id: row.headProfile.user.id,
                firstName: row.headProfile.user.firstName,
                lastName: row.headProfile.user.lastName,
              }
            : null,
        };
      }),
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        headProfile: { include: { school: true } },
        teacherProfile: {
          include: {
            classSubjects: { include: { class: { include: { school: true } } } },
          },
        },
        studentProfile: { include: { school: true, class: { include: { school: true } } } },
        parentProfile: {
          include: {
            childLinks: {
              include: {
                student: { include: { school: true, class: { include: { school: true } }, user: { select: { id: true } } } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const schoolMap = new Map<string, { id: string; phase: string; name: string; ageMin: number; ageMax: number; relationship: string }>();
    const remember = (
      school: { id: string; phase: string; name: string; ageMin: number; ageMax: number } | null | undefined,
      relationship: string,
    ) => {
      if (!school || schoolMap.has(school.id)) return;
      schoolMap.set(school.id, { ...school, relationship });
    };

    if (user.role === 'ADMIN') {
      const all = await this.prisma.school.findMany();
      for (const school of all) remember(school, 'office');
    }
    if (user.headProfile) remember(user.headProfile.school, 'head');
    for (const assignment of user.teacherProfile?.classSubjects ?? []) {
      remember(assignment.class.school, 'teaches');
    }
    const pupilSchool = user.studentProfile?.school ?? user.studentProfile?.class?.school;
    if (pupilSchool) remember(pupilSchool, 'attends');

    const children = (user.parentProfile?.childLinks ?? []).map((link) => {
      const student = link.student;
      const school = student.school ?? student.class?.school ?? null;
      if (school) remember(school, 'parent');
      const phase = school?.phase ?? '';
      return {
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNo: student.admissionNo,
        hasLogin: !!student.userId,
        canLogin: !!student.userId && pupilCanLogin(phase),
        relation: link.relation,
        school: school
          ? { id: school.id, phase: school.phase, name: school.name }
          : null,
        class: student.class
          ? { id: student.class.id, name: student.class.name, year: student.class.year, keyStage: student.class.keyStage }
          : null,
      };
    });

    const pupilClass = user.studentProfile?.class
      ? {
          id: user.studentProfile.class.id,
          name: user.studentProfile.class.name,
          year: user.studentProfile.class.year,
          section: user.studentProfile.class.section,
          keyStage: user.studentProfile.class.keyStage,
          schoolId: user.studentProfile.class.schoolId,
        }
      : null;

    const taught = new Map<string, { id: string; name: string; year: number; keyStage: string; schoolId: string }>();
    for (const assignment of user.teacherProfile?.classSubjects ?? []) {
      taught.set(assignment.class.id, {
        id: assignment.class.id,
        name: assignment.class.name,
        year: assignment.class.year,
        keyStage: assignment.class.keyStage,
        schoolId: assignment.class.schoolId,
      });
    }

    const schools = [...schoolMap.values()]
      .map((school) => {
        const rule = phaseRule(school.phase);
        return {
          ...school,
          name: rule?.name ?? school.name,
          keyStages: rule ? [...rule.keyStages] : [],
        };
      })
      .sort((a, b) => phaseOrder(a.phase) - phaseOrder(b.phase));

    return {
      role: user.role,
      schools,
      class: pupilClass,
      classes: [...taught.values()],
      children,
    };
  }

  async headDashboard(userId: string) {
    const head = await this.prisma.headProfile.findUnique({
      where: { userId },
      include: { school: true },
    });
    if (!head) {
      throw new ForbiddenException('Only a headteacher can open a school dashboard');
    }

    const [classes, pupils] = await Promise.all([
      this.prisma.class.findMany({
        where: { schoolId: head.schoolId },
        include: {
          classSubjects: {
            include: {
              teacher: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
            },
          },
        },
      }),
      this.prisma.studentProfile.findMany({
        where: { schoolId: head.schoolId },
        include: {
          parentLinks: {
            include: { parent: { include: { user: { select: { firstName: true, lastName: true } } } } },
          },
        },
      }),
    ]);

    return shapeHeadDashboard(
      head.school,
      classes.map((schoolClass) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        year: schoolClass.year,
        section: schoolClass.section,
        keyStage: schoolClass.keyStage,
        schoolId: schoolClass.schoolId,
        teachers: uniqueTeachers(schoolClass.classSubjects.map((assignment) => ({
          id: assignment.teacher.user.id,
          name: `${assignment.teacher.user.firstName} ${assignment.teacher.user.lastName}`,
        }))),
      })),
      pupils.map((pupil) => ({
        studentId: pupil.id,
        firstName: pupil.firstName,
        lastName: pupil.lastName,
        admissionNo: pupil.admissionNo,
        schoolId: pupil.schoolId,
        classId: pupil.classId,
        userId: pupil.userId,
        parents: pupil.parentLinks.map((link) => ({
          name: `${link.parent.user.firstName} ${link.parent.user.lastName}`,
          relation: link.relation,
        })),
      })),
    );
  }

  async childForParent(userId: string, studentId: string) {
    const parent = await this.prisma.parentProfile.findUnique({ where: { userId } });
    if (!parent) {
      throw new ForbiddenException('Only a parent can open a child record');
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        class: {
          include: {
            classSubjects: {
              include: {
                subject: { select: { name: true } },
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
              },
            },
          },
        },
        parentLinks: true,
      },
    });
    if (!student) throw new NotFoundException('Child not found');

    const link = student.parentLinks.find((item) => item.parentId === parent.id);
    const school = student.school ?? null;
    const result = shapeChildView({
      viewerParentId: parent.id,
      linkedParentIds: link ? [parent.id] : [],
      pupil: {
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNo: student.admissionNo,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
        enrollmentDate: student.enrollmentDate ? student.enrollmentDate.toISOString() : null,
        userId: student.userId,
        relation: link?.relation ?? '',
        school: school
          ? { id: school.id, phase: school.phase, name: school.name, ageMin: school.ageMin, ageMax: school.ageMax }
          : null,
        class: student.class
          ? { id: student.class.id, name: student.class.name, year: student.class.year, keyStage: student.class.keyStage }
          : null,
        teachers: (student.class?.classSubjects ?? []).map((assignment) => ({
          name: `${assignment.teacher.user.firstName} ${assignment.teacher.user.lastName}`,
          subject: assignment.subject.name,
        })),
      },
    });
    if (!result.ok) throw new NotFoundException(result.reason);
    return result.view;
  }
}

function uniqueTeachers(teachers: { id: string; name: string }[]) {
  const seen = new Map<string, { id: string; name: string }>();
  for (const teacher of teachers) seen.set(teacher.id, teacher);
  return [...seen.values()];
}

function phaseOrder(phase: string): number {
  const index = PHASE_RULES.findIndex((rule) => rule.phase === phase);
  return index === -1 ? 99 : index;
}
