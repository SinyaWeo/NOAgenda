import { describe, expect, it } from 'vitest';
import type { Project } from '#lib/types.js';
import { ancestors, descendantIds, projectOptions, projectTree } from './project-tree.js';

const p = (id: number, parentId: number | null = null): Project =>
	({ id, type: 'project', name: `P${id}`, parentId, createdAt: '', updatedAt: '' }) as Project;

describe('project tree', () => {
	// 1 > 2 > 3, 1 > 4, 5; 6 sits under 99, which the user cannot see
	const projects = [p(5), p(3, 2), p(1), p(2, 1), p(4, 1), p(6, 99)];

	it('orders projects as a tree, siblings in list order, unknown parents at the top', () => {
		expect(projectTree(projects).map((r) => [r.project.id, r.depth])).toEqual([
			[5, 0],
			[1, 0],
			[2, 1],
			[3, 2],
			[4, 1],
			[6, 0]
		]);
	});

	it('keeps projects in a parent loop instead of dropping them', () => {
		expect(projectTree([p(1, 2), p(2, 1)]).map((r) => r.project.id)).toEqual([1, 2]);
	});

	it('finds everything below a project', () => {
		expect([...descendantIds(projects, 1)].sort()).toEqual([2, 3, 4]);
		expect(descendantIds(projects, 3).size).toBe(0);
	});

	it('lists the visible parents top first', () => {
		expect(ancestors(projects, 3).map((x) => x.id)).toEqual([1, 2]);
		expect(ancestors(projects, 6)).toEqual([]);
	});

	it('indents select options by depth', () => {
		expect(projectOptions([p(1), p(2, 1)]).map((o) => o.label)).toEqual(['P1', '   P2']);
	});
});
