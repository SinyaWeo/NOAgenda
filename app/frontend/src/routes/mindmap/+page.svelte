<script lang="ts">
	import { appName } from '#lib/appName.svelte.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
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
	import { authSession } from '#lib/auth.svelte.js';
	import { apiGetAuth, apiPatchAuth } from '#lib/api.js';
	import {
		canDropOn,
		canMove,
		findDropTarget,
		isDependencyEdge,
		layoutForest,
		NODE_W,
		permissionOf,
		projectOf,
		V_GAP
	} from '#lib/mindmap.js';
	import { showToast } from '#lib/toast.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import { t } from '#lib/i18n/index.js';
	import type { Node as AppNode } from '#lib/types.js';
	import { MindmapDependencies } from '#lib/mindmap-dependencies.svelte.js';
	import DependencyPanel from '#lib/components/views/DependencyPanel.svelte';

	let loading = $state(true);
	let error = $state('');

	let nodes = $state.raw<FlowNode[]>([]);
	let edges = $state.raw<Edge[]>([]);
	/** Every loaded project and task by id, to work out which project (and permission) a node is in. */
	let byId = new Map<number, AppNode>();
	/** Laid-out positions, to put a node back when a drop is refused. */
	let home = new Map<string, { x: number; y: number }>();

	const deps = new MindmapDependencies(
		() => byId,
		(depEdges) => (edges = [...edges.filter((e) => !isDependencyEdge(e)), ...depEdges])
	);

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

	const permission = (id: number) => permissionOf(id, byId, authSession.user?.id);

	function toFlowNode(n: AppNode, x: number, y: number): FlowNode {
		const common = `width:${NODE_W}px;box-sizing:border-box;text-align:center;overflow:hidden;text-overflow:ellipsis;`;
		return {
			id: String(n.id),
			position: { x, y },
			width: NODE_W,
			// Removing things happens elsewhere; the Delete key must never drop a node from the map.
			deletable: false,
			// Only tasks can wait for each other (drag from a task's bottom dot onto another task).
			connectable: n.type === 'task',
			// Nodes the user may not move (read-only projects) cannot be picked up at all.
			draggable: canMove(n, permission(n.id)),
			data: { label: n.name ?? n.title ?? t('views.mindmap.nodeFallback', { id: n.id }) },
			style:
				n.type === 'project'
					? 'background:#3b82f6;color:#fff;border-radius:8px;padding:8px 14px;font-weight:600;border:none;' +
						common
					: 'background:#f3f4f6;color:#111;border-radius:6px;padding:6px 12px 14px;border:1px solid #d1d5db;' +
						common
		};
	}

	async function loadGraph() {
		try {
			const [projects, tasks] = await Promise.all([
				apiGetAuth<AppNode[]>('/nodes?type=project'),
				apiGetAuth<AppNode[]>('/tasks').catch((): AppNode[] => [])
			]);

			byId = new Map([...projects, ...tasks].map((n) => [n.id, n]));
			const byParent = new Map<number, AppNode[]>();
			for (const t of tasks) {
				if (t.parentId === undefined || t.parentId === null) continue;
				if (!byParent.has(t.parentId)) byParent.set(t.parentId, []);
				byParent.get(t.parentId)?.push(t);
			}

			const graphNodes: FlowNode[] = [];
			const graphEdges: Edge[] = [];

			const childrenOf = (n: AppNode) => byParent.get(Number(n.id)) ?? [];
			const positions = layoutForest(projects, childrenOf, (n) => Number(n.id));

			// Emit nodes/edges in tree order; an edge is only drawn for children laid out directly
			// below this parent (cycles/duplicates are skipped by the layout).
			const emitted = new Set<number>();
			const walk = (n: AppNode) => {
				const id = Number(n.id);
				const pos = positions.get(id);
				if (!pos || emitted.has(id)) return;
				emitted.add(id);
				graphNodes.push(toFlowNode(n, pos.x, pos.y));
				for (const c of childrenOf(n)) {
					const cp = positions.get(Number(c.id));
					if (!cp || emitted.has(Number(c.id)) || cp.y !== pos.y + V_GAP) continue;
					graphEdges.push(treeEdge(n.id, c.id));
					walk(c);
				}
			};
			projects.forEach(walk);

			home = new Map(graphNodes.map((n) => [n.id, n.position]));
			nodes = graphNodes;
			edges = graphEdges;
			void deps.load();
		} catch (e: unknown) {
			error = errMessage(e, t('common.somethingWentWrong'));
		} finally {
			loading = false;
		}
	}

	function putBack(id: string) {
		const pos = home.get(id);
		if (pos) nodes = nodes.map((n) => (n.id === id ? { ...n, position: pos } : n));
	}

	async function handleNodeDragStop({
		targetNode,
		nodes: draggedNodes
	}: {
		targetNode: FlowNode | null;
		nodes: FlowNode[];
	}) {
		// `targetNode` is the node that was dragged; the new parent is the node it was dropped on.
		const movedNode = targetNode ?? draggedNodes[0];
		if (!movedNode) return;
		const parent = findDropTarget(movedNode, nodes);
		if (!parent) return; // just repositioned, not dropped on anything
		if (edges.some((e) => !isDependencyEdge(e) && e.source === parent.id && e.target === movedNode.id))
			return; // already its parent
		const nodeId = Number(movedNode.id);
		const newParentId = Number(parent.id);
		if (!canDropOn(permission(newParentId))) {
			const project = projectOf(newParentId, byId);
			showToast(t('views.mindmap.readOnlyTarget', { project: project?.name ?? parent.id }), 'error');
			putBack(movedNode.id);
			return;
		}
		try {
			await apiPatchAuth(`/nodes/${nodeId}/move`, {
				parentId: newParentId
			});
			edges = edges.filter((e) => isDependencyEdge(e) || e.target !== movedNode.id);
			edges = [...edges, treeEdge(newParentId, nodeId)];
			showToast(t('views.toast.moved'), 'success');
		} catch (e: unknown) {
			showToast(errMessage(e, t('views.toast.moveFailed')), 'error');
			await loadGraph(); // put the map back as the server has it
		}
	}

	onMount(async () => {
		if (authSession.status === 'unauthenticated') {
			goto('/user/login');
			return;
		}
		await loadGraph();
	});
</script>

<svelte:head>
	<title>{t('views.mindmap.pageTitle', { app: appName.current })}</title>
</svelte:head>

<div class="flex flex-col h-full">
	<div class="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
			{t('views.mindmap.title')}
		</h1>
		<span class="text-sm text-gray-500 dark:text-gray-400">
			{t('views.mindmap.subtitle')}
		</span>
	</div>

	{#if loading}
		<div class="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
			{t('common.loading')}
		</div>
	{:else if error}
		<div class="flex flex-1 items-center justify-center text-red-500">
			{error}
		</div>
	{:else if nodes.length === 0}
		<div class="flex flex-1 items-center justify-center flex-col gap-3 text-gray-500 dark:text-gray-400">
			<p class="text-lg">{t('views.mindmap.noProjects')}</p>
			<a href="/projects" class="text-primary-600 hover:underline text-sm">
				{t('views.mindmap.createProject')}
			</a>
		</div>
	{:else}
		<div class="flex-1" style="height:calc(100vh - 80px)">
			<SvelteFlow
				bind:nodes
				bind:edges
				fitView
				fitViewOptions={{ padding: 0.1 }}
				minZoom={0.05}
				onnodedragstop={handleNodeDragStop}
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
	{/if}
</div>
