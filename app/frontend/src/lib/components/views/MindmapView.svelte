<script lang="ts">
	import { onMount } from 'svelte';
	import { apiGetAuth, apiPatchAuth } from '#lib/api.js';
	import { errMessage } from '#lib/errors.js';
	import { t } from '#lib/i18n/index.js';
	import { canMove, findDropTarget, isDependencyEdge, layoutForest, NODE_W } from '#lib/mindmap.js';
	import { MindmapDependencies } from '#lib/mindmap-dependencies.svelte.js';
	import { showToast } from '#lib/toast.svelte.js';
	import type { Node as AppNode } from '#lib/types.js';
	import {
		SvelteFlow,
		Controls,
		Background,
		BackgroundVariant,
		Panel,
		type Node as FlowNode,
		type Edge
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import DependencyPanel from './DependencyPanel.svelte';

	interface Props {
		/** The project whose tree is shown. */
		projectId: string;
	}
	let { projectId }: Props = $props();

	let mmNodes = $state.raw<FlowNode[]>([]);
	let mmEdges = $state.raw<Edge[]>([]);
	let loaded = $state(false);

	let rootNode: AppNode | null = null;
	/** Every node here is in this one project, so its permission decides what may be moved. */
	const permission = () => rootNode?.access ?? null;
	const childMap = new Map<number, AppNode[]>();
	/** Every node on the map by id (for the dependency arrows). */
	let byId = new Map<number, AppNode>();
	const deps = new MindmapDependencies(
		() => byId,
		(depEdges) => (mmEdges = [...mmEdges.filter((e) => !isDependencyEdge(e)), ...depEdges])
	);

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
			// Removing things happens elsewhere; the Delete key must never drop a node from the map.
			deletable: false,
			// Only tasks can wait for each other (drag from a task's bottom dot onto another task).
			connectable: n.type === 'task',
			// In a read-only project nothing can be picked up (moving needs write; the project itself, admin).
			draggable: canMove(n, permission()),
			data: { label: n.name ?? n.title ?? t('views.mindmap.nodeFallback', { id: n.id }) },
			style:
				n.type === 'project'
					? 'background:#3b82f6;color:#fff;border-radius:8px;padding:8px 14px;font-weight:600;border:none;' +
						common
					: 'background:#f3f4f6;color:#111;border-radius:6px;padding:6px 12px 14px;border:1px solid #d1d5db;' +
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
			byId = new Map([[Number(projectNode.id), projectNode]]);
			const nodes: FlowNode[] = [appNodeToFlowNode(projectNode, 0, 0)];
			const edges: Edge[] = [];
			const seen = new Set<number>([Number(projectNode.id)]);
			const walk = (parentId: number, children: AppNode[]) => {
				const kids = children.filter((c) => !seen.has(Number(c.id)));
				childMap.set(parentId, kids);
				for (const c of kids) {
					seen.add(Number(c.id));
					byId.set(Number(c.id), c);
					nodes.push(appNodeToFlowNode(c, 0, 0));
					edges.push(treeEdge(parentId, c.id));
					walk(Number(c.id), c.children ?? []);
				}
			};
			walk(Number(projectNode.id), tree.children ?? []);
			mmNodes = nodes;
			mmEdges = edges;
			relayout();
			void deps.load();
		} catch (e: unknown) {
			showToast(errMessage(e, t('views.toast.mindmapLoadFailed')), 'error');
		} finally {
			loaded = true;
		}
	}

	/** A parent -> child line of the tree: not selectable or deletable (moving a node changes it). */
	function treeEdge(parentId: number | string, childId: number | string): Edge {
		return {
			id: `e-${parentId}-${childId}`,
			source: String(parentId),
			target: String(childId),
			selectable: false,
			deletable: false,
			focusable: false
		};
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
		if (mmEdges.some((e) => !isDependencyEdge(e) && e.source === parent.id && e.target === node.id)) return;
		try {
			await apiPatchAuth(`/nodes/${node.id}/move`, { parentId: Number(parent.id) });
			mmEdges = mmEdges.filter((e) => isDependencyEdge(e) || e.target !== node.id);
			mmEdges = [...mmEdges, treeEdge(parent.id, node.id)];
			// keep the layout tree in sync with the new parent
			const moved = [...childMap.values()].flat().find((c) => String(c.id) === node.id);
			for (const [k, list] of childMap)
				childMap.set(
					k,
					list.filter((c) => String(c.id) !== node.id)
				);
			if (moved) childMap.set(Number(parent.id), [...(childMap.get(Number(parent.id)) ?? []), moved]);
			showToast(t('views.toast.moved'), 'success');
		} catch (e: unknown) {
			showToast(errMessage(e, t('views.toast.moveFailed')), 'error');
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
			connectionRadius={60}
			isValidConnection={deps.isValidConnection}
			onbeforeconnect={deps.onbeforeconnect}
			onbeforedelete={deps.onbeforedelete}
			onselectionchange={deps.onselectionchange}
		>
			<Controls />
			{#if deps.selectedDependency}
				<Panel position="top-right">
					<DependencyPanel
						label={deps.label(deps.selectedDependency)}
						removable={deps.selectedRemovable}
						onremove={() => deps.selectedDependency && deps.remove(deps.selectedDependency)}
					/>
				</Panel>
			{/if}
			<Background variant={BackgroundVariant.Dots} gap={20} size={1} />
		</SvelteFlow>
	</div>
	<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
		{t('views.mindmap.hint')}
	</p>
{:else if loaded}
	<div class="text-center py-10 text-gray-500 dark:text-gray-400">
		<p>{t('views.mindmap.noTasks')}</p>
	</div>
{/if}
