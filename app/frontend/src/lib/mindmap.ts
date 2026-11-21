import type { Node as FlowNode } from '@xyflow/svelte';

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
	getId: (item: T) => number
): Map<number, { x: number; y: number }> {
	const positions = new Map<number, { x: number; y: number }>();
	const seen = new Set<number>();

	type Tree = { item: T; kids: Tree[]; width: number };
	const build = (item: T): Tree => {
		seen.add(getId(item));
		const kids = childrenOf(item)
			.filter((c) => !seen.has(getId(c)))
			.map((c) => (seen.has(getId(c)) ? null : build(c)))
			.filter((k): k is Tree => k !== null);
		const kidsWidth = kids.reduce((s, k) => s + k.width, 0) + H_GAP * Math.max(0, kids.length - 1);
		return { item, kids, width: Math.max(NODE_W, kidsWidth) };
	};

	const place = (tree: Tree, left: number, depth: number) => {
		positions.set(getId(tree.item), { x: left + (tree.width - NODE_W) / 2, y: depth * V_GAP });
		const kidsWidth = tree.kids.reduce((s, k) => s + k.width, 0) + H_GAP * Math.max(0, tree.kids.length - 1);
		let cursor = left + (tree.width - kidsWidth) / 2;
		for (const k of tree.kids) {
			place(k, cursor, depth + 1);
			cursor += k.width + H_GAP;
		}
	};

	let left = 0;
	for (const root of roots) {
		if (seen.has(getId(root))) continue;
		const tree = build(root);
		place(tree, left, 0);
		left += tree.width + H_GAP;
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
