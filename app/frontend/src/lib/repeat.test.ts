import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('#lib/i18n/index.js', () => ({
	locale: { current: 'en' },
	fmt: { date: (d: string) => `D(${d})` },
	t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key)
}));

import {
	describeRepeat,
	emptyRepeat,
	formFromTask,
	parseWeekdays,
	repeatPayload,
	toggleWeekday,
	weekdayName
} from './repeat';

const ZONE = 'Europe/Prague';

describe('repeat form', () => {
	beforeEach(() => vi.clearAllMocks());

	it('a task that does not repeat gives the empty form, and clearing sends nulls for every field', () => {
		expect(formFromTask({ repeatAfter: null }, ZONE)).toEqual(emptyRepeat());
		expect(formFromTask({ repeatAfter: 0, repeatMode: 'weekly' }, ZONE)).toEqual(emptyRepeat());
		expect(repeatPayload(emptyRepeat(), ZONE)).toEqual({
			repeatAfter: null,
			repeatMode: null,
			repeatWeekdays: null,
			repeatUntil: null,
			repeatCount: null,
			repeatResetSubtasks: true
		});
	});

	it('reads a weekly task with an end date and writes the same rule back', () => {
		const form = formFromTask(
			{
				repeatAfter: 2,
				repeatMode: 'weekly',
				repeatWeekdays: '5,1,3',
				repeatUntil: '2030-12-31T11:00:00.000Z', // noon in Prague
				repeatCount: null
			},
			ZONE
		);
		expect(form).toMatchObject({
			kind: 'weekly',
			every: 2,
			weekdays: [1, 3, 5],
			end: 'until',
			until: '2030-12-31'
		});
		const payload = repeatPayload(form, ZONE);
		expect(payload).toMatchObject({
			repeatAfter: 2,
			repeatMode: 'weekly',
			repeatWeekdays: '1,3,5',
			repeatCount: null
		});
		expect(payload.repeatUntil).toBe('2030-12-31T11:00:00.000Z');
	});

	it('resets subtasks unless the task opts out, and sends the choice back', () => {
		expect(formFromTask({ repeatAfter: 1 }, ZONE).resetSubtasks).toBe(true);
		const form = formFromTask({ repeatAfter: 1, repeatResetSubtasks: false }, ZONE);
		expect(form.resetSubtasks).toBe(false);
		expect(repeatPayload(form, ZONE).repeatResetSubtasks).toBe(false);
		expect(repeatPayload({ ...form, kind: 'none' }, ZONE).repeatResetSubtasks).toBe(true);
	});

	it('a count wins over an end date, and unknown or missing modes read as plain days', () => {
		expect(
			formFromTask(
				{
					repeatAfter: 3,
					repeatMode: 'default',
					repeatCount: 4,
					repeatUntil: '2030-01-01T00:00:00Z'
				},
				ZONE
			)
		).toMatchObject({
			end: 'count',
			count: 4
		});
		expect(formFromTask({ repeatAfter: 3, repeatMode: 'someday' }, ZONE).kind).toBe('default');
		expect(formFromTask({ repeatAfter: 3, repeatMode: null }, ZONE).kind).toBe('default');
	});

	it('only the weekly rule sends weekdays, and the interval is a whole number of at least 1', () => {
		const form = { ...emptyRepeat(), kind: 'monthly' as const, every: 0, weekdays: [1, 2] };
		expect(repeatPayload(form, ZONE)).toMatchObject({ repeatAfter: 1, repeatWeekdays: null });
		expect(repeatPayload({ ...form, kind: 'weekly', every: 2.7 }, ZONE)).toMatchObject({
			repeatAfter: 2,
			repeatWeekdays: '1,2'
		});
		expect(repeatPayload({ ...form, end: 'count', count: 0 }, ZONE).repeatCount).toBe(1);
	});

	it('weekday helpers', () => {
		expect(parseWeekdays('3,x,1,3,9')).toEqual([1, 3]);
		expect(toggleWeekday([1, 5], 3)).toEqual([1, 3, 5]);
		expect(toggleWeekday([1, 3, 5], 3)).toEqual([1, 5]);
		expect(weekdayName(1)).toBe('Mon');
		expect(weekdayName(7, 'long')).toBe('Sunday');
	});

	it('describes the rule, naming the weekdays and the end', () => {
		expect(describeRepeat({ repeatAfter: null })).toBe('');
		expect(describeRepeat({ repeatAfter: 2, repeatMode: 'weekly', repeatWeekdays: '1,3' })).toBe(
			'tasks.repeat.summary.weeklyOn:{"count":2,"days":"Mon, Wed"}'
		);
		expect(describeRepeat({ repeatAfter: 1, repeatMode: 'month_end', repeatCount: 3 })).toBe(
			'tasks.repeat.summary.monthEnd:{"count":1} · tasks.repeat.summary.left:{"count":3}'
		);
		expect(
			describeRepeat({ repeatAfter: 1, repeatMode: 'default', repeatUntil: '2030-01-01T00:00:00Z' })
		).toBe(
			'tasks.repeat.summary.daily:{"count":1} · tasks.repeat.summary.until:{"date":"D(2030-01-01T00:00:00Z)"}'
		);
	});
});
