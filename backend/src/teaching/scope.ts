export interface Placement {
  pupilId: string | null;
  pupilName: string | null;
  schoolId: string;
  schoolName: string;
  phase: string;
  keyStage: string | null;
  classId: string | null;
  className: string | null;
}

export interface ScopedRecord {
  schoolId: string | null;
  keyStage: string | null;
  classId: string | null;
}

export type ScopeMode = 'class' | 'stage';

export function isTrustWide(record: ScopedRecord): boolean {
  return !record.schoolId && !record.keyStage && !record.classId;
}

/**
 * Class mode keeps a record only when it is the pupil's own class in their school and key stage.
 * Stage mode keeps a record for the same school and key stage, including a sibling class.
 * A trust-wide record has no school and matches every placement.
 */
export function matchesPlacement(record: ScopedRecord, placement: Placement, mode: ScopeMode): boolean {
  if (isTrustWide(record)) return true;
  if (!record.schoolId || record.schoolId !== placement.schoolId) return false;
  if (record.keyStage && record.keyStage !== placement.keyStage) return false;
  if (mode === 'class') {
    if (record.classId && !placement.classId) return false;
    if (record.classId && placement.classId && record.classId !== placement.classId) return false;
  }
  return true;
}

export function recordsForPlacement<T extends ScopedRecord>(
  records: T[],
  placement: Placement,
  mode: ScopeMode,
): T[] {
  return records.filter((record) => !isTrustWide(record) && matchesPlacement(record, placement, mode));
}

/** One announcement group per pupil, school, and key stage. Sibling classes share a group. */
export function collapsePlacements(placements: Placement[]): Placement[] {
  const map = new Map<string, Placement>();
  for (const placement of placements) {
    const key = `${placement.pupilId ?? ''}|${placement.schoolId}|${placement.keyStage ?? ''}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...placement });
      continue;
    }
    if (existing.classId && placement.classId && existing.classId !== placement.classId) {
      existing.classId = null;
      existing.className = null;
    }
  }
  return [...map.values()];
}

export function groupByPlacement<T extends ScopedRecord>(
  records: T[],
  placements: Placement[],
  mode: ScopeMode,
): { placement: Placement; items: T[] }[] {
  const groups = mode === 'stage' ? collapsePlacements(placements) : placements;
  return groups.map((placement) => ({
    placement,
    items: recordsForPlacement(records, placement, mode),
  }));
}

export function trustWideItems<T extends ScopedRecord>(records: T[]): T[] {
  return records.filter((record) => isTrustWide(record));
}
