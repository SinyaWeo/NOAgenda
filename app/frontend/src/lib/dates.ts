/**
 * Date-only form fields ("2026-11-16") <-> the ISO timestamps the API stores.
 *
 * `new Date('2026-11-16')` is midnight UTC, which `toLocaleDateString()` shows as the PREVIOUS
 * day west of UTC. Use local noon instead: the same calendar day everywhere (±12h), and reading
 * it back with local date parts gives the day the user picked.
 */
export function dateInputToIso(value: string | null | undefined): string | null {
	if (!value) return null;
	const [y, m, d] = value.split('-').map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

export function isoToDateInput(iso: string | null | undefined): string {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
