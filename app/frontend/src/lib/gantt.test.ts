import { describe, expect, it } from 'vitest';
import {
	cascade,
	datesFor,
	dragSpan,
	spanOf,
	violated,
	wouldCycle,
	type GanttDependency,
	type Span
} from './gantt';

const TZ = 'Europe/Prague';
const dep = (fromId: number, toId: number): GanttDependency => ({
	fromId,
	toId,
	rows: [{ taskId: fromId, kind: 'blocks', relatedTaskId: toId }]
});
const span = (start: string, end: string): Span => ({ start, end });

describe('spanOf', () => {
	it('uses the calendar days of the profile zone, with either date alone as a one-day bar', () => {
		// 23:30 UTC on Dec 1 is already Dec 2 in Prague.
		expect(spanOf({ id: 1, startDate: '2026-12-01T23:30:00Z', dueDate: '2026-12-04T11:00:00Z' }, TZ)).toEqual(
			span('2026-12-02', '2026-12-04')
		);
		expect(spanOf({ id: 1, dueDate: '2026-12-04T11:00:00Z' }, TZ)).toEqual(span('2026-12-04', '2026-12-04'));
		expect(spanOf({ id: 1, startDate: '2026-12-04T11:00:00Z' }, TZ)).toEqual(
			span('2026-12-04', '2026-12-04')
		);
		expect(spanOf({ id: 1 }, TZ)).toBeNull();
	});

	it('puts swapped dates in order', () => {
		expect(spanOf({ id: 1, startDate: '2026-12-09T11:00:00Z', dueDate: '2026-12-04T11:00:00Z' }, TZ)).toEqual(
			span('2026-12-04', '2026-12-09')
		);
	});
});

describe('dragSpan', () => {
	const s = span('2026-12-28', '2027-01-02');
	it('moves the whole bar across a year end', () => {
		expect(dragSpan(s, 5, 'move')).toEqual(span('2027-01-02', '2027-01-07'));
		expect(dragSpan(s, -3, 'move')).toEqual(span('2026-12-25', '2026-12-30'));
	});
	it('resizes one end, never past the other', () => {
		expect(dragSpan(s, -2, 'start')).toEqual(span('2026-12-26', '2027-01-02'));
		expect(dragSpan(s, 30, 'start')).toEqual(span('2027-01-02', '2027-01-02'));
		expect(dragSpan(s, 3, 'end')).toEqual(span('2026-12-28', '2027-01-05'));
		expect(dragSpan(s, -30, 'end')).toEqual(span('2026-12-28', '2026-12-28'));
	});
});

describe('datesFor', () => {
	it('keeps the time of day of existing dates', () => {
		const task = { id: 7, startDate: '2026-12-01T08:15:00Z', dueDate: '2026-12-03T16:45:00Z' };
		expect(datesFor(task, span('2026-12-05', '2026-12-08'), TZ)).toEqual({
			id: 7,
			startDate: '2026-12-05T08:15:00.000Z',
			dueDate: '2026-12-08T16:45:00.000Z'
		});
	});

	it('a task with only a due date gets a start (noon) once it spans several days, and none for one day', () => {
		const task = { id: 7, dueDate: '2026-12-03T16:45:00Z' };
		expect(datesFor(task, span('2026-12-04', '2026-12-04'), TZ)).toEqual({
			id: 7,
			startDate: null,
			dueDate: '2026-12-04T16:45:00.000Z'
		});
		expect(datesFor(task, span('2026-12-01', '2026-12-03'), TZ)).toEqual({
			id: 7,
			startDate: '2026-12-01T11:00:00.000Z', // noon in Prague
			dueDate: '2026-12-03T16:45:00.000Z'
		});
	});

	it('a task with only a start date gets a due date once it spans several days', () => {
		const task = { id: 7, startDate: '2026-12-03T09:00:00Z' };
		expect(datesFor(task, span('2026-12-03', '2026-12-05'), TZ)).toEqual({
			id: 7,
			startDate: '2026-12-03T09:00:00.000Z',
			dueDate: '2026-12-05T11:00:00.000Z'
		});
	});
});

describe('cascade', () => {
	// 1 -> 2 -> 3, and 2 -> 4
	const deps = [dep(1, 2), dep(2, 3), dep(2, 4)];
	const spans = new Map<number, Span>([
		[1, span('2026-12-01', '2026-12-03')],
		[2, span('2026-12-05', '2026-12-06')],
		[3, span('2026-12-08', '2026-12-10')],
		[4, span('2026-12-20', '2026-12-21')]
	]);
	const all = new Set([1, 2, 3, 4]);

	it('pushes dependents down the chain by just enough, keeping their length', () => {
		const r = cascade(spans, deps, new Map([[1, span('2026-12-04', '2026-12-07')]]), all);
		expect(Object.fromEntries(r.moved)).toEqual({
			1: span('2026-12-04', '2026-12-07'),
			2: span('2026-12-08', '2026-12-09'),
			3: span('2026-12-10', '2026-12-12')
			// 4 still starts after 2 ends: untouched
		});
		expect(r.blocked).toEqual([]);
	});

	it('leaves dependents alone when there is room, and never pulls them earlier', () => {
		const r = cascade(spans, deps, new Map([[1, span('2026-11-20', '2026-11-22')]]), all);
		expect([...r.moved.keys()]).toEqual([1]);
	});

	it('reports dependents it may not move instead of moving them', () => {
		const r = cascade(spans, deps, new Map([[1, span('2026-12-04', '2026-12-07')]]), new Set([1, 3, 4]));
		expect([...r.moved.keys()]).toEqual([1]);
		expect(r.blocked).toEqual([2]);
	});

	it('skips dependents that are not on the chart, and survives data that loops', () => {
		const looping = [dep(1, 2), dep(2, 1), dep(1, 9)];
		const r = cascade(spans, looping, new Map([[1, span('2026-12-05', '2026-12-06')]]), all);
		expect(r.moved.get(2)).toEqual(span('2026-12-07', '2026-12-08'));
		expect(r.blocked).toEqual([1]); // the loop comes back to the dragged task, which stays where it was put
	});
});

describe('violated and wouldCycle', () => {
	it('an arrow is broken when the dependent starts on or before the day its predecessor ends', () => {
		expect(violated(span('2026-12-01', '2026-12-03'), span('2026-12-04', '2026-12-05'))).toBe(false);
		expect(violated(span('2026-12-01', '2026-12-03'), span('2026-12-03', '2026-12-05'))).toBe(true);
	});

	it('finds loops through the chain', () => {
		const deps = [dep(1, 2), dep(2, 3)];
		expect(wouldCycle(deps, 3, 1)).toBe(true);
		expect(wouldCycle(deps, 2, 1)).toBe(true);
		expect(wouldCycle(deps, 1, 3)).toBe(false);
		expect(wouldCycle(deps, 4, 4)).toBe(true);
	});
});
