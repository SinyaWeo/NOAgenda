<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiDeleteAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Alert, Button } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

  const error = writable('');
  const loading = writable(false);
  onMount(async () => { const me = await getCurrentUser(); if (!me) goto('/user/login'); });

  async function handleDelete() {
    if (!confirm('Permanently delete this project and all its tasks?')) return;
    loading.set(true);
    try { await apiDeleteAuth(`/projects/${page.params.id}`); goto('/projects'); }
    catch (e: any) { error.set(e.message); loading.set(false); }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/projects/{page.params.id}/edit" class="text-gray-400 hover:text-gray-600">← Back</a>
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Delete Project</h1>
</div>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<div class="border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 rounded-lg p-5 max-w-lg">
  <div class="flex gap-3 mb-4">
    <ExclamationCircleOutline class="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
    <div>
      <p class="font-bold text-red-600 dark:text-red-400 m-0">This action cannot be undone</p>
      <p class="text-sm text-gray-600 dark:text-gray-300 m-0">Permanently deletes the project and <strong>all its tasks</strong>. Once deleted, there is no way to recover this data.</p>
    </div>
  </div>
  <div class="flex gap-2">
    <Button color="red" disabled={$loading} onclick={handleDelete}>{$loading ? 'Deleting…' : 'Delete Project'}</Button>
    <Button href="/projects/{page.params.id}/edit" color="light">Cancel</Button>
  </div>
</div>
