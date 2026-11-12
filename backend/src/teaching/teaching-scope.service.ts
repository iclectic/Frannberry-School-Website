import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pupilName } from '../common/pupil-name';
import { phaseRule } from '../school/phase-rules';
import { Placement } from './scope';

export interface TeachingScope {
  audience: 'all' | 'scoped';
  placements: Placement[];
}

@Injectable()
export class TeachingScopeService {
  constructor(private prisma: PrismaService) {}

  async forUser(userId: string, role: string): Promise<TeachingScope> {
    if (role === 'ADMIN') return { audience: 'all', placements: [] };

    if (role === 'HEAD') {
      const head = await this.prisma.headProfile.findUnique({
        where: { userId },
        include: { school: { include: { classes: true } } },
      });
      if (!head) return { audience: 'scoped', placements: [] };
      return {
        audience: 'scoped',
        placements: head.school.classes.map((schoolClass) => this.placementFromClass(schoolClass, head.school, null, null)),
      };
    }

    if (role === 'TEACHER') {
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { userId },
        include: { classSubjects: { include: { class: { include: { school: true } } } } },
      });
      const seen = new Map<string, Placement>();
      for (const assignment of teacher?.classSubjects ?? []) {
        const schoolClass = assignment.class;
        if (!schoolClass?.school) continue;
        seen.set(schoolClass.id, this.placementFromClass(schoolClass, schoolClass.school, null, null));
      }
      return { audience: 'scoped', placements: [...seen.values()] };
    }

    if (role === 'STUDENT') {
      const student = await this.prisma.studentProfile.findUnique({
        where: { userId },
        include: { school: true, class: { include: { school: true } } },
      });
      if (!student) return { audience: 'scoped', placements: [] };
      return { audience: 'scoped', placements: [this.placementForPupil(student)] };
    }

    if (role === 'PARENT') {
      const parent = await this.prisma.parentProfile.findUnique({
        where: { userId },
        include: {
          childLinks: {
            include: { student: { include: { school: true, class: { include: { school: true } }, user: { select: { firstName: true, lastName: true } } } } },
          },
        },
      });
      const placements = (parent?.childLinks ?? []).map((link) => this.placementForPupil(link.student));
      return { audience: 'scoped', placements };
    }

    return { audience: 'scoped', placements: [] };
  }

  private placementForPupil(student: {
    id: string;
    firstName: string;
    lastName: string;
    school: { id: string; phase: string; name: string } | null;
    class: { id: string; name: string; keyStage: string; school: { id: string; phase: string; name: string } } | null;
    user?: { firstName?: string | null; lastName?: string | null } | null;
  }): Placement {
    const name = pupilName(student);
    const school = student.class?.school ?? student.school;
    const named = school ? this.schoolLabel(school) : { schoolId: '', schoolName: 'No school', phase: '' };
    return {
      pupilId: student.id,
      pupilName: `${name.firstName} ${name.lastName}`.trim(),
      schoolId: named.schoolId,
      schoolName: named.schoolName,
      phase: named.phase,
      keyStage: student.class?.keyStage ?? null,
      classId: student.class?.id ?? null,
      className: student.class?.name ?? null,
    };
  }

  private placementFromClass(
    schoolClass: { id: string; name: string; keyStage: string },
    school: { id: string; phase: string; name: string },
    pupilId: string | null,
    pupilName: string | null,
  ): Placement {
    const named = this.schoolLabel(school);
    return {
      pupilId,
      pupilName,
      schoolId: named.schoolId,
      schoolName: named.schoolName,
      phase: named.phase,
      keyStage: schoolClass.keyStage,
      classId: schoolClass.id,
      className: schoolClass.name,
    };
  }

  private schoolLabel(school: { id: string; phase: string; name: string }) {
    const rule = phaseRule(school.phase);
    return { schoolId: school.id, schoolName: rule?.name ?? school.name, phase: school.phase };
  }
}
