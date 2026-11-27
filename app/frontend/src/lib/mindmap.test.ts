import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/svelte';
import {
	canDropOn,
	canMove,
	canRemove,
	dependencyEdges,
	dependencyOfEdge,
	findDropTarget,
	isDependencyEdge,
	permissionOf,
	projectOf
} from './mindmap';
import type { Node as AppNode, Permission } from './types';

const node = (id: string, x: number, y: number, w = 100, h = 40): Node =>
	({ id, position: { x, y }, data: {}, measured: { width: w, height: h } }) as Node;

describe('findDropTarget', () => {
	const a = node('a', 0, 0),
		b = node('b', 200, 0),
		c = node('c', 0, 200);

	it('returns the node whose box contains the centre of the dragged node', () => {
		expect(findDropTarget(node('a', 190, 5), [a, b, c])?.id).toBe('b'); // centre (240,25) is inside b
	});
	it('returns null when the node was dropped on empty canvas', () => {
		expect(findDropTarget(node('a', 400, 400), [a, b, c])).toBeNull();
	});
	it('never returns the dragged node itself', () => {
		expect(findDropTarget(a, [a, b, c])).toBeNull();
	});
	it('uses a default size for nodes that have not been measured yet', () => {
		const unmeasured = { id: 'u', position: { x: 300, y: 0 }, data: {} } as Node;
		expect(findDropTarget(node('a', 310, 0), [a, unmeasured])?.id).toBe('u');
	});
});

describe('permissions in the mind map', () => {
	const n = (
		id: number,
		type: AppNode['type'],
		parentId: number | null,
		extra: Partial<AppNode> = {}
	): AppNode => ({ id, type, parentId, createdAt: '', updatedAt: '', ...extra }) as AppNode;
	const ME = 1;
	const byId = new Map<number, AppNode>(
		[
			n(10, 'project', null, { name: 'Mine', access: 'admin' }),
			n(11, 'task', 10),
			n(20, 'project', null, { name: 'Shared', access: 'read' }),
			n(21, 'task', 20),
			n(22, 'task', 21),
			n(30, 'task', null, { createdBy: ME }),
			n(31, 'task', 30),
			n(40, 'task', null, { createdBy: 2 }),
			n(50, 'task', 99) // parent not loaded
		].map((x) => [x.id, x])
	);

	it('projectOf finds the closest project, or null for personal tasks', () => {
		expect(projectOf(22, byId)?.name).toBe('Shared');
		expect(projectOf(20, byId)?.name).toBe('Shared');
		expect(projectOf(31, byId)).toBeNull();
	});

	it("permissionOf uses the project's access, or the personal tree's creator", () => {
		expect(permissionOf(11, byId, ME)).toBe('admin');
		expect(permissionOf(22, byId, ME)).toBe('read');
		expect(permissionOf(31, byId, ME)).toBe('admin');
		expect(permissionOf(40, byId, ME)).toBe('write'); // someone else's personal task: only as assignee
		expect(permissionOf(50, byId, ME)).toBeNull();
	});

	it('canMove needs admin for a project and write for a task; canDropOn needs write', () => {
		const levels: (Permission | null)[] = [null, 'read', 'write', 'admin'];
		expect(levels.map((p) => canMove({ type: 'project' }, p))).toEqual([false, false, false, true]);
		expect(levels.map((p) => canMove({ type: 'task' }, p))).toEqual([false, false, true, true]);
		expect(levels.map(canDropOn)).toEqual([false, false, true, true]);
	});
});

describe('dependency edges', () => {
	const dep = (fromId: number, toId: number, taskId = fromId) => ({
		fromId,
		toId,
		rows: [{ taskId, kind: 'blocks' as const, relatedTaskId: taskId === fromId ? toId : fromId }]
	});
	const data = { dependencies: [dep(1, 2), dep(2, 3, 3), dep(1, 9)], editable: [1, 2] };
	const edges = dependencyEdges(data, new Set([1, 2, 3]), {
		broken: (d) => d.toId === 3,
		label: (d) => `${d.fromId} before ${d.toId}`
	});

	it('draws only dependencies between nodes on the map, from the task that comes first', () => {
		expect(edges.map((e) => [e.id, e.source, e.target])).toEqual([
			['dep-1>2', '1', '2'],
			['dep-2>3', '2', '3']
		]);
		expect(edges.every(isDependencyEdge)).toBe(true);
		expect(isDependencyEdge({ id: 'e-1-2' })).toBe(false);
	});

	it('marks broken ones and lets the user delete only what they may change', () => {
		expect(edges[0]).toMatchObject({ class: 'dep-edge', deletable: true, ariaLabel: '1 before 2' });
		// 2 -> 3 is stored on task 3, which the user cannot edit
		expect(edges[1]).toMatchObject({ class: 'dep-edge dep-broken', deletable: false });
		expect(canRemove(dep(2, 3, 3), new Set([2]))).toBe(false);
	});

	it('finds the dependency behind an edge', () => {
		expect(dependencyOfEdge('dep-2>3', data)?.toId).toBe(3);
		expect(dependencyOfEdge('e-2-3', data)).toBeNull();
		expect(dependencyOfEdge('dep-7>8', data)).toBeNull();
	});
});
