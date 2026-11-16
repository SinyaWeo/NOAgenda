import type { Node as FlowNode } from '@xyflow/svelte';

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
		h: n.measured?.height ?? n.height ?? 40,
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
