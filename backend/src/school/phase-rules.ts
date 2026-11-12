export const SCHOOL_PHASES = ['NURSERY', 'PRIMARY', 'SECONDARY'] as const;
export type SchoolPhaseName = (typeof SCHOOL_PHASES)[number];

export const KEY_STAGES = ['EYFS', 'KS1', 'KS2', 'KS3', 'KS4', 'KS5'] as const;
export type KeyStageName = (typeof KEY_STAGES)[number];

export interface PhaseRule {
  phase: SchoolPhaseName;
  name: 'Nursery' | 'Primary' | 'Secondary';
  ageMin: number;
  ageMax: number;
  keyStages: readonly KeyStageName[];
  pupilsCanLogin: boolean;
  note: string;
}

/**
 * Frannberry is one trust with three schools.
 * Reception stays in Primary and is still EYFS.
 */
export const PHASE_RULES: readonly PhaseRule[] = [
  {
    phase: 'NURSERY',
    name: 'Nursery',
    ageMin: 2,
    ageMax: 4,
    keyStages: ['EYFS'],
    pupilsCanLogin: false,
    note: 'Nursery is EYFS only. Children have a pupil record and cannot log in.',
  },
  {
    phase: 'PRIMARY',
    name: 'Primary',
    ageMin: 4,
    ageMax: 11,
    keyStages: ['EYFS', 'KS1', 'KS2'],
    pupilsCanLogin: true,
    note: 'Reception stays in Primary and is still EYFS.',
  },
  {
    phase: 'SECONDARY',
    name: 'Secondary',
    ageMin: 11,
    ageMax: 18,
    keyStages: ['KS3', 'KS4', 'KS5'],
    pupilsCanLogin: true,
    note: 'Secondary covers KS3, KS4, and KS5.',
  },
];

export function phaseRule(phase: string): PhaseRule | undefined {
  return PHASE_RULES.find((rule) => rule.phase === phase);
}

export function keyStageFitsSchool(phase: string, keyStage: string): boolean {
  const rule = phaseRule(phase);
  if (!rule) return false;
  return (rule.keyStages as readonly string[]).includes(keyStage);
}

export function allowedKeyStages(phase: string): readonly string[] {
  return phaseRule(phase)?.keyStages ?? [];
}

export function placementError(phase: string, keyStage: string): string | null {
  if (keyStageFitsSchool(phase, keyStage)) return null;
  const rule = phaseRule(phase);
  const schoolName = rule?.name ?? phase;
  const allowed = rule ? rule.keyStages.join(', ') : 'none';
  return `${keyStage} does not fit the ${schoolName} school. Allowed key stages: ${allowed}.`;
}

export function pupilCanLogin(phase: string): boolean {
  return phaseRule(phase)?.pupilsCanLogin ?? false;
}
