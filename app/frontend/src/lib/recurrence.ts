import { get } from 'svelte/store';
import { fmt, tr } from '$lib/i18n';
import { showToast } from '$lib/toast';
import type { Task } from '$lib/types';

/**
 * Completing a repeating task does not leave it done: the server reopens it with the next due date,
 * unless its series has ended (last counted occurrence, or no date left before its end date).
 * When either just happened, say so and return true (the caller then skips its generic "saved" message).
 */
export function announceRecurrence(
	requestedStatus: unknown,
	before: string | null | undefined,
	updated: Task
): boolean {
	if (requestedStatus !== 'done' || before === 'done') return false;
	if (!updated.repeatAfter) return false;
	if (updated.status === 'done') {
		showToast(tr('tasks.repeat.finished'), 'success', 5000);
		return true;
	}
	if (!updated.dueDate) return false;
	showToast(tr('tasks.repeat.nextCycle', { date: get(fmt).date(updated.dueDate) }), 'success', 5000);
	return true;
}
