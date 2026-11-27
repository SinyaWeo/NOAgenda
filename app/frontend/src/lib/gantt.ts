import { addDaysKey, dayKeyOf, diffDaysKey, moveToDay, noonOn, type DayKey } from '#lib/calendar.js';
import type { RelationKind } from '#lib/types.js';

/**
 * Gantt scheduling logic, kept free of the DOM so it can be tested. Everything works in calendar days
 * (DayKey, "2026-12-01") of the user's profile zone, like the date fields and the calendar.
 *
 * A dependency A -> B means "B cannot start before A is finished": B has to start on a later day than A ends.
 */

/** One arrow, as GET /gantt returns it. */
export interface GanttDependency {
	fromId: number;
	toId: number;
	/** The relation rows behind it; removing the arrow removes all of them. */
	rows: { taskId: number; kind: RelationKind; relatedTaskId: number }[];
}

export interface GanttData {
	dependencies: GanttDependency[];
	/** Tasks the signed-in user may move and link. */
	editable: number[];
}

/** The days a bar covers, both ends included. */
export interface Span {
	start: DayKey;
	end: DayKey;
}

export type DragMode = 'move' | 'start' | 'end';

interface Dated {
	id: number;
	startDate?: string | null;
	dueDate?: string | null;
}

/** New dates for one task, as POST /tasks/schedule takes them. */
export interface DateChange {
	id: number;
	startDate: string | null;
	dueDate: string | null;
}

/** The days a task covers, or null when it has no dates (it is then not on the chart). */
export function spanOf(task: Dated, timeZone: string): Span | null {
	const first = task.startDate ?? task.dueDate;
	const last = task.dueDate ?? task.startDate;
	if (!first || !last) return null;
	const a = dayKeyOf(first, timeZone);
	const b = dayKeyOf(last, timeZone);
	return a <= b ? { start: a, end: b } : { start: b, end: a };
}

/** A span after dragging by `days`: the whole bar, or one end (which never crosses the other). */
export function dragSpan(span: Span, days: number, mode: DragMode): Span {
	if (mode === 'move') return { start: addDaysKey(span.start, days), end: addDaysKey(span.end, days) };
	if (mode === 'start') {
		const start = addDaysKey(span.start, days);
		return { start: start > span.end ? span.end : start, end: span.end };
	}
	const end = addDaysKey(span.end, days);
	return { start: span.start, end: end < span.start ? span.start : end };
}

/** Moves a span so it starts on `start`, keeping its length. */
function startingOn(span: Span, start: DayKey): Span {
	return { start, end: addDaysKey(span.end, diffDaysKey(span.start, start)) };
}

/**
 * The task's dates for a new span. Existing dates keep their time of day; a date the task did not have
 * yet (stretching a task that only had a due date) is set to noon, as the date fields do.
 */
export function datesFor(task: Dated, span: Span, timeZone: string): DateChange {
	const at = (value: string | null | undefined, key: DayKey) =>
		(value ? moveToDay(value, key, timeZone) : noonOn(key, timeZone)).toISOString();
	const oneDay = span.start === span.end;
	if (task.startDate && task.dueDate) {
		return { id: task.id, startDate: at(task.startDate, span.start), dueDate: at(task.dueDate, span.end) };
	}
	if (task.dueDate) {
		return {
			id: task.id,
			startDate: oneDay ? null : at(null, span.start),
			dueDate: at(task.dueDate, span.end)
		};
	}
	return {
		id: task.id,
		startDate: at(task.startDate, span.start),
		dueDate: oneDay ? null : at(null, span.end)
	};
}

export interface CascadeResult {
	/** New spans of every task that moves (the changed ones and the dependents pushed by them). */
	moved: Map<number, Span>;
	/** Dependents that would have to move but cannot (not editable, or the task being dragged itself). */
	blocked: number[];
}

/**
 * Push dependents out of the way: whenever A -> B and B starts on or before the day A ends, B moves to
 * start the day after A ends (keeping its length), and so on down the chain. Tasks without a span are
 * not on the chart and are left alone. Safe on data that loops.
 */
export function cascade(
	spans: ReadonlyMap<number, Span>,
	dependencies: readonly GanttDependency[],
	changed: ReadonlyMap<number, Span>,
	editable: ReadonlySet<number>
): CascadeResult {
	const moved = new Map(changed);
	const blocked = new Set<number>();
	const out = new Map<number, number[]>();
	for (const d of dependencies) out.set(d.fromId, [...(out.get(d.fromId) ?? []), d.toId]);
	const queue = [...changed.keys()];
	for (let guard = 0; queue.length && guard < 10000; guard++) {
		const a = queue.shift() as number;
		const sa = moved.get(a) ?? spans.get(a);
		if (!sa) continue;
		for (const b of out.get(a) ?? []) {
			const sb = moved.get(b) ?? spans.get(b);
			if (!sb || sb.start > sa.end) continue;
			if (!editable.has(b) || changed.has(b)) {
				blocked.add(b);
				continue;
			}
			moved.set(b, startingOn(sb, addDaysKey(sa.end, 1)));
			queue.push(b);
		}
	}
	return { moved, blocked: [...blocked] };
}

/** True when B starts on or before the day A ends (the arrow is drawn in red). */
export function violated(from: Span, to: Span): boolean {
	return to.start <= from.end;
}

/** Would adding "from -> to" make a loop with the dependencies we know? (The server checks again.) */
export function wouldCycle(dependencies: readonly GanttDependency[], fromId: number, toId: number): boolean {
	if (fromId === toId) return true;
	const seen = new Set([toId]);
	const queue = [toId];
	while (queue.length) {
		const cur = queue.shift() as number;
		for (const d of dependencies) {
			if (d.fromId !== cur) continue;
			if (d.toId === fromId) return true;
			if (!seen.has(d.toId)) {
				seen.add(d.toId);
				queue.push(d.toId);
			}
		}
	}
	return false;
}
