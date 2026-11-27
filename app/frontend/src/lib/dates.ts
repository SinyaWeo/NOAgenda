import { dayKey, dayKeyOf, noonOn } from '#lib/calendar.js';

/**
 * Date-only form fields ("2026-11-16") <-> the ISO timestamps the API stores.
 *
 * A picked day is stored as noon of that day in the user's profile zone (`userTimeZone()`), and read back
 * in the same zone. The backend works out repeat dates ("same weekday", "until") in that zone too, so
 * both sides agree on the day even when the browser sits in a zone far away from the profile's.
 */
export function dateInputToIso(value: string | null | undefined, timeZone: string): string | null {
	if (!value) return null;
	const [y, m, d] = value.split('-').map(Number);
	if (!y || !m || !d) return null;
	return noonOn(dayKey(y, m, d), timeZone).toISOString();
}

export function isoToDateInput(iso: string | null | undefined, timeZone: string): string {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return dayKeyOf(d, timeZone);
}

/** Local midnight of the calendar day `value` falls on. */
export function startOfDay(value: string | Date): Date {
	const d = new Date(value);
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** `days` calendar days after `date` (DST-safe: works on date parts, not milliseconds). */
export function addDays(date: Date, days: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Whole calendar days from `a` to `b` (positive when b is later), ignoring time of day and DST. */
export function diffDays(a: Date, b: Date): number {
	return Math.round(
		(Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
			Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
			86400000
	);
}
