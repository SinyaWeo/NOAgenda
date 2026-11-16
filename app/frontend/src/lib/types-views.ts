import type { NodeStatus } from '$lib/types';

/** The view modes of the global task list page. */
export type TaskViewMode = 'list' | 'kanban' | 'table' | 'gantt';

export interface KanbanColumn {
	key: NodeStatus;
	label: string;
}

/** Callback a view calls when the user changes a task's status. */
export type StatusChangeHandler = (taskId: number, status: NodeStatus) => void | Promise<void>;
/** Callback a kanban board calls when a task is dropped into / selected for another bucket. */
export type BucketMoveHandler = (taskId: number, bucketId: number) => void | Promise<void>;

/** A project as offered in a select (id + display name). */
export interface ProjectOption {
	id: number;
	name: string;
}
