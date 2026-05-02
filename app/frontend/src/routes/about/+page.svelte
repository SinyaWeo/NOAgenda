<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { apiGetAuth } from '$lib/api';
  import { Alert, Card } from 'flowbite-svelte';

  const info = writable<any>(null);
  const error = writable('');

  onMount(async () => {
    try { info.set(await apiGetAuth<any>('/info')); }
    catch (e: any) { error.set(e.message); }
  });
</script>

<div class="max-w-xl">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">About NOAgenda</h1>
  <p class="text-gray-500 dark:text-gray-400 mb-6">A project-focused task manager built with NestJS and SvelteKit.</p>

  {#if $error}
    <Alert color="red">{$error}</Alert>
  {:else if $info}
    <Card>
      <dl class="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3 m-0">
        <dt class="text-gray-500 dark:text-gray-400">Name</dt>
        <dd class="text-gray-900 dark:text-white font-medium m-0">{$info.name ?? 'NOAgenda'}</dd>
        <dt class="text-gray-500 dark:text-gray-400">Version</dt>
        <dd class="text-gray-900 dark:text-white font-medium m-0">{$info.version ?? '—'}</dd>
        <dt class="text-gray-500 dark:text-gray-400">Built at</dt>
        <dd class="text-gray-900 dark:text-white font-medium m-0">{$info.builtAt ?? '—'}</dd>
        <dt class="text-gray-500 dark:text-gray-400">Commit</dt>
        <dd class="font-mono text-sm text-gray-900 dark:text-white m-0">{$info.commit ?? '—'}</dd>
      </dl>
    </Card>
  {:else}
    <p class="text-gray-400">Loading…</p>
  {/if}
</div>
