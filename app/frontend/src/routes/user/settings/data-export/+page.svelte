<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiPostAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Alert, Button, Card } from 'flowbite-svelte';

  const error = writable(''); const success = writable(''); const loading = writable(false);
  onMount(async () => { const me = await getCurrentUser(); if (!me) goto('/login'); });

  async function requestExport() {
    loading.set(true); error.set(''); success.set('');
    try { await apiPostAuth('/user/export/request', {}); success.set('Export requested. You will receive an email with your data.'); }
    catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/user/settings" class="text-gray-400 hover:text-gray-600">← Back</a>
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Data Export</h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

<Card class="max-w-md">
  <p class="text-sm text-gray-500 mb-4">Request a complete copy of all your data. You'll receive an email with a download link when the export is ready.</p>
  <Button onclick={requestExport} disabled={$loading}>{$loading ? 'Requesting…' : 'Request Data Export'}</Button>
</Card>
