<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGetAuth, apiPatchAuth } from '$lib/api';
  import { errMessage } from '$lib/errors';
  import { findDropTarget } from '$lib/mindmap';
  import { showToast } from '$lib/toast';
  import type { Node as AppNode } from '$lib/types';
  import {
    SvelteFlow,
    Controls,
    Background,
    BackgroundVariant,
    type Node as FlowNode,
    type Edge,
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

  function appNodeToFlowNode(n: AppNode, x: number, y: number): FlowNode {
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

  async function loadMindmapTree(id: string) {
    try {
      const projectNode = await apiGetAuth<AppNode>(`/nodes/${id}`);
      mmNodes = [appNodeToFlowNode(projectNode, 400, 0)];
      mmEdges = [];
      const children = await apiGetAuth<AppNode[]>(`/nodes/${id}/children`);
      children.forEach((child, i) => {
        mmNodes = [...mmNodes, appNodeToFlowNode(child, i * 200, 120)];
        mmEdges = [
          ...mmEdges,
          { id: `e-${id}-${child.id}`, source: id, target: String(child.id) },
        ];
        expandedMmIds.add(child.id);
      });
    } catch (e: unknown) {
      showToast(errMessage(e, 'Could not load the mind map'), 'error');
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
      const parent = mmNodes.find((n) => n.id === String(nodeId));
      const baseX = parent?.position.x ?? 0;
      const baseY = (parent?.position.y ?? 0) + 120;
      mmNodes = [
        ...mmNodes,
        ...children.map((c, i) =>
          appNodeToFlowNode(c, baseX + i * 180 - (children.length - 1) * 90, baseY),
        ),
      ];
      mmEdges = [
        ...mmEdges,
        ...children.map((c) => ({
          id: `e-${nodeId}-${c.id}`,
          source: String(nodeId),
          target: String(c.id),
        })),
      ];
    } catch (e: unknown) {
      expandedMmIds.delete(nodeId); // let the user retry
      showToast(errMessage(e, 'Could not load the children'), 'error');
    }
  }

  async function onMmNodeDragStop({
    targetNode,
    nodes: draggedNodes,
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
      mmEdges = [
        ...mmEdges,
        { id: `e-${parent.id}-${node.id}`, source: parent.id, target: node.id },
      ];
      showToast('Moved', 'success');
    } catch (e: unknown) {
      showToast(errMessage(e, 'Could not move it there'), 'error');
    }
  }

  onMount(() => {
    void loadMindmapTree(projectId);
  });
</script>

{#if mmNodes.length > 0}
  <div
    style="height: 600px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;"
  >
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
  <p class="text-xs text-gray-400 mt-2">
    Click a node to expand children · Drag onto another node to reparent
  </p>
{:else if loaded}
  <div class="text-center py-10 text-gray-400">
    <p>No tasks in this project to show in the MindMap.</p>
  </div>
{/if}
