<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiPostAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';

  let email = $state(''); let password = $state('');
  const error = writable(''); const success = writable(''); const saving = writable(false);

  onMount(async () => { const me = await getCurrentUser(); if (!me) goto('/user/login'); });

  async function handleSave(e: Event) {
    e.preventDefault(); saving.set(true); error.set(''); success.set('');
    try { await apiPostAuth('/user/settings/email', { email, password }); success.set('Email update request sent. Check your inbox.'); email = ''; password = ''; }
    catch (e: any) { error.set(e.message); } finally { saving.set(false); }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/user/settings" class="text-gray-400 hover:text-gray-600">← Back</a>
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Update Email</h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

<Card class="max-w-xl">
  <p class="text-sm text-gray-500 mb-4">A confirmation link will be sent to the new address. You'll need to verify it before the change takes effect.</p>
  <form onsubmit={handleSave} class="flex flex-col gap-4">
    <div>
      <Label for="new-email" class="mb-1">New Email Address</Label>
      <Input id="new-email" type="email" bind:value={email} required />
    </div>
    <div>
      <Label for="email-pw" class="mb-1">Current Password</Label>
      <Input id="email-pw" type="password" bind:value={password} required />
    </div>
    <div class="pt-2 border-t border-gray-100 dark:border-gray-700">
      <Button type="submit" disabled={$saving}>{$saving ? 'Sending…' : 'Update Email'}</Button>
    </div>
  </form>
</Card>
