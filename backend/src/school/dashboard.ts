import { phaseRule, pupilCanLogin } from './phase-rules';

export interface SchoolRef {
  id: string;
  phase: string;
  name: string;
  ageMin: number;
  ageMax: number;
}

export interface DashboardTeacher {
  id: string;
  name: string;
}

export interface DashboardClassInput {
  id: string;
  name: string;
  year: number;
  section: string | null;
  keyStage: string;
  schoolId: string;
  teachers: DashboardTeacher[];
}

export interface DashboardPupilInput {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
  schoolId: string | null;
  classId: string | null;
  userId: string | null;
  parents: { name: string; relation: string }[];
}

export interface ChildTeacher {
  name: string;
  subject: string;
}

export interface ChildViewInput {
  viewerParentId: string;
  linkedParentIds: string[];
  pupil: {
    studentId: string;
    firstName: string;
    lastName: string;
    admissionNo: string;
    dateOfBirth: string | null;
    enrollmentDate: string | null;
    userId: string | null;
    relation: string;
    school: SchoolRef | null;
    class: { id: string; name: string; year: number; keyStage: string } | null;
    teachers: ChildTeacher[];
  };
}

/**
 * A headteacher dashboard contains only the school they lead.
 * Pupils and classes from any other school are dropped.
 */
export function shapeHeadDashboard(
  school: SchoolRef,
  classes: DashboardClassInput[],
  pupils: DashboardPupilInput[],
) {
  const rule = phaseRule(school.phase);
  const ownClasses = classes.filter((item) => item.schoolId === school.id);
  const ownPupils = pupils.filter((item) => item.schoolId === school.id);
  const teachers = new Map<string, DashboardTeacher>();
  for (const schoolClass of ownClasses) {
    for (const teacher of schoolClass.teachers) teachers.set(teacher.id, teacher);
  }

  const shapedPupils = ownPupils
    .map((pupil) => {
      const schoolClass = ownClasses.find((item) => item.id === pupil.classId) ?? null;
      return {
        studentId: pupil.studentId,
        firstName: pupil.firstName,
        lastName: pupil.lastName,
        admissionNo: pupil.admissionNo,
        canLogin: !!pupil.userId && pupilCanLogin(school.phase),
        class: schoolClass
          ? { id: schoolClass.id, name: schoolClass.name, keyStage: schoolClass.keyStage }
          : null,
        parents: pupil.parents,
      };
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

  return {
    school: {
      id: school.id,
      phase: school.phase,
      name: rule?.name ?? school.name,
      ageMin: rule?.ageMin ?? school.ageMin,
      ageMax: rule?.ageMax ?? school.ageMax,
      keyStages: rule ? [...rule.keyStages] : [],
      note: rule?.note ?? '',
    },
    counts: {
      pupils: shapedPupils.length,
      pupilsWithoutLogin: shapedPupils.filter((pupil) => !pupil.canLogin).length,
      classes: ownClasses.length,
      teachers: teachers.size,
    },
    classes: ownClasses
      .map((schoolClass) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        year: schoolClass.year,
        section: schoolClass.section,
        keyStage: schoolClass.keyStage,
        pupilCount: shapedPupils.filter((pupil) => pupil.class?.id === schoolClass.id).length,
        teachers: schoolClass.teachers,
      }))
      .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name)),
    pupils: shapedPupils,
  };
}

/**
 * A parent may open a pupil record only when they are linked to that child.
 * Nursery children cannot sign in, so the record is the parent's view of them.
 */
export function shapeChildView(input: ChildViewInput) {
  if (!input.linkedParentIds.includes(input.viewerParentId)) {
    return { ok: false as const, status: 404 as const, reason: 'Child not found' };
  }

  const phase = input.pupil.school?.phase ?? '';
  const rule = phaseRule(phase);
  const phaseAllowsLogin = pupilCanLogin(phase);
  const canLogin = !!input.pupil.userId && phaseAllowsLogin;
  const firstName = input.pupil.firstName;
  const schoolName = rule?.name ?? input.pupil.school?.name ?? 'This school';
  let notice: string;
  if (!phaseAllowsLogin) {
    notice = `${firstName} cannot sign in. ${schoolName} children have a pupil record and no portal login. This page is how you see them at school.`;
  } else if (!input.pupil.userId) {
    notice = `${firstName} does not have a login yet.`;
  } else {
    notice = `${firstName} can sign in with their own pupil account.`;
  }

  return {
    ok: true as const,
    view: {
      studentId: input.pupil.studentId,
      firstName: input.pupil.firstName,
      lastName: input.pupil.lastName,
      admissionNo: input.pupil.admissionNo,
      dateOfBirth: input.pupil.dateOfBirth,
      enrollmentDate: input.pupil.enrollmentDate,
      relation: input.pupil.relation,
      canLogin,
      notice,
      school: input.pupil.school
        ? {
            id: input.pupil.school.id,
            phase: input.pupil.school.phase,
            name: schoolName,
            ageMin: rule?.ageMin ?? input.pupil.school.ageMin,
            ageMax: rule?.ageMax ?? input.pupil.school.ageMax,
          }
        : null,
      class: input.pupil.class,
      teachers: input.pupil.teachers,
    },
  };
}
