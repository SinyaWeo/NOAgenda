import { describe, expect, it } from 'vitest';
import {
	addDaysKey,
	bucketByDay,
	dayBounds,
	dayKeyOf,
	diffDaysKey,
	effectiveZone,
	monthGrid,
	moveToDay,
	noonOn,
	rescheduled,
	weekRow
} from './calendar';

describe('day keys', () => {
	it('shift and diff across month and year ends', () => {
		expect(addDaysKey('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDaysKey('2026-03-01', -1)).toBe('2026-02-28');
		expect(diffDaysKey('2026-03-28', '2026-03-30')).toBe(2);
		expect(diffDaysKey('2026-04-02', '2026-03-30')).toBe(-3);
	});
	it('are counted in the given zone', () => {
		const late = '2026-11-16T23:30:00Z';
		expect(dayKeyOf(late, 'UTC')).toBe('2026-11-16');
		expect(dayKeyOf(late, 'Europe/Prague')).toBe('2026-11-17');
		expect(dayKeyOf(late, 'America/Los_Angeles')).toBe('2026-11-16');
	});
	it('use the saved zone, UTC included, and the browser zone when none or an unknown one is saved', () => {
		expect(effectiveZone('Europe/Prague')).toBe('Europe/Prague');
		expect(effectiveZone('UTC')).toBe('UTC');
		expect(effectiveZone('Not/AZone')).toBe(effectiveZone(null));
		expect(effectiveZone(undefined)).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
	});
	it('noon of a day is counted in the zone', () => {
		expect(noonOn('2026-03-10', 'Pacific/Kiritimati').toISOString()).toBe('2026-03-09T22:00:00.000Z');
		expect(noonOn('2026-03-29', 'Europe/Prague').toISOString()).toBe('2026-03-29T10:00:00.000Z');
	});
});

describe('grids', () => {
	it('week rows start on the chosen weekday', () => {
		expect(weekRow('2026-11-18', 1)[0]).toBe('2026-11-16'); // Wed -> Monday
		expect(weekRow('2026-11-18', 0)[0]).toBe('2026-11-15'); // Sunday
		expect(weekRow('2026-11-16', 1)).toHaveLength(7);
	});
	it('month grids cover the whole month in complete weeks', () => {
		const g = monthGrid(2026, 11, 1);
		expect(g.every((r) => r.length === 7)).toBe(true);
		expect(g[0][0]).toBe('2026-10-26'); // Nov 1 2026 is a Sunday
		expect(g.flat()).toContain('2026-11-30');
		expect(g.at(-1)![6] >= '2026-11-30').toBe(true);
	});
	it('February 2027 starting on Monday needs only four rows', () => {
		expect(monthGrid(2027, 2, 1)).toHaveLength(4);
	});
	it('a month can need six rows', () => {
		expect(monthGrid(2026, 3, 1)).toHaveLength(6); // Mar 1 2026 is a Sunday
	});
});

describe('moving to another day', () => {
	it('keeps the time of day in the zone', () => {
		const out = moveToDay('2026-11-16T08:30:00Z', '2026-11-20', 'Europe/Prague');
		expect(out.toISOString()).toBe('2026-11-20T08:30:00.000Z');
	});
	it('keeps the local time across a clock change', () => {
		// 09:00 Prague on 2026-03-24 (+01:00) moved past 2026-03-29 (+02:00) is 09:00 local = 07:00Z
		const out = moveToDay('2026-03-24T08:00:00Z', '2026-03-31', 'Europe/Prague');
		expect(out.toISOString()).toBe('2026-03-31T07:00:00.000Z');
	});
	it('moves the start date by the same number of days', () => {
		const out = rescheduled(
			{ dueDate: '2026-11-16T09:00:00Z', startDate: '2026-11-14T09:00:00Z' },
			'2026-11-20',
			'UTC'
		);
		expect(out).toEqual({ dueDate: '2026-11-20T09:00:00.000Z', startDate: '2026-11-18T09:00:00.000Z' });
	});
	it('leaves out the start date when there is none', () => {
		expect(rescheduled({ dueDate: '2026-11-16T09:00:00Z' }, '2026-11-17', 'UTC')).toEqual({
			dueDate: '2026-11-17T09:00:00.000Z'
		});
	});
});

describe('bounds and buckets', () => {
	it('a day spans 23 hours when the clocks go forward', () => {
		const { start, end } = dayBounds('2026-03-29', 'Europe/Prague');
		expect(Math.round((end.getTime() + 1 - start.getTime()) / 3600000)).toBe(23);
	});
	it('buckets by day in the zone', () => {
		const m = bucketByDay(
			[{ d: '2026-11-16T23:30:00Z' }, { d: '2026-11-16T10:00:00Z' }],
			(x) => x.d,
			'Europe/Prague'
		);
		expect(m.get('2026-11-17')).toHaveLength(1);
		expect(m.get('2026-11-16')).toHaveLength(1);
	});
});
