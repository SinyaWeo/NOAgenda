import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readable } from 'svelte/store';

const showToast = vi.fn();
vi.mock('$lib/toast', () => ({ showToast: (...a: unknown[]) => showToast(...a) }));
vi.mock('$lib/i18n', () => ({
	tr: (key: string, params?: Record<string, unknown>) => `${key}:${params?.date ?? ''}`,
	fmt: readable({ date: (d: string) => `D(${d})` })
}));

import { announceRecurrence } from './recurrence';
import type { Task } from './types';

const reopened = (over: Partial<Task> = {}) =>
	({ id: 1, status: 'open', repeatAfter: 7, dueDate: '2026-03-17T09:00:00Z', ...over }) as Task;

describe('announceRecurrence', () => {
	beforeEach(() => showToast.mockClear());

	it('says when a repeating task was completed and reopened, and tells the caller to skip its own message', () => {
		expect(announceRecurrence('done', 'open', reopened())).toBe(true);
		expect(showToast).toHaveBeenCalledWith('tasks.repeat.nextCycle:D(2026-03-17T09:00:00Z)', 'success', 5000);
	});

	it('stays silent when the task really is done (it does not repeat)', () => {
		expect(announceRecurrence('done', 'open', reopened({ status: 'done', repeatAfter: null }))).toBe(false);
		expect(showToast).not.toHaveBeenCalled();
	});

	it('stays silent for any other status change', () => {
		expect(announceRecurrence('in_progress', 'open', reopened())).toBe(false);
		expect(showToast).not.toHaveBeenCalled();
	});

	it('stays silent when it was already done before', () => {
		expect(announceRecurrence('done', 'done', reopened())).toBe(false);
	});

	it('stays silent for a non-repeating task or one without a due date to announce', () => {
		expect(announceRecurrence('done', 'open', reopened({ repeatAfter: null }))).toBe(false);
		expect(announceRecurrence('done', 'open', reopened({ dueDate: null }))).toBe(false);
		expect(showToast).not.toHaveBeenCalled();
	});
});
