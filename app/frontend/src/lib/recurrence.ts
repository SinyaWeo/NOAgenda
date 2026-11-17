import { get } from 'svelte/store';
import { fmt, tr } from '$lib/i18n';
import { showToast } from '$lib/toast';
import type { Task } from '$lib/types';

/**
 * Completing a repeating task does not leave it done: the server reopens it with the next due date.
 * When that just happened, say so and return true (the caller then skips its generic "saved" message).
 */
export function announceRecurrence(
	requestedStatus: unknown,
	before: string | null | undefined,
	updated: Task
): boolean {
	if (requestedStatus !== 'done' || before === 'done' || updated.status === 'done') return false;
	if (!updated.repeatAfter || !updated.dueDate) return false;
	showToast(tr('tasks.repeat.nextCycle', { date: get(fmt).date(updated.dueDate) }), 'success', 5000);
	return true;
}
