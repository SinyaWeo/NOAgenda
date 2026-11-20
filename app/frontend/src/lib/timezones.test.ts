import { describe, it, expect } from 'vitest';
import { formatOffset, offsetMinutes, timeZoneOptions } from './timezones';

describe('time zones', () => {
	it('reads the offset in minutes, with daylight saving', () => {
		expect(offsetMinutes('UTC', new Date('2026-07-01T00:00:00Z'))).toBe(0);
		expect(offsetMinutes('Europe/Prague', new Date('2026-01-15T12:00:00Z'))).toBe(60);
		expect(offsetMinutes('Europe/Prague', new Date('2026-07-15T12:00:00Z'))).toBe(120);
		expect(offsetMinutes('Asia/Kolkata', new Date('2026-07-15T12:00:00Z'))).toBe(330);
		expect(offsetMinutes('America/New_York', new Date('2026-01-15T12:00:00Z'))).toBe(-300);
		expect(offsetMinutes('Mars/Olympus', new Date())).toBeNull();
	});

	it('formats offsets', () => {
		expect(formatOffset(0)).toBe('UTC+00:00');
		expect(formatOffset(330)).toBe('UTC+05:30');
		expect(formatOffset(-570)).toBe('UTC-09:30');
	});

	it('lists real zones with their offset, ordered by it, UTC included', () => {
		const options = timeZoneOptions('Europe/Prague', new Date('2026-01-15T12:00:00Z'));
		expect(options.find((o) => o.value === 'UTC')?.label).toBe('(UTC+00:00) UTC');
		expect(options.find((o) => o.value === 'Europe/Prague')?.label).toBe('(UTC+01:00) Europe/Prague');
		const offsets = options.map((o) => o.offsetMinutes);
		expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
		expect(new Set(options.map((o) => o.value)).size).toBe(options.length);
	});

	it('keeps the current value even when it is not in the list', () => {
		const odd = timeZoneOptions('Not/AZone').find((o) => o.value === 'Not/AZone');
		expect(odd?.label).toBe('Not/AZone');
	});
});
