import { PHASE_RULES, phaseRule, pupilCanLogin } from '../school/phase-rules';

/** The trust report is for the office admin. A headteacher is not the office. */
export function canViewTrustReport(role: string): boolean {
  return role === 'ADMIN';
}

export interface TrustSchoolSource {
  phase: string;
  headteacher: string | null;
  teacherIds: string[];
  pupils: { userId: string | null }[];
  classes: { name: string; section: string | null; keyStage: string; pupilCount: number }[];
  attendance: { status: string }[];
  admissions: { status: string }[];
}

function countStatus(rows: { status: string }[], status: string) {
  return rows.filter((row) => row.status === status).length;
}

function summariseSchool(source: TrustSchoolSource) {
  const rule = phaseRule(source.phase);
  const loginAllowed = pupilCanLogin(source.phase);
  const withLogin = source.pupils.filter((pupil) => pupil.userId).length;
  const keyStages = [...new Set(source.classes.map((schoolClass) => schoolClass.keyStage))];
  return {
    phase: source.phase,
    schoolName: rule?.name ?? source.phase,
    headteacher: source.headteacher,
    teacherCount: new Set(source.teacherIds).size,
    pupils: source.pupils.length,
    canSignIn: loginAllowed ? withLogin : 0,
    cannotSignIn: loginAllowed ? source.pupils.length - withLogin : source.pupils.length,
    keyStages,
    classes: source.classes.map((schoolClass) => ({
      name: schoolClass.name,
      section: schoolClass.section,
      keyStage: schoolClass.keyStage,
      pupils: schoolClass.pupilCount,
    })),
    attendance: {
      total: source.attendance.length,
      present: countStatus(source.attendance, 'PRESENT'),
      absent: countStatus(source.attendance, 'ABSENT'),
      late: countStatus(source.attendance, 'LATE'),
      excused: countStatus(source.attendance, 'EXCUSED'),
    },
    admissions: {
      received: countStatus(source.admissions, 'RECEIVED'),
      enrolled: countStatus(source.admissions, 'ENROLLED'),
      declined: countStatus(source.admissions, 'DECLINED'),
    },
  };
}

/** One office report with Nursery, Primary, and Secondary kept apart. */
export function shapeTrustReport(schools: TrustSchoolSource[]) {
  const byPhase = new Map(schools.map((school) => [school.phase, school]));
  const shaped = PHASE_RULES.map((rule) => summariseSchool(byPhase.get(rule.phase) ?? {
    phase: rule.phase,
    headteacher: null,
    teacherIds: [],
    pupils: [],
    classes: [],
    attendance: [],
    admissions: [],
  }));
  return {
    viewer: 'office' as const,
    isHeadteacher: false,
    schools: shaped,
    totals: {
      schools: shaped.length,
      pupils: shaped.reduce((sum, school) => sum + school.pupils, 0),
      canSignIn: shaped.reduce((sum, school) => sum + school.canSignIn, 0),
      cannotSignIn: shaped.reduce((sum, school) => sum + school.cannotSignIn, 0),
    },
  };
}
