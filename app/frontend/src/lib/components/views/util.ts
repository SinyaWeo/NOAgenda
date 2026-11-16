import type { Task } from '$lib/types';

/** Due in the past and not done. */
export function isOverdue(task: Task): boolean {
	return !!task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
}
