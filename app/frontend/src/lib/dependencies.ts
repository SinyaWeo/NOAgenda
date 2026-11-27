import { apiDeleteAuth, apiGetAuth, apiPostAuth, MAX_PAGE_SIZE } from '#lib/api.js';
import type { RelationKind } from '#lib/types.js';

/**
 * Task dependencies as the Gantt chart and the mind maps use them: "A -> B" means B cannot start before A
 * is finished. They are task relations underneath (`blocks` / `blocked_by`); GET /dependencies gathers
 * them per pair.
 */
export interface TaskDependency {
	fromId: number;
	toId: number;
	/** The relation rows behind it; removing the dependency removes all of them. */
	rows: { taskId: number; kind: RelationKind; relatedTaskId: number }[];
}

export interface DependencyData {
	dependencies: TaskDependency[];
	/** Tasks the signed-in user may change (move, resize, link from). */
	editable: number[];
}

export const EMPTY_DEPENDENCIES: DependencyData = { dependencies: [], editable: [] };

export const dependencyKey = (d: Pick<TaskDependency, 'fromId' | 'toId'>) => `${d.fromId}>${d.toId}`;

/**
 * The dependencies touching these tasks, and which of them the user may edit. Asks in chunks of
 * MAX_PAGE_SIZE; the server also returns dependencies to tasks outside a chunk, so none are lost.
 */
export async function loadDependencies(taskIds: number[]): Promise<DependencyData> {
	const ids = [...new Set(taskIds)].sort((a, b) => a - b);
	const parts: number[][] = [];
	for (let i = 0; i < ids.length; i += MAX_PAGE_SIZE) parts.push(ids.slice(i, i + MAX_PAGE_SIZE));
	const results = await Promise.all(
		parts.map((p) => apiGetAuth<DependencyData>(`/dependencies?taskIds=${p.join(',')}`))
	);
	const byKey = new Map<string, TaskDependency>();
	for (const r of results) for (const d of r.dependencies) byKey.set(dependencyKey(d), d);
	return { dependencies: [...byKey.values()], editable: results.flatMap((r) => r.editable) };
}

/** Make `toId` wait for `fromId` (needs write access to `fromId`). */
export async function addDependency(fromId: number, toId: number): Promise<void> {
	await apiPostAuth(`/tasks/${fromId}/relations`, { relatedTaskId: toId, kind: 'blocks' });
}

/** Remove a dependency, whichever way (or ways) it is stored. */
export async function removeDependency(d: TaskDependency): Promise<void> {
	for (const r of d.rows) await apiDeleteAuth(`/tasks/${r.taskId}/relations/${r.kind}/${r.relatedTaskId}`);
}

/** Would adding "fromId -> toId" make a loop with the dependencies we know? (The server checks again.) */
export function wouldCycle(dependencies: readonly TaskDependency[], fromId: number, toId: number): boolean {
	if (fromId === toId) return true;
	const seen = new Set([toId]);
	const queue = [toId];
	while (queue.length) {
		const cur = queue.shift() as number;
		for (const d of dependencies) {
			if (d.fromId !== cur) continue;
			if (d.toId === fromId) return true;
			if (!seen.has(d.toId)) {
				seen.add(d.toId);
				queue.push(d.toId);
			}
		}
	}
	return false;
}

/** Can the user make `toId` wait for `fromId`? null when allowed, otherwise the reason (a message key). */
export function linkProblem(
	data: DependencyData,
	fromId: number,
	toId: number
): 'views.dependency.linkSelf' | 'views.dependency.linkExists' | 'views.dependency.linkCycle' | null {
	if (fromId === toId) return 'views.dependency.linkSelf';
	if (data.dependencies.some((d) => d.fromId === fromId && d.toId === toId))
		return 'views.dependency.linkExists';
	if (wouldCycle(data.dependencies, fromId, toId)) return 'views.dependency.linkCycle';
	return null;
}
