<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { apiGetAuth, apiPutAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { writable } from 'svelte/store';
  import { Alert, Button, Card } from 'flowbite-svelte';

  const project = writable<any>(null);
  const loading = writable(true);
  const saving = writable(false);
  const error = writable('');

  onMount(async () => {
    const me = await getCurrentUser(); if (!me) { goto('/login'); return; }
    try { project.set(await apiGetAuth<any>(`/projects/${page.params.id}`)); }
    catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  });

  async function duplicate() {
    saving.set(true); error.set('');
    try { const newProject = await apiPutAuth<any>(`/projects/${page.params.id}/duplicate`, {}); goto(`/projects/${newProject.id}`); }
    catch (e: any) { error.set(e.message); saving.set(false); }
  }
</script>

<div class="flex items-center gap-3 mb-4">
  <a href="/projects/{page.params.id}/edit" class="text-gray-400 hover:text-gray-600">← Back</a>
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Duplicate Project</h1>
</div>
<p class="text-gray-500 dark:text-gray-400 mb-4">Create a new project from this one without affecting the original.</p>

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else if $error}
  <Alert color="red">{$error}</Alert>
{:else if $project}
  <Card class="max-w-md">
    <p class="mb-2 text-gray-900 dark:text-white">Source project: <strong>{$project.name}</strong></p>
    <Alert color="yellow" class="mb-4">The duplicate will use the same name with a "(copy)" suffix. Tasks are not duplicated.</Alert>
    <Button onclick={duplicate} disabled={$saving}>{$saving ? 'Duplicating…' : 'Duplicate Project'}</Button>
  </Card>
{/if}
