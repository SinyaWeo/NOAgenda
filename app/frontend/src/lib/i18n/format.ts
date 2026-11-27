import type { Locale } from './core';

/**
 * Date and number formatting for a locale and an (optional) IANA time zone. The zone comes from the
 * user's saved setting, so a task due "Nov 16" reads the same wherever the browser happens to be.
 * Plain functions: the reactive wrapper lives in ./index.ts.
 */
export interface Formatters {
	/** 16. 11. 2026 / 11/16/2026 */
	date(value: string | Date | null | undefined): string;
	/** Date and time. */
	dateTime(value: string | Date | null | undefined): string;
	/** Long date with weekday, e.g. "Monday, November 16, 2026". */
	dateLong(value?: string | Date | null): string;
	number(value: number | null | undefined): string;
	/** Short weekday name of a calendar day given as a UTC-noon Date (see lib/calendar.ts keyToDate): "Mon". */
	weekdayShort(day: Date): string;
	/** Month and year of such a day: "November 2026". */
	monthYear(day: Date): string;
}

function toDate(v: string | Date | null | undefined): Date | null {
	if (!v) return null;
	const d = v instanceof Date ? v : new Date(v);
	return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * A zone to format in, or undefined for "the browser's own".
 * - An unknown/typo'd zone must never break rendering.
 * - The saved zone is used as it is, 'UTC' included: the backend works out repeat dates in the same zone, so
 *   both must agree on which day a date falls on. No saved zone means the browser's.
 */
function safeZone(timeZone: string | undefined): string | undefined {
	if (!timeZone) return undefined;
	try {
		new Intl.DateTimeFormat('en', { timeZone });
		return timeZone;
	} catch {
		return undefined;
	}
}

export function makeFormatters(locale: Locale, timeZone?: string): Formatters {
	const tz = safeZone(timeZone);
	const date = new Intl.DateTimeFormat(locale, { timeZone: tz, dateStyle: 'medium' });
	const dateTime = new Intl.DateTimeFormat(locale, { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' });
	const dateLong = new Intl.DateTimeFormat(locale, {
		timeZone: tz,
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
	const num = new Intl.NumberFormat(locale);
	// Calendar days are plain dates, not instants: format them in UTC so no zone can move them.
	const weekday = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' });
	const monthYear = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long', year: 'numeric' });
	return {
		date: (v) => {
			const d = toDate(v);
			return d ? date.format(d) : '';
		},
		dateTime: (v) => {
			const d = toDate(v);
			return d ? dateTime.format(d) : '';
		},
		dateLong: (v) => dateLong.format(toDate(v) ?? new Date()),
		number: (v) => (v === null || v === undefined ? '' : num.format(v)),
		weekdayShort: (day) => weekday.format(day),
		monthYear: (day) => monthYear.format(day)
	};
}
