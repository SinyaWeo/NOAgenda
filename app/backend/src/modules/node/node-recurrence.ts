import { Node, NodeStatus, NodeType, RepeatMode } from './node.entity';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_MONTH_STEPS = 12 * 1000;

type Repeating = Pick<Node, 'type' | 'status' | 'dueDate' | 'startDate' | 'repeatMode' | 'repeatAfter'>;

export interface NextOccurrence {
  dueDate: Date;
  /** Present only when the task had a start date (and a due date to move it relative to). */
  startDate?: Date;
  /** How far the due date moved; reminders move by the same amount. Null when there was no due date before. */
  shiftMs: number | null;
}

/** `date` plus `months` calendar months in UTC; the day is clamped to the end of a shorter month (Jan 31 + 1 = Feb 28/29). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** Does completing this task start a new cycle? */
export function isRecurring(task: Pick<Repeating, 'type' | 'repeatAfter'>): boolean {
  return task.type === NodeType.TASK && typeof task.repeatAfter === 'number' && task.repeatAfter > 0;
}

/**
 * When a repeating task is due next, counted from now (`now`).
 *
 * `repeatAfter` is a number of days, or of months for MONTHLY:
 * - DEFAULT: the due date plus N days, repeated until it lies in the future (finishing a task late
 *   does not leave the next one already overdue).
 * - MONTHLY: the due date plus N calendar months, same rule.
 * - FROM_CURRENT_DATE: N days after completion.
 * A task without a due date is counted from `now`. Returns null for a task that does not repeat
 * (or whose next date would be out of range).
 */
export function nextOccurrence(task: Repeating, now: Date): NextOccurrence | null {
  if (!isRecurring(task)) return null;
  const n = task.repeatAfter as number;
  const base = task.dueDate ? new Date(task.dueDate) : now;
  let next: Date;

  if (task.repeatMode === RepeatMode.FROM_CURRENT_DATE) {
    next = new Date(now.getTime() + n * DAY_MS);
  } else if (task.repeatMode === RepeatMode.MONTHLY) {
    // Always count from the original date: stepping from an already clamped one would drift (Jan 31 -> Feb 28 -> Mar 28).
    let k = 1;
    next = addMonths(base, n * k);
    while (next.getTime() <= now.getTime() && k < MAX_MONTH_STEPS) next = addMonths(base, n * ++k);
  } else {
    const step = n * DAY_MS;
    next = new Date(base.getTime() + step);
    if (next.getTime() <= now.getTime()) {
      next = new Date(next.getTime() + (Math.floor((now.getTime() - next.getTime()) / step) + 1) * step);
    }
  }

  // Beyond what the database can hold (year 9999) or not a date at all: stop repeating.
  if (!Number.isFinite(next.getTime()) || next.getUTCFullYear() > 9999) return null;

  const hadDue = !!task.dueDate;
  const shiftMs = hadDue ? next.getTime() - base.getTime() : null;
  const out: NextOccurrence = { dueDate: next, shiftMs };
  if (task.startDate && shiftMs !== null) out.startDate = new Date(new Date(task.startDate).getTime() + shiftMs);
  return out;
}

/**
 * The changes to apply when `change` is saved over `existing`, if that completes a repeating task:
 * the task goes back to open with no progress and its dates move on. Null otherwise.
 */
export function recurrenceOnCompletion(
  existing: Repeating,
  change: Partial<Node>,
  now: Date = new Date(),
): (Partial<Node> & { shiftMs: number | null }) | null {
  if (change.status !== NodeStatus.DONE || existing.status === NodeStatus.DONE) return null;
  const merged: Repeating = {
    type: existing.type,
    status: existing.status,
    dueDate: change.dueDate !== undefined ? change.dueDate : existing.dueDate,
    startDate: change.startDate !== undefined ? change.startDate : existing.startDate,
    repeatMode: change.repeatMode !== undefined ? change.repeatMode : existing.repeatMode,
    repeatAfter: change.repeatAfter !== undefined ? change.repeatAfter : existing.repeatAfter,
  };
  const next = nextOccurrence(merged, now);
  if (!next) return null;
  return {
    ...change,
    status: NodeStatus.OPEN,
    percentDone: 0,
    dueDate: next.dueDate,
    ...(next.startDate ? { startDate: next.startDate } : {}),
    shiftMs: next.shiftMs,
  };
}
