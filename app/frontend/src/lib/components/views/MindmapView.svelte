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

	/** Load the whole project tree at once, so the initial `fitView` frames all of it. */
	async function loadMindmapTree(id: string) {
		try {
			// `/nodes/:id` carries the caller's permission, `/tree` the nested children.
			const [projectNode, tree] = await Promise.all([
				apiGetAuth<AppNode>(`/nodes/${id}`),
				apiGetAuth<AppNode>(`/nodes/${id}/tree`)
			]);
			rootNode = projectNode;
			childMap.clear();
			const nodes: FlowNode[] = [appNodeToFlowNode(projectNode, 0, 0)];
			const edges: Edge[] = [];
			const seen = new Set<number>([Number(projectNode.id)]);
			const walk = (parentId: number, children: AppNode[]) => {
				const kids = children.filter((c) => !seen.has(Number(c.id)));
				childMap.set(parentId, kids);
				for (const c of kids) {
					seen.add(Number(c.id));
					nodes.push(appNodeToFlowNode(c, 0, 0));
					edges.push({ id: `e-${parentId}-${c.id}`, source: String(parentId), target: String(c.id) });
					walk(Number(c.id), c.children ?? []);
				}
			};
			walk(Number(projectNode.id), tree.children ?? []);
			mmNodes = nodes;
			mmEdges = edges;
			relayout();
		} catch (e: unknown) {
			showToast(errMessage(e, tr('views.toast.mindmapLoadFailed')), 'error');
		} finally {
			loaded = true;
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

{#if loaded && mmNodes.length > 0}
	<div style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
		<SvelteFlow
			bind:nodes={mmNodes}
			bind:edges={mmEdges}
			fitView
			fitViewOptions={{ padding: 0.1 }}
			minZoom={0.05}
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
