<script lang="ts">
	import { onMount } from 'svelte';
	import { apiGetAuth, apiPatchAuth } from '$lib/api';
	import { errMessage } from '$lib/errors';
	import { t, tr } from '$lib/i18n';
	import { canMove, findDropTarget, layoutForest, NODE_W } from '$lib/mindmap';
	import { showToast } from '$lib/toast';
	import type { Node as AppNode } from '$lib/types';
	import {
		SvelteFlow,
		Controls,
		Background,
		BackgroundVariant,
		type Node as FlowNode,
		type Edge
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	interface Props {
		/** The project whose tree is shown. */
		projectId: string;
	}
	let { projectId }: Props = $props();

	let mmNodes = $state<FlowNode[]>([]);
	let mmEdges = $state<Edge[]>([]);
	let loaded = $state(false);
	const expandedMmIds = new Set<number>();

	let rootNode: AppNode | null = null;
	/** Every node here is in this one project, so its permission decides what may be moved. */
	const permission = () => rootNode?.access ?? null;
	const childMap = new Map<number, AppNode[]>();

	/** Re-run the tidy-tree layout over all loaded nodes so no subtrees overlap. */
	function relayout() {
		if (!rootNode) return;
		const pos = layoutForest(
			[rootNode],
			(n) => childMap.get(Number(n.id)) ?? [],
			(n) => Number(n.id)
		);
		mmNodes = mmNodes.map((n) => {
			const p = pos.get(Number(n.id));
			return p ? { ...n, position: p } : n;
		});
	}

	function appNodeToFlowNode(n: AppNode, x: number, y: number): FlowNode {
		const common = `width:${NODE_W}px;box-sizing:border-box;text-align:center;overflow:hidden;text-overflow:ellipsis;`;
		return {
			id: String(n.id),
			position: { x, y },
			width: NODE_W,
			// In a read-only project nothing can be picked up (moving needs write; the project itself, admin).
			draggable: canMove(n, permission()),
			data: { label: n.name ?? n.title ?? tr('views.mindmap.nodeFallback', { id: n.id }) },
			style:
				n.type === 'project'
					? 'background:#3b82f6;color:#fff;border-radius:8px;padding:8px 14px;font-weight:600;border:none;' +
						common
					: 'background:#f3f4f6;color:#111;border-radius:6px;padding:6px 12px;border:1px solid #d1d5db;' +
						common
		};
	}

	async function loadMindmapTree(id: string) {
		try {
			const projectNode = await apiGetAuth<AppNode>(`/nodes/${id}`);
			rootNode = projectNode;
			childMap.clear();
			mmNodes = [appNodeToFlowNode(projectNode, 0, 0)];
			mmEdges = [];
			const children = await apiGetAuth<AppNode[]>(`/nodes/${id}/children`);
			childMap.set(Number(projectNode.id), children);
			children.forEach((child) => {
				mmNodes = [...mmNodes, appNodeToFlowNode(child, 0, 0)];
				mmEdges = [...mmEdges, { id: `e-${id}-${child.id}`, source: id, target: String(child.id) }];
				expandedMmIds.add(child.id);
			});
			relayout();
		} catch (e: unknown) {
			showToast(errMessage(e, tr('views.toast.mindmapLoadFailed')), 'error');
		} finally {
			loaded = true;
		}
	}

	async function onMmNodeClick({ node }: { node: FlowNode }) {
		const nodeId = Number(node.id);
		if (expandedMmIds.has(nodeId)) return;
		expandedMmIds.add(nodeId);
		try {
			const children = await apiGetAuth<AppNode[]>(`/nodes/${nodeId}/children`);
			childMap.set(nodeId, children);
			mmNodes = [...mmNodes, ...children.map((c) => appNodeToFlowNode(c, 0, 0))];
			mmEdges = [
				...mmEdges,
				...children.map((c) => ({
					id: `e-${nodeId}-${c.id}`,
					source: String(nodeId),
					target: String(c.id)
				}))
			];
			relayout();
		} catch (e: unknown) {
			expandedMmIds.delete(nodeId); // let the user retry
			showToast(errMessage(e, tr('views.toast.childrenLoadFailed')), 'error');
		}
	}

	async function onMmNodeDragStop({
		targetNode,
		nodes: draggedNodes
	}: {
		targetNode: FlowNode | null;
		nodes: FlowNode[];
	}) {
		// `targetNode` is the node that was dragged; the new parent is the node it was dropped on.
		const node = targetNode ?? draggedNodes[0];
		if (!node) return;
		const parent = findDropTarget(node, mmNodes);
		if (!parent) return;
		if (mmEdges.some((e) => e.source === parent.id && e.target === node.id)) return;
		try {
			await apiPatchAuth(`/nodes/${node.id}/move`, { parentId: Number(parent.id) });
			mmEdges = mmEdges.filter((e) => e.target !== node.id);
			mmEdges = [...mmEdges, { id: `e-${parent.id}-${node.id}`, source: parent.id, target: node.id }];
			// keep the layout tree in sync with the new parent
			const moved = [...childMap.values()].flat().find((c) => String(c.id) === node.id);
			for (const [k, list] of childMap)
				childMap.set(
					k,
					list.filter((c) => String(c.id) !== node.id)
				);
			if (moved) childMap.set(Number(parent.id), [...(childMap.get(Number(parent.id)) ?? []), moved]);
			showToast(tr('views.toast.moved'), 'success');
		} catch (e: unknown) {
			showToast(errMessage(e, tr('views.toast.moveFailed')), 'error');
			relayout(); // put the node back under its old parent
		}
	}

	onMount(() => {
		void loadMindmapTree(projectId);
	});
</script>

{#if mmNodes.length > 0}
	<div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
		<SvelteFlow
			bind:nodes={mmNodes}
			bind:edges={mmEdges}
			fitView
			onnodeclick={onMmNodeClick}
			onnodedragstop={onMmNodeDragStop}
		>
			<Controls />
			<Background variant={BackgroundVariant.Dots} gap={20} size={1} />
		</SvelteFlow>
	</div>
	<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
		{$t('views.mindmap.hint')}
	</p>
{:else if loaded}
	<div class="text-center py-10 text-gray-500 dark:text-gray-400">
		<p>{$t('views.mindmap.noTasks')}</p>
	</div>
{/if}
