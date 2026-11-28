import { describe, expect, it } from 'vitest';
import { effectiveBucketId, isLastOfStatus } from './kanban';
import type { KanbanBucket } from './types';

const b = (id: number, status: KanbanBucket['status'], position: number): KanbanBucket => ({
	id,
	title: `B${id}`,
	status,
	position
});
const buckets = [b(1, 'open', 1), b(2, 'open', 0), b(3, 'in_progress', 2), b(4, 'done', 3)];

describe('effectiveBucketId', () => {
	it('keeps a task in the bucket it was placed in while the status matches', () => {
		expect(effectiveBucketId({ bucketId: 1, status: 'open' }, buckets)).toBe(1);
	});

	it('falls back to the first bucket of the task status by position', () => {
		expect(effectiveBucketId({ bucketId: null, status: 'open' }, buckets)).toBe(2);
		expect(effectiveBucketId({ bucketId: 1, status: 'done' }, buckets)).toBe(4);
		expect(effectiveBucketId({ bucketId: 99, status: 'in_progress' }, buckets)).toBe(3);
	});

	it('returns null for a task without status (even one left in a bucket) or without a matching bucket', () => {
		expect(effectiveBucketId({ status: null }, buckets)).toBeNull();
		expect(effectiveBucketId({ bucketId: 1, status: null }, buckets)).toBeNull();
		expect(effectiveBucketId({ status: 'done' }, [b(1, 'open', 0)])).toBeNull();
	});
});

describe('isLastOfStatus', () => {
	it('is true only for the single bucket of a status', () => {
		expect(isLastOfStatus(buckets[0], buckets)).toBe(false);
		expect(isLastOfStatus(buckets[2], buckets)).toBe(true);
	});
});
