import { phaseRule, placementError, pupilCanLogin, PHASE_RULES, PhaseRule } from '../school/phase-rules';

/** Completed years of age on a UTC calendar date. */
export function ageOn(dateOfBirth: Date, on: Date): number {
  let age = on.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const month = on.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (month < 0 || (month === 0 && on.getUTCDate() < dateOfBirth.getUTCDate())) age -= 1;
  return age;
}

export function parseDateOfBirth(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

/** Nursery is 2 or 3. Primary is from 4 until 11. Secondary is from 11 through 18. */
export function schoolForAge(age: number): PhaseRule | undefined {
  return PHASE_RULES.find((rule) => {
    if (rule.phase === 'SECONDARY') return age >= rule.ageMin && age <= rule.ageMax;
    return age >= rule.ageMin && age < rule.ageMax;
  });
}

export function applicationError(phase: string, keyStage: string, dateOfBirth: Date, on: Date): string | null {
  const rule = phaseRule(phase);
  if (!rule) return 'Choose Nursery, Primary, or Secondary.';
  const stageError = placementError(phase, keyStage);
  if (stageError) return stageError;
  const age = ageOn(dateOfBirth, on);
  const fit = schoolForAge(age);
  if (fit?.phase === phase) return null;
  if (!fit) return `A child aged ${age} is outside Nursery (2–4), Primary (4–11), and Secondary (11–18).`;
  const reception = fit.phase === 'PRIMARY' && age < 6 ? ' Reception stays in Primary and is still EYFS.' : '';
  return `A child aged ${age} belongs in ${fit.name}, not ${rule.name}.${reception}`;
}

/** A Nursery place never has a login. Primary and Secondary places can. */
export function loginForPlace(phase: string, createLogin: boolean): { createLogin: boolean; error?: string } {
  if (!phaseRule(phase)) return { createLogin: false, error: 'Choose Nursery, Primary, or Secondary.' };
  if (createLogin && !pupilCanLogin(phase)) {
    return { createLogin: false, error: 'A Nursery place creates a pupil record and no login.' };
  }
  return { createLogin: Boolean(createLogin) && pupilCanLogin(phase) };
}

export function reviewScope(
  role: string,
  headSchoolId: string | null,
): { all: boolean; schoolId: string | null } | { error: string } {
  if (role === 'ADMIN') return { all: true, schoolId: null };
  if (role === 'HEAD') {
    if (!headSchoolId) return { error: 'This headteacher is not assigned to a school.' };
    return { all: false, schoolId: headSchoolId };
  }
  return { error: 'Only a headteacher or the office can review applications.' };
}
