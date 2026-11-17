import { describe, expect, it } from 'vitest';
import { cleanCriteria, criteriaToQuery, describeCriteria, needsClientDueFilter } from './filters';

const NOW = new Date(2026, 2, 10, 15, 30); // Tue 10 Mar 2026, local time
const q = (c: Parameters<typeof criteriaToQuery>[0]) => Object.fromEntries(criteriaToQuery(c, NOW));

describe('criteriaToQuery', () => {
	it('sends nothing for empty criteria', () => {
		expect(q({})).toEqual({});
	});

	it('maps the plain fields', () => {
		expect(q({ status: 'open', priority: 3, projectId: 7, search: '  rent ', hideDone: true })).toEqual({
			status: 'open',
			priority: '3',
			projectId: '7',
			search: 'rent',
			excludeDone: 'true'
		});
	});

	it('keeps priority 0 (it is a value, not "unset")', () => {
		expect(q({ priority: 0 })).toEqual({ priority: '0' });
	});

	it('overdue: before now, finished tasks excluded', () => {
		expect(q({ due: 'overdue' })).toEqual({ dueBefore: NOW.toISOString(), excludeDone: 'true' });
	});

	it('today: from local midnight to the last millisecond of today', () => {
		const r = q({ due: 'today' });
		expect(r.dueAfter).toBe(new Date(2026, 2, 10, 0, 0, 0).toISOString());
		expect(r.dueBefore).toBe(new Date(2026, 2, 10, 23, 59, 59, 999).toISOString());
	});

	it('week and month: today through the end of day 7 / 30', () => {
		expect(q({ due: 'week' }).dueBefore).toBe(new Date(2026, 2, 17, 23, 59, 59, 999).toISOString());
		expect(q({ due: 'month' }).dueBefore).toBe(new Date(2026, 3, 9, 23, 59, 59, 999).toISOString());
	});

	it('"no due date" has no server parameter and is filtered by the caller', () => {
		expect(q({ due: 'none' })).toEqual({});
		expect(needsClientDueFilter({ due: 'none' })).toBe(true);
		expect(needsClientDueFilter({ due: 'week' })).toBe(false);
		expect(needsClientDueFilter({})).toBe(false);
	});
});

describe('cleanCriteria', () => {
	it('drops empty values so the backend (which rejects unknown keys) only gets real ones', () => {
		expect(
			cleanCriteria({
				status: undefined,
				priority: Number.NaN,
				projectId: null as never,
				search: '   ',
				hideDone: false
			})
		).toEqual({});
	});

	it('keeps meaningful values, including priority 0, and trims the search', () => {
		expect(cleanCriteria({ priority: 0, search: ' x ', due: 'week', hideDone: true, projectId: 4 })).toEqual({
			priority: 0,
			search: 'x',
			due: 'week',
			hideDone: true,
			projectId: 4
		});
	});
});

describe('describeCriteria', () => {
	it('is empty without criteria', () => {
		expect(describeCriteria(null)).toEqual([]);
		expect(describeCriteria({})).toEqual([]);
	});

	it('gives one readable chip per restriction', () => {
		const chips = describeCriteria({ status: 'open', due: 'week', hideDone: true, search: 'rent' });
		expect(chips).toHaveLength(4);
		expect(chips.join(' ')).toMatch(/rent/);
	});
});
