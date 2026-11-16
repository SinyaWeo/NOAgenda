import type { FilterCriteria } from '$lib/types';
import { tr } from '$lib/i18n/translate';
import type { MessageKey } from '$lib/i18n/messages';

/** Midnight (local time) at the start of the day that contains `d`. */
function startOfDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Last millisecond of the local day that is `days` days after the day of `d`. */
function endOfDayPlus(d: Date, days: number): Date {
	const s = startOfDay(d);
	return new Date(s.getFullYear(), s.getMonth(), s.getDate() + days, 23, 59, 59, 999);
}

/**
 * Map saved-filter criteria to GET /tasks query parameters.
 *
 * `due: 'none'` (tasks WITHOUT a due date) has no server parameter, so nothing is added for it
 * here: callers must request the list and keep only the tasks with `!dueDate` themselves
 * (see `needsClientDueFilter`). Sorting and paging are the caller's business.
 */
export function criteriaToQuery(criteria: FilterCriteria, now: Date = new Date()): URLSearchParams {
	const q = new URLSearchParams();
	if (criteria.status) q.set('status', criteria.status);
	if (criteria.priority !== undefined && criteria.priority !== null)
		q.set('priority', String(criteria.priority));
	if (criteria.projectId !== undefined && criteria.projectId !== null)
		q.set('projectId', String(criteria.projectId));
	if (criteria.search && criteria.search.trim()) q.set('search', criteria.search.trim());
	if (criteria.hideDone) q.set('excludeDone', 'true');
	switch (criteria.due) {
		case 'overdue':
			q.set('dueBefore', now.toISOString());
			q.set('excludeDone', 'true');
			break;
		case 'today':
			q.set('dueAfter', startOfDay(now).toISOString());
			q.set('dueBefore', endOfDayPlus(now, 0).toISOString());
			break;
		case 'week':
			q.set('dueAfter', startOfDay(now).toISOString());
			q.set('dueBefore', endOfDayPlus(now, 7).toISOString());
			break;
		case 'month':
			q.set('dueAfter', startOfDay(now).toISOString());
			q.set('dueBefore', endOfDayPlus(now, 30).toISOString());
			break;
		default:
			break; // 'none' is filtered client-side; undefined means no due restriction
	}
	return q;
}

/** True when the criteria cannot be fully expressed as server params (tasks without a due date). */
export function needsClientDueFilter(criteria: FilterCriteria): boolean {
	return criteria.due === 'none';
}

/** Translated text for a dynamic key; unknown values (e.g. a status added later) fall back to the raw value. */
function lookup(key: string, fallback: string): string {
	const text = tr(key as MessageKey);
	return text === key ? fallback : text;
}

/**
 * Short human-readable chips for the criteria (in the current language; pass the `$t` store value as the second
 * argument from a template so the chips are recomputed when the language changes), e.g. ["Status: Open", "Due: this week"]. */
export function describeCriteria(
	c: FilterCriteria | null | undefined,
	_languageDependency?: unknown
): string[] {
	if (!c) return [];
	const chips: string[] = [];
	if (c.status)
		chips.push(tr('filters.chip.status', { value: lookup(`common.status.${c.status}`, c.status) }));
	if (c.priority !== undefined && c.priority !== null)
		chips.push(
			tr('filters.chip.priority', { value: lookup(`common.priority.${c.priority}`, String(c.priority)) })
		);
	if (c.projectId !== undefined && c.projectId !== null)
		chips.push(tr('filters.chip.project', { id: c.projectId }));
	if (c.search && c.search.trim()) chips.push(tr('filters.chip.search', { value: c.search.trim() }));
	if (c.due) chips.push(tr('filters.chip.due', { value: lookup(`filters.due.${c.due}`, c.due) }));
	if (c.hideDone) chips.push(tr('filters.chip.hideDone'));
	return chips;
}

/** Drop empty values so only meaningful keys are sent to the backend (it rejects unknown keys). */
export function cleanCriteria(c: FilterCriteria): FilterCriteria {
	const out: FilterCriteria = {};
	if (c.status) out.status = c.status;
	if (c.priority !== undefined && c.priority !== null && !Number.isNaN(c.priority)) out.priority = c.priority;
	if (c.projectId !== undefined && c.projectId !== null && !Number.isNaN(c.projectId))
		out.projectId = c.projectId;
	if (c.search && c.search.trim()) out.search = c.search.trim();
	if (c.due) out.due = c.due;
	if (c.hideDone) out.hideDone = true;
	return out;
}
