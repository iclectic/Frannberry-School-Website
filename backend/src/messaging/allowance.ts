export const TEACHER_WEEKLY_LIMIT = 5;
export const HEAD_WEEKLY_LIMIT = 1;
export const LONDON_TIME_ZONE = 'Europe/London';

export interface LondonWeek {
  start: Date;
  end: Date;
}

export type AllowanceScope = 'teachers' | 'head' | 'none';

export interface AllowanceDecision {
  limited: boolean;
  scope: AllowanceScope;
  limit: number | null;
  used: number;
  remaining: number | null;
  allowed: boolean;
}

interface LondonParts {
  year: number;
  month: number;
  day: number;
  weekday: string;
  hour: number;
  minute: number;
  second: number;
}

const MONDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function londonParts(date: Date): LondonParts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday.slice(0, 3),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Convert a Europe/London civil time to a UTC instant. */
export function londonLocalToUtc(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const parts = londonParts(guess);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(guess.getTime() - (asUtc - guess.getTime()));
}

/**
 * The messaging week runs from Monday 00:00 Europe/London inclusive
 * to the next Monday 00:00 Europe/London exclusive.
 */
export function londonWeekBounds(now: Date): LondonWeek {
  const parts = londonParts(now);
  const daysSinceMonday = MONDAY_INDEX[parts.weekday] ?? 0;
  const today = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  today.setUTCDate(today.getUTCDate() - daysSinceMonday);
  const start = londonLocalToUtc(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate());
  const next = new Date(today.getTime());
  next.setUTCDate(next.getUTCDate() + 7);
  const end = londonLocalToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  return { start, end };
}

export function allowanceForSend(input: {
  senderRole: string;
  recipientRole: string;
  used: number;
}): AllowanceDecision {
  if (input.senderRole !== 'PARENT') {
    return { limited: false, scope: 'none', limit: null, used: 0, remaining: null, allowed: true };
  }
  if (input.recipientRole === 'TEACHER') {
    const remaining = Math.max(0, TEACHER_WEEKLY_LIMIT - input.used);
    return {
      limited: true,
      scope: 'teachers',
      limit: TEACHER_WEEKLY_LIMIT,
      used: input.used,
      remaining,
      allowed: input.used < TEACHER_WEEKLY_LIMIT,
    };
  }
  if (input.recipientRole === 'HEAD') {
    const remaining = Math.max(0, HEAD_WEEKLY_LIMIT - input.used);
    return {
      limited: true,
      scope: 'head',
      limit: HEAD_WEEKLY_LIMIT,
      used: input.used,
      remaining,
      allowed: input.used < HEAD_WEEKLY_LIMIT,
    };
  }
  return { limited: false, scope: 'none', limit: null, used: 0, remaining: null, allowed: true };
}

export interface AllowanceMessage {
  senderRole: string;
  recipientRole: string;
  createdAt: Date;
  deleted: boolean;
  schoolId?: string;
}

/**
 * A parent message to a teacher or head counts for the London week even after it is deleted.
 * A reply from a teacher or head does not count.
 */
export function allowanceScopeForMessage(message: AllowanceMessage, week: LondonWeek): 'teachers' | 'head' | null {
  if (message.senderRole !== 'PARENT') return null;
  if (message.recipientRole !== 'TEACHER' && message.recipientRole !== 'HEAD') return null;
  if (message.createdAt.getTime() < week.start.getTime() || message.createdAt.getTime() >= week.end.getTime()) {
    return null;
  }
  return message.recipientRole === 'HEAD' ? 'head' : 'teachers';
}
