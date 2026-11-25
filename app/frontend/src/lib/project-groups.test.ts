import { describe, expect, it } from 'vitest';
import { groupByProject, taskProjectId } from './project-groups';
import type { Task } from './types';

const task = (id: number, projectId: number | null, parentId: number | null = projectId): Task =>
	({ id, title: `T${id}`, parentId, projectId }) as Task;
const names = { 1: 'Beta', 2: 'Alpha' };

describe('groupByProject', () => {
	it('puts personal tasks first, then projects by name', () => {
		const groups = groupByProject([task(10, 1), task(11, null), task(12, 2), task(13, 1)], names);
		expect(groups.map((g) => [g.projectId, g.tasks.map((t) => t.id)])).toEqual([
			[null, [11]],
			[2, [12]],
			[1, [10, 13]]
		]);
		expect(groups[1].name).toBe('Alpha');
	});

	it('groups a subtask by the project the server reports, even without its parent listed', () => {
		const groups = groupByProject([task(20, 1, 99)], names);
		expect(groups.map((g) => [g.projectId, g.tasks.map((t) => t.id)])).toEqual([[1, [20]]]);
	});
});

describe('taskProjectId', () => {
	it('falls back to a known parent project when the task has no projectId', () => {
		expect(taskProjectId({ id: 1, parentId: 2 } as Task, names)).toBe(2);
		expect(taskProjectId({ id: 1, parentId: 5 } as Task, names)).toBeNull();
	});
});
