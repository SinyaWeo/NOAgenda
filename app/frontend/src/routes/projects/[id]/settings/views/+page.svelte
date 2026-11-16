<script lang="ts">
  import { errMessage } from '$lib/errors';
  import { writable } from 'svelte/store';
  import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
  import { loadOnParamChange } from '$lib/param-loader.svelte';
  import type { ProjectView, ViewType } from '$lib/types';
  import { page } from '$app/state';
  import { Alert, Button, Card, Input, Label, Select } from 'flowbite-svelte';
  import { TableColumnOutline, CaretLeftSolid } from 'flowbite-svelte-icons';

  const views = writable<ProjectView[]>([]);
  const loading = writable(true);
  const error = writable('');
  let newViewTitle = $state('');
  let newViewType = $state<ViewType>('list');

  async function load() {
    views.set(await apiGetAuth<ProjectView[]>(`/projects/${page.params.id}/views`));
  }

  async function addView(e: Event) {
    e.preventDefault();
    try {
      await apiPostAuth(`/projects/${page.params.id}/views`, {
        title: newViewTitle,
        viewType: newViewType,
      });
      newViewTitle = '';
      await load();
    } catch (e: unknown) {
      error.set(errMessage(e));
    }
  }

  async function deleteView(viewId: number) {
    try {
      await apiDeleteAuth(`/projects/${page.params.id}/views/${viewId}`);
      await load();
    } catch (e: unknown) {
      error.set(errMessage(e));
    }
  }

  loadOnParamChange(() => page.params.id ?? '', async (id, isStale) => {
    const list = await apiGetAuth<ProjectView[]>(`/projects/${id}/views`);
    if (!isStale()) views.set(list);
  }, loading, error);
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/projects/{page.params.id}" class="text-gray-400 hover:text-gray-600"
    ><CaretLeftSolid class="w-4 h-4 inline mr-1" /> Back</a
  >
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
    Project Views
  </h1>
</div>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="max-w-xl mb-4">
  <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
    Add View
  </h2>
  <form onsubmit={addView} class="flex flex-col gap-3">
    <div>
      <Label for="view-title" class="mb-1">View Name</Label>
      <Input
        id="view-title"
        type="text"
        bind:value={newViewTitle}
        placeholder="e.g. My Board"
        required
      />
    </div>
    <div>
      <Label for="view-type" class="mb-1">Type</Label>
      <Select id="view-type" bind:value={newViewType}>
        <option value="list">List</option>
        <option value="kanban">Kanban</option>
        <option value="gantt">Gantt</option>
        <option value="table">Table</option>
        <option value="mindmap">MindMap</option>
      </Select>
    </div>
    <div><Button type="submit">Add View</Button></div>
  </form>
</Card>

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else if $views.length}
  <Card class="max-w-xl p-0 overflow-hidden">
    {#each $views as view, i (view.id)}
      <div
        class="flex items-center gap-3 p-4 {i < $views.length - 1
          ? 'border-b border-gray-100 dark:border-gray-700'
          : ''}"
      >
        <div class="flex-1">
          <a
            href="/projects/{page.params.id}/{view.id}"
            class="font-medium text-gray-900 dark:text-white hover:underline"
            >{view.title}</a
          >
          <span class="text-xs text-gray-400 ml-2">{view.viewType}</span>
        </div>
        <Button size="sm" color="red" onclick={() => deleteView(view.id)}
          >Delete</Button
        >
      </div>
    {/each}
  </Card>
{:else}
  <div class="text-center py-10 text-gray-400">
    <TableColumnOutline class="w-10 h-10 mx-auto mb-2" />
    <p>No views yet. Add one above.</p>
  </div>
{/if}
