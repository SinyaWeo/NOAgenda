<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiPostAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Alert, Button } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

  const error = writable(''); const success = writable(''); const loading = writable(false);
  onMount(async () => { const me = await getCurrentUser(); if (!me) goto('/user/login'); });

  async function requestDeletion() {
    if (!confirm('Are you sure you want to request account deletion? This cannot be undone.')) return;
    loading.set(true); error.set(''); success.set('');
    try { await apiPostAuth('/user/deletion/request', {}); success.set('Deletion requested. Your account will be deleted after a grace period.'); }
    catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  }

  async function cancelDeletion() {
    loading.set(true); error.set('');
    try { await apiPostAuth('/user/deletion/cancel', {}); success.set('Deletion request cancelled.'); }
    catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/user/settings" class="text-gray-400 hover:text-gray-600">← Back</a>
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Account Deletion</h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

<div class="max-w-md border-2 border-red-200 dark:border-red-900 rounded-lg p-5">
  <div class="flex items-start gap-3 mb-5">
    <ExclamationCircleOutline class="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
    <div>
      <p class="font-bold text-red-600 m-0">This will permanently delete your account</p>
      <p class="text-sm text-gray-500 mt-1 m-0">All your data including projects, tasks, and settings will be permanently removed. There is a grace period during which you can cancel.</p>
    </div>
  </div>
  <div class="flex gap-3 flex-wrap">
    <Button color="red" onclick={requestDeletion} disabled={$loading}>{$loading ? 'Processing…' : 'Request Account Deletion'}</Button>
    <Button color="light" onclick={cancelDeletion} disabled={$loading}>Cancel Deletion Request</Button>
  </div>
</div>
