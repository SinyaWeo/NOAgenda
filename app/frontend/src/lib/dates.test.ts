import { describe, expect, it } from 'vitest';
import { addDays, dateInputToIso, diffDays, isoToDateInput, startOfDay } from './dates';

// (this project's tsconfig has no Node types; the test runner is Node, so reach process through globalThis)
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

describe('date-only form values', () => {
	const ZONES = [
		'America/Los_Angeles',
		'Europe/Prague',
		'Pacific/Auckland',
		'Pacific/Kiritimati',
		'Pacific/Pago_Pago',
		'UTC'
	];
	for (const browser of ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Europe/Prague']) {
		for (const profile of ZONES) {
			it(`round-trips the picked day in profile zone ${profile} with the browser in ${browser}`, () => {
				env.TZ = browser;
				for (const day of ['2026-11-16', '2026-01-01', '2026-12-31', '2028-02-29', '2026-03-29']) {
					const iso = dateInputToIso(day, profile)!;
					expect(isoToDateInput(iso, profile), `${day} in ${profile}`).toBe(day);
				}
			});
		}
	}
	it('stores noon of the picked day in the profile zone, whatever the browser zone', () => {
		env.TZ = 'Pacific/Kiritimati'; // UTC+14
		expect(dateInputToIso('2026-03-10', 'America/Los_Angeles')).toBe('2026-03-10T19:00:00.000Z');
		expect(dateInputToIso('2026-03-10', 'UTC')).toBe('2026-03-10T12:00:00.000Z');
		env.TZ = 'Pacific/Pago_Pago'; // UTC-11
		expect(dateInputToIso('2026-03-10', 'Pacific/Kiritimati')).toBe('2026-03-09T22:00:00.000Z');
	});
	it('handles empty and invalid input', () => {
		expect(dateInputToIso('', 'UTC')).toBeNull();
		expect(dateInputToIso(undefined, 'UTC')).toBeNull();
		expect(dateInputToIso('garbage', 'UTC')).toBeNull();
		expect(isoToDateInput(null, 'UTC')).toBe('');
		expect(isoToDateInput('nope', 'UTC')).toBe('');
	});
});

describe('day math', () => {
	it('counts calendar days across DST changes', () => {
		env.TZ = 'Europe/Prague';
		expect(diffDays(new Date(2026, 2, 28), new Date(2026, 2, 30))).toBe(2);
		expect(diffDays(new Date(2026, 9, 24), new Date(2026, 9, 26))).toBe(2);
		expect(diffDays(new Date(2026, 5, 2), new Date(2026, 5, 1))).toBe(-1);
	});
	it('adds days over month ends', () => {
		expect(addDays(new Date(2026, 0, 31), 1).getMonth()).toBe(1);
		expect(startOfDay('2026-11-16T15:30:00').getHours()).toBe(0);
	});
});
