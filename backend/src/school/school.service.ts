import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
}

function phaseOrder(phase: string): number {
  const index = PHASE_RULES.findIndex((rule) => rule.phase === phase);
  return index === -1 ? 99 : index;
}
