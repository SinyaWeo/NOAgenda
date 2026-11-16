import { describe, expect, it } from 'vitest';
import { dateInputToIso, isoToDateInput } from './dates';

// (this project's tsconfig has no Node types; the test runner is Node, so reach process through globalThis)
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

describe('date-only form values', () => {
	for (const tz of ['America/Los_Angeles', 'Europe/Prague', 'Pacific/Auckland', 'UTC']) {
		it(`round-trips the picked calendar day in ${tz}`, () => {
			env.TZ = tz;
			for (const day of ['2026-11-16', '2026-01-01', '2026-12-31', '2028-02-29']) {
				const iso = dateInputToIso(day)!;
				expect(isoToDateInput(iso), `${day} in ${tz}`).toBe(day);
			}
		});
	}
	it('handles empty and invalid input', () => {
		expect(dateInputToIso('')).toBeNull();
		expect(dateInputToIso(undefined)).toBeNull();
		expect(dateInputToIso('garbage')).toBeNull();
		expect(isoToDateInput(null)).toBe('');
		expect(isoToDateInput('nope')).toBe('');
	});
});
