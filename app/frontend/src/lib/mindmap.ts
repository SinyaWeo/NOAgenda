import type { Node as FlowNode } from '@xyflow/svelte';
import type { Node as AppNode, Permission } from './types';

export const NODE_W = 170;
export const H_GAP = 30;
export const V_GAP = 120;

/**
 * Tidy-tree layout for a forest. Every subtree gets its own horizontal span (so siblings and
 * neighbouring roots never overlap) and each parent is centred over its children.
 * Returns top-left positions keyed by id. Already-visited ids (cycles/duplicates) are skipped.
 */
export function layoutForest<T>(
	roots: T[],
	childrenOf: (item: T) => T[],
	getId: (item: T) => number,
	maxRowWidth = 1800
): Map<number, { x: number; y: number }> {
	const positions = new Map<number, { x: number; y: number }>();
	const seen = new Set<number>();

	type Tree = { item: T; kids: Tree[]; width: number; depth: number };
	const kidsWidthOf = (kids: Tree[]) =>
		kids.reduce((s, k) => s + k.width, 0) + H_GAP * Math.max(0, kids.length - 1);
	const build = (item: T): Tree => {
		seen.add(getId(item));
		const kids: Tree[] = [];
		for (const c of childrenOf(item)) if (!seen.has(getId(c))) kids.push(build(c));
		return {
			item,
			kids,
			width: Math.max(NODE_W, kidsWidthOf(kids)),
			depth: 1 + Math.max(0, ...kids.map((k) => k.depth))
		};
	};

	const place = (tree: Tree, left: number, top: number) => {
		positions.set(getId(tree.item), { x: left + (tree.width - NODE_W) / 2, y: top });
		let cursor = left + (tree.width - kidsWidthOf(tree.kids)) / 2;
		for (const k of tree.kids) {
			place(k, cursor, top + V_GAP);
			cursor += k.width + H_GAP;
		}
	};

	// Roots flow left to right and wrap onto a new row once the row would exceed maxRowWidth;
	// each row starts below the deepest tree of the previous row.
	const trees: Tree[] = [];
	for (const root of roots) if (!seen.has(getId(root))) trees.push(build(root));

	let left = 0;
	let top = 0;
	let rowDepth = 0;
	for (const tree of trees) {
		if (left > 0 && left + tree.width > maxRowWidth) {
			top += rowDepth * V_GAP + V_GAP / 2;
			left = 0;
			rowDepth = 0;
		}
		place(tree, left, top);
		left += tree.width + H_GAP * 2;
		rowDepth = Math.max(rowDepth, tree.depth);
	}
	return positions;
}

/**
 * The node a dragged node was dropped ON, if any.
 *
 * Svelte Flow's `onnodedragstop` reports the node that was dragged (its `targetNode` is NOT the
 * node under the pointer), so "drop onto another node to re-parent" has to be worked out from
 * geometry: the first other node whose box contains the centre of the dragged node.
 */
export function findDropTarget(moved: FlowNode, all: FlowNode[]): FlowNode | null {
	const size = (n: FlowNode) => ({
		w: n.measured?.width ?? n.width ?? 150,
		h: n.measured?.height ?? n.height ?? 40
	});
	const m = size(moved);
	const cx = moved.position.x + m.w / 2;
	const cy = moved.position.y + m.h / 2;
	return (
		all.find((n) => {
			if (n.id === moved.id) return false;
			const s = size(n);
			return cx >= n.position.x && cx <= n.position.x + s.w && cy >= n.position.y && cy <= n.position.y + s.h;
		}) ?? null
	);
}

/** The project a node belongs to (itself for a project), or null for a personal task tree. Cycle-safe. */
export function projectOf(id: number, byId: Map<number, AppNode>): AppNode | null {
	const seen = new Set<number>();
	let cur = byId.get(id);
	while (cur && !seen.has(cur.id)) {
		if (cur.type === 'project') return cur;
		seen.add(cur.id);
		cur = cur.parentId == null ? undefined : byId.get(cur.parentId);
	}
	return null;
}

/**
 * The current user's permission on a node, as far as the client can tell: the project's `access`,
 * or for a personal task tree `admin` when they created its top task and `write` otherwise (assignee).
 * The server re-checks every change; this only keeps the UI from offering moves it would refuse.
 */
export function permissionOf(
	id: number,
	byId: Map<number, AppNode>,
	userId: number | undefined
): Permission | null {
	const project = projectOf(id, byId);
	if (project) return project.access ?? null;
	// No project above it: find the top task of this personal tree (unknown if a parent is not loaded).
	let top = byId.get(id);
	const seen = new Set<number>();
	while (top && top.parentId != null) {
		if (seen.has(top.id)) return null;
		seen.add(top.id);
		top = byId.get(top.parentId);
	}
	if (!top) return null;
	return top.createdBy != null && top.createdBy === userId ? 'admin' : 'write';
}

/** Moving a project needs Manager (admin) rights on it; moving a task needs write. */
export function canMove(node: Pick<AppNode, 'type'>, permission: Permission | null): boolean {
	return node.type === 'project' ? permission === 'admin' : permission === 'write' || permission === 'admin';
}

/** Something can be placed under a node only with write access to it. */
export function canDropOn(permission: Permission | null): boolean {
	return permission === 'write' || permission === 'admin';
}
