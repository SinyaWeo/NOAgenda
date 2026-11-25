/**
 * Calendar arithmetic in an IANA time zone, built on Intl only (no date library).
 *
 * Recurrence has to keep the *wall-clock* time across daylight-saving changes: a task due at 09:00
 * Prague time stays due at 09:00 after the clocks move, which is not "+7 x 24 h" in UTC.
 */

export interface Zoned {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** A zone name Intl accepts; anything else (null, typo) falls back to UTC. */
export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return 'UTC';
  try {
    formatter(timeZone);
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/** The wall-clock reading of an instant in `timeZone`. */
export function toZoned(date: Date, timeZone: string): Zoned {
  const parts: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    ms: ((date.getTime() % 1000) + 1000) % 1000,
  };
}

/** The wall clock `z` read as if it were UTC: handy for day arithmetic and offsets. */
function asUtcMs(z: Zoned): number {
  return Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second, z.ms);
}

/**
 * The instant at which `timeZone`'s wall clock reads `z`. A time that does not exist (the hour skipped
 * when the clocks go forward) lands just after the gap; an ambiguous one (the hour repeated when they go
 * back) takes the first occurrence.
 */
export function fromZoned(z: Zoned, timeZone: string): Date {
  const wall = asUtcMs(z);
  if (!Number.isFinite(wall) || Math.abs(wall) > 8.64e15 - 2 * 86_400_000) return new Date(NaN); // beyond what a Date holds
  // Try the offsets in effect a day either side: one of them is right, and when two are the earlier instant wins.
  const guesses = new Set<number>();
  for (const probe of [wall - 86_400_000, wall, wall + 86_400_000]) {
    guesses.add(asUtcMs(toZoned(new Date(probe), timeZone)) - probe);
  }
  let best: number | null = null;
  for (const offset of guesses) {
    const t = wall - offset;
    if (asUtcMs(toZoned(new Date(t), timeZone)) === wall && (best === null || t < best)) best = t;
  }
  if (best !== null) return new Date(best);
  // In the gap: use the offset from before it, which moves the time forward past the gap.
  return new Date(wall - Math.min(...guesses));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 1 = Monday ... 7 = Sunday, for a calendar date. */
export function isoWeekday(year: number, month: number, day: number): number {
  return ((new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7) + 1;
}

/** Calendar date `days` after (or before) `z`, keeping the time of day. */
export function addDaysZoned(z: Zoned, days: number): Zoned {
  const d = new Date(Date.UTC(z.year, z.month - 1, z.day + days));
  return { ...z, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** The same day of month `months` later, clamped to the end of a shorter month (Jan 31 + 1 = Feb 28/29). */
export function addMonthsZoned(z: Zoned, months: number): Zoned {
  const index = z.year * 12 + (z.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return { ...z, year, month, day: Math.min(z.day, daysInMonth(year, month)) };
}

/** Whole days from calendar date `a` to `b` (negative when `b` is earlier). */
export function dayDiff(a: Pick<Zoned, 'year' | 'month' | 'day'>, b: Pick<Zoned, 'year' | 'month' | 'day'>): number {
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

/** `days` calendar days before the day `date` falls on in `timeZone`, at `time` ("HH:MM") there. */
export function daysBeforeAt(date: Date, days: number, time: string, timeZone: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const day = addDaysZoned(toZoned(date, timeZone), -days);
  return fromZoned({ ...day, hour, minute, second: 0, ms: 0 }, timeZone);
}
