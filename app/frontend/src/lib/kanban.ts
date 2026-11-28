import type { KanbanBucket, NodeStatus, Task } from './types';

/** The statuses every project keeps a bucket for, in board order. */
export const BUCKET_STATUSES: NodeStatus[] = ['open', 'in_progress', 'done'];

/**
 * The bucket a task shows in: the one it was placed in while that bucket still stands for the task's
 * status, otherwise the first bucket (by position) with the task's status. Null for a task without a
 * status (the board shows it in its "No status" column) or when the project has no bucket for that status.
 */
export function effectiveBucketId(
	task: Pick<Task, 'bucketId' | 'status'>,
	buckets: KanbanBucket[]
): number | null {
	const status = task.status;
	if (status == null) return null;
	const placed = task.bucketId != null ? buckets.find((b) => b.id === task.bucketId) : undefined;
	if (placed && placed.status === status) return placed.id;
	const first = [...buckets]
		.sort((a, b) => a.position - b.position || a.id - b.id)
		.find((b) => b.status === status);
	return first?.id ?? null;
}

/** Whether removing this bucket (or changing its status) would leave its status without a column. */
export function isLastOfStatus(bucket: KanbanBucket, buckets: KanbanBucket[]): boolean {
	return buckets.filter((b) => b.status === bucket.status).length <= 1;
}
