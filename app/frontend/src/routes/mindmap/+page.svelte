<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import {
        SvelteFlow,
        Controls,
        Background,
        BackgroundVariant,
        type Node as FlowNode,
        type Edge,
    } from '@xyflow/svelte';
    import '@xyflow/svelte/dist/style.css';
    import { authSession } from '$lib/auth';
    import { apiGetAuth, apiPatchAuth } from '$lib/api';
    import { findDropTarget } from '$lib/mindmap';
    import { showToast } from '$lib/toast';
    import { errMessage } from '$lib/errors';
    import type { Node as AppNode } from '$lib/types';

    let loading = $state(true);
    let error = $state('');

    let nodes = $state<FlowNode[]>([]);
    let edges = $state<Edge[]>([]);

    function toFlowNode(n: AppNode, x: number, y: number): FlowNode {
        return {
            id: String(n.id),
            position: { x, y },
            data: { label: n.name ?? n.title ?? `Node ${n.id}` },
            style:
                n.type === 'project'
                    ? 'background:#3b82f6;color:#fff;border-radius:8px;padding:8px 14px;font-weight:600;border:none;'
                    : 'background:#f3f4f6;color:#111;border-radius:6px;padding:6px 12px;border:1px solid #d1d5db;',
        };
    }

    async function loadGraph() {
        try {
            const [projects, tasks] = await Promise.all([
                apiGetAuth<AppNode[]>('/nodes?type=project'),
                apiGetAuth<AppNode[]>('/tasks').catch((): AppNode[] => []),
            ]);

            const byParent = new Map<number, AppNode[]>();
            for (const t of tasks) {
                if (t.parentId === undefined || t.parentId === null) continue;
                if (!byParent.has(t.parentId)) byParent.set(t.parentId, []);
                byParent.get(t.parentId)?.push(t);
            }

            const graphNodes: FlowNode[] = [];
            const graphEdges: Edge[] = [];
            const visited = new Set<number>();

            const placeChildren = (
                parentId: number,
                parentX: number,
                parentY: number,
            ) => {
                const children = (byParent.get(parentId) ?? []).filter(
                    (c) => !visited.has(Number(c.id)),
                );
                if (!children.length) return;

                const gap = 190;
                const startX = parentX - ((children.length - 1) * gap) / 2;
                const childY = parentY + 120;

                children.forEach((child, i) => {
                    const childId = Number(child.id);
                    visited.add(childId);
                    const childX = startX + i * gap;

                    graphNodes.push(toFlowNode(child, childX, childY));
                    graphEdges.push({
                        id: `e-${parentId}-${childId}`,
                        source: String(parentId),
                        target: String(childId),
                    });

                    placeChildren(childId, childX, childY);
                });
            };

            projects.forEach((p, i) => {
                const projectId = Number(p.id);
                visited.add(projectId);
                const projectX = i * 260;
                graphNodes.push(toFlowNode(p, projectX, 0));
                placeChildren(projectId, projectX, 0);
            });

            nodes = graphNodes;
            edges = graphEdges;
        } catch (e: unknown) {
            error = errMessage(e, 'Failed to load');
        } finally {
            loading = false;
        }
    }

    async function handleNodeDragStop({
        targetNode,
        nodes: draggedNodes,
    }: {
        targetNode: FlowNode | null;
        nodes: FlowNode[];
    }) {
        // `targetNode` is the node that was dragged; the new parent is the node it was dropped on.
        const movedNode = targetNode ?? draggedNodes[0];
        if (!movedNode) return;
        const parent = findDropTarget(movedNode, nodes);
        if (!parent) return; // just repositioned, not dropped on anything
        if (edges.some((e) => e.source === parent.id && e.target === movedNode.id)) return; // already its parent
        const nodeId = Number(movedNode.id);
        const newParentId = Number(parent.id);
        try {
            await apiPatchAuth(`/nodes/${nodeId}/move`, {
                parentId: newParentId,
            });
            edges = edges.filter((e) => e.target !== movedNode.id);
            edges = [
                ...edges,
                {
                    id: `e-${newParentId}-${nodeId}`,
                    source: String(newParentId),
                    target: movedNode.id,
                },
            ];
            showToast('Moved', 'success');
        } catch (e: unknown) {
            showToast(errMessage(e, 'Could not move it there'), 'error');
            await loadGraph(); // put the map back as the server has it
        }
    }

    onMount(async () => {
        if ($authSession.status === 'unauthenticated') {
            goto('/user/login');
            return;
        }
        await loadGraph();
    });
</script>

<svelte:head>
    <title>MindMap | NOAgenda</title>
</svelte:head>

<div class="flex flex-col h-full">
    <div
        class="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700"
    >
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            MindMap
        </h1>
        <span class="text-sm text-gray-500 dark:text-gray-400">
            All projects and tasks · Drag onto another node to reparent
        </span>
    </div>

    {#if loading}
        <div
            class="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400"
        >
            Loading…
        </div>
    {:else if error}
        <div class="flex flex-1 items-center justify-center text-red-500">
            {error}
        </div>
    {:else if nodes.length === 0}
        <div
            class="flex flex-1 items-center justify-center flex-col gap-3 text-gray-400"
        >
            <p class="text-lg">No projects yet.</p>
            <a href="/projects" class="text-primary-600 hover:underline text-sm"
                >Create a project to get started</a
            >
        </div>
    {:else}
        <div class="flex-1" style="height:calc(100vh - 80px)">
            <SvelteFlow
                bind:nodes
                bind:edges
                fitView
                onnodedragstop={handleNodeDragStop}
            >
                <Controls />
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                />
            </SvelteFlow>
        </div>
    {/if}
</div>
