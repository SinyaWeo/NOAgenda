import { Node, NodeStatus, NodeType, RepeatMode } from './node.entity';
import {
  addDaysZoned,
  addMonthsZoned,
  dayDiff,
  daysInMonth,
  fromZoned,
  isoWeekday,
  safeTimeZone,
  toZoned,
  Zoned,
} from '../../common/zoned-time';

const MAX_MONTH_STEPS = 12 * 1000;

type Repeating = Pick<
  Node,
  | 'type'
  | 'status'
  | 'dueDate'
  | 'startDate'
  | 'repeatMode'
  | 'repeatAfter'
  | 'repeatWeekdays'
  | 'repeatUntil'
  | 'repeatCount'
>;

export interface NextOccurrence {
  dueDate: Date;
  /** Present only when the task had a start date (and a due date to move it relative to). */
  startDate?: Date;
  /** How far the due date moved; reminders move by the same amount. Null when there was no due date before. */
  shiftMs: number | null;
}

/** `date` plus `months` calendar months in UTC; the day is clamped to the end of a shorter month (Jan 31 + 1 = Feb 28/29). */
export function addMonths(date: Date, months: number): Date {
  return fromZoned(addMonthsZoned(toZoned(date, 'UTC'), months), 'UTC');
}

/** Does completing this task start a new cycle (ignoring whether the series has run out)? */
export function isRecurring(task: Pick<Repeating, 'type' | 'repeatAfter'>): boolean {
  return task.type === NodeType.TASK && typeof task.repeatAfter === 'number' && task.repeatAfter > 0;
}

/** "1,3,5" -> Set{1,3,5}; ignores anything that is not an ISO weekday. */
export function parseWeekdays(value: string | null | undefined): Set<number> {
  const out = new Set<number>();
  for (const part of (value ?? '').split(',')) {
    const n = Number(part);
    if (Number.isInteger(n) && n >= 1 && n <= 7) out.add(n);
  }
  return out;
}

/** The first of `candidate(1)`, `candidate(2)`, ... that lies after `now`. */
function firstAfter(now: Date, start: number, candidate: (k: number) => Date): Date {
  let k = start;
  let next = candidate(k);
  while (next.getTime() <= now.getTime() && k < MAX_MONTH_STEPS) next = candidate(++k);
  return next;
}

/** The `nth` (1-4) or last (5) occurrence of ISO weekday `weekday` in a month. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): number {
  const last = daysInMonth(year, month);
  if (nth >= 5) {
    for (let day = last; day > last - 7; day--) if (isoWeekday(year, month, day) === weekday) return day;
  }
  const first = ((weekday - isoWeekday(year, month, 1) + 7) % 7) + 1;
  return first + (nth - 1) * 7;
}

function monthStep(z: Zoned, months: number): { year: number; month: number } {
  const index = z.year * 12 + (z.month - 1) + months;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * When a repeating task is due next, counted from now (`now`). Dates are calendar dates in `timeZone`
 * and the time of day is kept across daylight-saving changes.
 *
 * `repeatAfter` is N, and what it counts depends on the mode:
 * - DEFAULT: the due date plus N days, repeated until it lies in the future (finishing a task late
 *   does not leave the next one already overdue).
 * - MONTHLY: the due date plus N calendar months (day of month clamped), same rule.
 * - MONTH_END: the last day of the month, N months on.
 * - MONTHLY_WEEKDAY: the same weekday position in the month, N months on ("second Tuesday").
 * - WEEKLY: every N weeks on `repeatWeekdays`, weeks counted from the one the due date is in.
 * - FROM_CURRENT_DATE: N days after completion.
 * A task without a due date is counted from `now`. Returns null for a task that does not repeat, whose next
 * date would be out of range, or that would fall after `repeatUntil`.
 */
export function nextOccurrence(task: Repeating, now: Date, timeZone = 'UTC'): NextOccurrence | null {
  if (!isRecurring(task)) return null;
  const tz = safeTimeZone(timeZone);
  const n = task.repeatAfter as number;
  const base = task.dueDate ? new Date(task.dueDate) : now;
  const bz = toZoned(base, tz);
  const nz = toZoned(now, tz);
  const at = (z: Zoned) => fromZoned(z, tz);
  let next: Date;

  switch (task.repeatMode) {
    case RepeatMode.FROM_CURRENT_DATE:
      next = at(addDaysZoned(nz, n));
      break;
    case RepeatMode.MONTHLY:
      // Always count from the original date: stepping from an already clamped one would drift (Jan 31 -> Feb 28 -> Mar 28).
      next = firstAfter(now, 1, (k) => at(addMonthsZoned(bz, n * k)));
      break;
    case RepeatMode.MONTH_END:
      next = firstAfter(now, 1, (k) => {
        const { year, month } = monthStep(bz, n * k);
        return at({ ...bz, year, month, day: daysInMonth(year, month) });
      });
      break;
    case RepeatMode.MONTHLY_WEEKDAY: {
      const weekday = isoWeekday(bz.year, bz.month, bz.day);
      const nth = Math.min(5, Math.ceil(bz.day / 7));
      next = firstAfter(now, 1, (k) => {
        const { year, month } = monthStep(bz, n * k);
        return at({ ...bz, year, month, day: nthWeekdayOfMonth(year, month, weekday, nth) });
      });
      break;
    }
    case RepeatMode.WEEKLY: {
      const baseWeekday = isoWeekday(bz.year, bz.month, bz.day);
      const days = parseWeekdays(task.repeatWeekdays);
      if (!days.size) days.add(baseWeekday);
      // Day offsets count from the Monday of the due date's week; week w is eligible when w is a multiple of N.
      const monday = addDaysZoned(bz, 1 - baseWeekday);
      let o = Math.max(baseWeekday, dayDiff(monday, nz)); // the day after the due date, or today if later
      let found: Date | null = null;
      for (let guard = 0; guard < 64 && !found; guard++, o++) {
        const week = Math.floor(o / 7);
        const aligned = Math.ceil(week / n) * n;
        if (aligned !== week) o = aligned * 7; // jump to the start of the next eligible week
        if (!days.has((o % 7) + 1)) continue;
        const candidate = at(addDaysZoned(monday, o));
        if (candidate.getTime() > now.getTime()) found = candidate;
      }
      if (!found) return null;
      next = found;
      break;
    }
    default: {
      // DEFAULT: N days. Estimate how many steps lie between the due date and now, then settle exactly
      // (a calendar day is 23-25 hours across a clock change, so the estimate can be one step off).
      const approx = Math.floor(dayDiff(bz, nz) / n) - 1;
      next = firstAfter(now, Math.max(1, approx), (k) => at(addDaysZoned(bz, n * k)));
    }
  }

  // Beyond what the database can hold (year 9999) or not a date at all: stop repeating.
  if (!Number.isFinite(next.getTime()) || next.getUTCFullYear() > 9999) return null;
  if (task.repeatUntil) {
    const last = toZoned(new Date(task.repeatUntil), tz);
    if (dayDiff(last, toZoned(next, tz)) > 0) return null;
  }

  const shiftMs = task.dueDate ? next.getTime() - base.getTime() : null;
  const out: NextOccurrence = { dueDate: next, shiftMs };
  if (task.startDate && shiftMs !== null) out.startDate = new Date(new Date(task.startDate).getTime() + shiftMs);
  return out;
}

/**
 * The future cycles of a repeating task that fall in `[from, to]`, for calendars. The task's own current due date is
 * not included (it is the real task). Each step asks `nextOccurrence` for the first date after the previous one, so
 * every repeat mode, `repeatUntil` and the year limit apply exactly as when completing the task; `repeatCount`
 * (occurrences left, this one included) caps the series. At most `max` dates are returned.
 */
export function occurrencesBetween(
  task: Repeating,
  from: Date,
  to: Date,
  timeZone = 'UTC',
  max = 400,
): NextOccurrence[] {
  if (!isRecurring(task) || !task.dueDate) return [];
  const out: NextOccurrence[] = [];
  const left = typeof task.repeatCount === 'number' ? task.repeatCount - 1 : Infinity;
  let cursor = new Date(task.dueDate);
  for (let i = 0; i < left && out.length < max; i++) {
    const next = nextOccurrence(task, cursor, timeZone);
    if (!next || next.dueDate.getTime() <= cursor.getTime() || next.dueDate.getTime() > to.getTime()) break;
    cursor = next.dueDate;
    if (cursor.getTime() >= from.getTime()) out.push(next);
  }
  return out;
}

/**
 * The changes to apply when `change` is saved over `existing`, if that completes a repeating task:
 * the task goes back to open with no progress, its dates move on and its occurrence counter goes down.
 * Null when the task is simply done: it does not repeat, or this was the last occurrence
 * (`repeatCount` used up, or the next date would fall after `repeatUntil`).
 */
export function recurrenceOnCompletion(
  existing: Repeating,
  change: Partial<Node>,
  now: Date = new Date(),
  timeZone = 'UTC',
): (Partial<Node> & { shiftMs: number | null }) | null {
  if (change.status !== NodeStatus.DONE || existing.status === NodeStatus.DONE) return null;
  const pick = <K extends keyof Repeating>(key: K): Repeating[K] =>
    (change[key as keyof Node] !== undefined ? change[key as keyof Node] : existing[key]) as Repeating[K];
  const merged: Repeating = {
    type: existing.type,
    status: existing.status,
    dueDate: pick('dueDate'),
    startDate: pick('startDate'),
    repeatMode: pick('repeatMode'),
    repeatAfter: pick('repeatAfter'),
    repeatWeekdays: pick('repeatWeekdays'),
    repeatUntil: pick('repeatUntil'),
    repeatCount: pick('repeatCount'),
  };
  if (typeof merged.repeatCount === 'number' && merged.repeatCount <= 1) return null;
  const next = nextOccurrence(merged, now, timeZone);
  if (!next) return null;
  return {
    ...change,
    status: NodeStatus.OPEN,
    percentDone: 0,
    dueDate: next.dueDate,
    ...(next.startDate ? { startDate: next.startDate } : {}),
    ...(typeof merged.repeatCount === 'number' ? { repeatCount: merged.repeatCount - 1 } : {}),
    shiftMs: next.shiftMs,
  };
}
