import { describe, expect, it } from 'vitest';
import { makeFormatters } from './format';

describe('makeFormatters', () => {
	// 23:30 UTC on 16 Nov is already 17 Nov in Prague and still 16 Nov in Los Angeles.
	const instant = '2026-11-16T23:30:00Z';

	it('formats dates in the requested time zone', () => {
		expect(makeFormatters('en', 'Europe/Prague').date(instant)).toBe('Nov 17, 2026');
		expect(makeFormatters('en', 'America/Los_Angeles').date(instant)).toBe('Nov 16, 2026');
	});

	it('formats in the requested language', () => {
		expect(makeFormatters('cs', 'Europe/Prague').date(instant)).toBe('17. 11. 2026');
		expect(makeFormatters('cs', 'Europe/Prague').number(1234.5)).toBe('1 234,5');
		expect(makeFormatters('en').number(1234.5)).toBe('1,234.5');
	});

	it('gives an empty string for missing or invalid values instead of throwing', () => {
		const f = makeFormatters('en', 'UTC');
		expect(f.date(null)).toBe('');
		expect(f.date(undefined)).toBe('');
		expect(f.date('not a date')).toBe('');
		expect(f.dateTime('')).toBe('');
		expect(f.number(null)).toBe('');
	});

	it('survives an invalid time zone (falls back to the browser zone)', () => {
		expect(() => makeFormatters('en', 'Mars/Olympus').date(instant)).not.toThrow();
		expect(makeFormatters('en', 'Mars/Olympus').date(instant)).not.toBe('');
	});
});
