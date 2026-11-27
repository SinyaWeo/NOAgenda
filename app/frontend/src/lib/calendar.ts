/**
 * Calendar maths on plain calendar days ("2026-11-16" keys) in a time zone.
 *
 * Tasks store instants; a calendar shows them on the day they fall on *in the user's zone*, so a task due
 * 23:30 in Prague is not shown on the next day for someone whose browser sits in UTC. Day keys are compared
 * and shifted with UTC date arithmetic, which has no daylight-saving days to trip over.
 */

export type DayKey = string;

/** Sunday = 0, Monday = 1. */
export type WeekStart = 0 | 1;

/**
 * The zone to count days in: the one saved in the profile (the backend counts repeat dates in it too, so
 * 'UTC' really means UTC), or the browser's when none is saved or it is not a zone this browser knows.
 */
export function effectiveZone(timeZone?: string | null): string {
	const browser = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	if (!timeZone) return browser;
	try {
		new Intl.DateTimeFormat('en', { timeZone });
		return timeZone;
	} catch {
		return browser;
	}
}

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(year: number, month: number, day: number): DayKey {
	const d = new Date(Date.UTC(year, month - 1, day));
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function keyParts(key: DayKey): { year: number; month: number; day: number } {
	const [year, month, day] = key.split('-').map(Number);
	return { year, month, day };
}

/** UTC noon of a day: safe to hand to an Intl formatter that runs in UTC. */
export function keyToDate(key: DayKey): Date {
	const { year, month, day } = keyParts(key);
	return new Date(Date.UTC(year, month - 1, day, 12));
}

export function addDaysKey(key: DayKey, days: number): DayKey {
	const { year, month, day } = keyParts(key);
	return dayKey(year, month, day + days);
}

export function diffDaysKey(a: DayKey, b: DayKey): number {
	return Math.round((keyToDate(b).getTime() - keyToDate(a).getTime()) / 86400000);
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekdayOfKey(key: DayKey): number {
	return keyToDate(key).getUTCDay();
}

type Wall = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function wallClock(ms: number, timeZone: string): Wall {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric'
	}).formatToParts(new Date(ms));
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	return {
		year: get('year'),
		month: get('month'),
		day: get('day'),
		hour: get('hour'),
		minute: get('minute'),
		second: get('second')
	};
}

/** The calendar day an instant falls on in `timeZone`. */
export function dayKeyOf(value: string | Date, timeZone: string): DayKey {
	const w = wallClock(new Date(value).getTime(), timeZone);
	return dayKey(w.year, w.month, w.day);
}

/** Milliseconds `timeZone` is ahead of UTC at the instant `ms`. */
function offsetAt(ms: number, timeZone: string): number {
	const w = wallClock(ms, timeZone);
	return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(ms / 1000) * 1000;
}

/** The instant at which the wall clock in `timeZone` reads this date and time. */
function instantAt(w: Wall, timeZone: string): Date {
	const guess = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
	let result = guess - offsetAt(guess, timeZone);
	const again = guess - offsetAt(result, timeZone);
	if (again !== result) result = again; // the guess straddled a clock change
	return new Date(result);
}

/** Noon of a calendar day in `timeZone`: the instant a date-only value is stored as. */
export function noonOn(key: DayKey, timeZone: string): Date {
	return instantAt({ ...keyParts(key), hour: 12, minute: 0, second: 0 }, timeZone);
}

/** `value` moved to another calendar day, keeping its time of day in `timeZone`. */
export function moveToDay(value: string | Date, target: DayKey, timeZone: string): Date {
	const w = wallClock(new Date(value).getTime(), timeZone);
	const t = keyParts(target);
	return instantAt({ ...w, year: t.year, month: t.month, day: t.day }, timeZone);
}

/** Start of a day and the last millisecond of it, in `timeZone`. */
export function dayBounds(key: DayKey, timeZone: string): { start: Date; end: Date } {
	const { year, month, day } = keyParts(key);
	const start = instantAt({ year, month, day, hour: 0, minute: 0, second: 0 }, timeZone);
	const next = keyParts(addDaysKey(key, 1));
	const end = new Date(instantAt({ ...next, hour: 0, minute: 0, second: 0 }, timeZone).getTime() - 1);
	return { start, end };
}

/** The seven days of the week `key` is in. */
export function weekRow(key: DayKey, weekStart: WeekStart): DayKey[] {
	const first = addDaysKey(key, -((weekdayOfKey(key) - weekStart + 7) % 7));
	return Array.from({ length: 7 }, (_, i) => addDaysKey(first, i));
}

/** The weeks that show a month (4 to 6 rows of 7), including the neighbouring months' days. */
export function monthGrid(year: number, month: number, weekStart: WeekStart): DayKey[][] {
	const first = dayKey(year, month, 1);
	const last = dayKey(year, month + 1, 0);
	const rows: DayKey[][] = [];
	for (let row = weekRow(first, weekStart); ; row = weekRow(addDaysKey(row[0], 7), weekStart)) {
		rows.push(row);
		if (row[6] >= last) break;
	}
	return rows;
}

/** Group items by the day their date falls on. */
export function bucketByDay<T>(items: T[], dateOf: (item: T) => string, timeZone: string): Map<DayKey, T[]> {
	const out = new Map<DayKey, T[]>();
	for (const item of items) {
		const key = dayKeyOf(dateOf(item), timeZone);
		const list = out.get(key);
		if (list) list.push(item);
		else out.set(key, [item]);
	}
	return out;
}

/** The new dates when a task is dropped on `target`: the due date moves there and the start date by the same number of days. */
export function rescheduled(
	task: { dueDate?: string | null; startDate?: string | null },
	target: DayKey,
	timeZone: string
): { dueDate: string; startDate?: string } {
	const out: { dueDate: string; startDate?: string } = {
		dueDate: moveToDay(task.dueDate as string, target, timeZone).toISOString()
	};
	if (task.startDate && task.dueDate) {
		const delta = diffDaysKey(dayKeyOf(task.dueDate, timeZone), target);
		out.startDate = moveToDay(
			task.startDate,
			addDaysKey(dayKeyOf(task.startDate, timeZone), delta),
			timeZone
		).toISOString();
	}
	return out;
}
