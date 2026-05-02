<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { apiGetAuth, apiPostAuth, apiPutAuth, apiDeleteAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { Alert, Button, Card, Input } from 'flowbite-svelte';
  import { FilterOutline } from 'flowbite-svelte-icons';

  interface Filter { id: number; name: string; description: string; filters: any; }
  const filters = writable<Filter[]>([]);
  const loading = writable(true);
  const error = writable('');
  let editingId = $state<number | null>(null);
  let newName = $state('');
  let newDescription = $state('');
  let editName = $state('');
  let editDescription = $state('');

  async function load() { filters.set(await apiGetAuth<Filter[]>('/filters')); }

  async function create(e: Event) {
    e.preventDefault();
    try { await apiPostAuth('/filters', { name: newName, description: newDescription }); newName = ''; newDescription = ''; await load(); }
    catch (e: any) { error.set(e.message); }
  }

  function startEdit(f: Filter) { editingId = f.id; editName = f.name; editDescription = f.description; }

  async function saveEdit(id: number) {
    try { await apiPutAuth(`/filters/${id}`, { name: editName, description: editDescription }); editingId = null; await load(); }
    catch (e: any) { error.set(e.message); }
  }

  async function deleteFilter(id: number) {
    if (!confirm('Delete this filter?')) return;
    try { await apiDeleteAuth(`/filters/${id}`); await load(); }
    catch (e: any) { error.set(e.message); }
  }

  onMount(async () => {
    const me = await getCurrentUser(); if (!me) { goto('/login'); return; }
    try { await load(); } catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  });
</script>

<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Saved Filters</h1>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="mb-4">
  <form onsubmit={create} class="flex gap-2 flex-wrap">
    <Input type="text" bind:value={newName} placeholder="Filter name" required class="flex-1 min-w-36" />
    <Input type="text" bind:value={newDescription} placeholder="Description (optional)" class="flex-1 min-w-36" />
    <Button type="submit">+ Save Filter</Button>
  </form>
</Card>

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else if $filters.length === 0}
  <div class="text-center py-12 text-gray-400">
    <FilterOutline class="w-12 h-12 mx-auto mb-3" />
    <p>No saved filters yet. Create one above.</p>
  </div>
{:else}
  <Card class="p-0 overflow-hidden">
    {#each $filters as filter, i}
      <div class="flex items-center gap-3 p-4 {i < $filters.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}">
        {#if editingId === filter.id}
          <form onsubmit={(e) => { e.preventDefault(); saveEdit(filter.id); }} class="flex gap-2 flex-1 flex-wrap">
            <Input type="text" bind:value={editName} required class="flex-1 min-w-36" />
            <Input type="text" bind:value={editDescription} class="flex-1 min-w-36" />
            <Button type="submit" size="sm">Save</Button>
            <Button type="button" color="light" size="sm" onclick={() => (editingId = null)}>Cancel</Button>
          </form>
        {:else}
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 dark:text-white m-0">{filter.name}</p>
            {#if filter.description}<p class="text-sm text-gray-500 dark:text-gray-400 m-0">{filter.description}</p>{/if}
          </div>
          <div class="flex gap-2 shrink-0">
            <Button size="sm" color="light" onclick={() => startEdit(filter)}>Edit</Button>
            <Button size="sm" color="red" onclick={() => deleteFilter(filter.id)}>Delete</Button>
          </div>
        {/if}
      </div>
    {/each}
  </Card>
{/if}
