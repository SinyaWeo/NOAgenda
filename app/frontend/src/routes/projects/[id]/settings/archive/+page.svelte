<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { apiGetAuth, apiPatchAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { writable } from 'svelte/store';
  import { Alert, Button, Card } from 'flowbite-svelte';

  const project = writable<any>(null);
  const loading = writable(true);
  const saving = writable(false);
  const error = writable('');
  const success = writable('');

  onMount(async () => {
    const me = await getCurrentUser(); if (!me) { goto('/user/login'); return; }
    try { project.set(await apiGetAuth<any>(`/projects/${page.params.id}`)); }
    catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  });

  async function toggleArchive() {
    const p = $project; if (!p) return;
    saving.set(true); error.set(''); success.set('');
    try {
      const endpoint = p.isArchived ? `/projects/${p.id}/unarchive` : `/projects/${p.id}/archive`;
      const updated = await apiPatchAuth<any>(endpoint, {});
      project.set(updated);
      success.set(updated.isArchived ? 'Project archived.' : 'Project restored.');
    } catch (e: any) { error.set(e.message); } finally { saving.set(false); }
  }
</script>

<div class="flex items-center gap-3 mb-4">
  <a href="/projects/{page.params.id}/edit" class="text-gray-400 hover:text-gray-600">← Back</a>
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Archive Project</h1>
</div>
<p class="text-gray-500 dark:text-gray-400 mb-4">Manage whether this project appears in your active project list.</p>

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else if $error}
  <Alert color="red">{$error}</Alert>
{:else if $project}
  <Card class="max-w-md">
    {#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}
    <p class="text-gray-900 dark:text-white mb-1">Project: <strong>{$project.name}</strong></p>
    <p class="mb-4">Status: <strong class={$project.isArchived ? 'text-red-600' : 'text-green-600'}>{$project.isArchived ? 'Archived' : 'Active'}</strong></p>
    {#if $project.isArchived}
      <p class="text-gray-500 text-sm mb-4">This project is hidden from the main list and can be restored at any time.</p>
      <Button onclick={toggleArchive} disabled={$saving}>{$saving ? 'Restoring…' : 'Restore Project'}</Button>
    {:else}
      <p class="text-gray-500 text-sm mb-4">Archiving will hide this project from active listings while preserving its data.</p>
      <Button color="light" onclick={toggleArchive} disabled={$saving}>{$saving ? 'Archiving…' : 'Archive Project'}</Button>
    {/if}
  </Card>
{/if}
