import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/svelte';
import { findDropTarget } from './mindmap';

const node = (id: string, x: number, y: number, w = 100, h = 40): Node =>
	({ id, position: { x, y }, data: {}, measured: { width: w, height: h } }) as Node;

describe('findDropTarget', () => {
	const a = node('a', 0, 0), b = node('b', 200, 0), c = node('c', 0, 200);

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
