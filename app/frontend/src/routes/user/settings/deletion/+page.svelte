<script lang="ts">
  import { errMessage } from '$lib/errors';
  import { writable } from 'svelte/store';
  import { apiPostAuth } from '$lib/api';
  import { authSession, refreshCurrentUser } from '$lib/auth';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { Alert, Button, Input, Label } from 'flowbite-svelte';
  import {
    ExclamationCircleOutline,
    CaretLeftSolid,
  } from 'flowbite-svelte-icons';

  const error = writable('');
  const success = writable('');
  const loading = writable(false);
  let password = $state('');
  let scheduledAt = $state<string | null>(null);
  let graceDays = $state(7);
  onMount(() => {
    const me = get(authSession).user;
    // A request made earlier (or in another tab) is still pending: show it instead of the bare form.
    scheduledAt = me?.isDeletionRequested ? (me.deletionScheduledAt ?? null) : null;
  });

  async function requestDeletion() {
    if (!password) {
      error.set('Enter your password to confirm.');
      return;
    }
    if (
      !confirm(
        `Delete your account? After ${graceDays} days your account and the projects you own will be permanently removed. You can cancel until then.`,
      )
    )
      return;
    loading.set(true);
    error.set('');
    success.set('');
    try {
      const r = await apiPostAuth<{ scheduledAt: string; graceDays: number }>('/user/deletion/request', { password });
      scheduledAt = r.scheduledAt;
      void refreshCurrentUser();
      graceDays = r.graceDays ?? graceDays;
      password = '';
      success.set(
        `Deletion scheduled for ${new Date(r.scheduledAt).toLocaleString()}. You can still sign in and cancel until then.`,
      );
    } catch (e: unknown) {
      error.set(errMessage(e));
    } finally {
      loading.set(false);
    }
  }

  async function cancelDeletion() {
    loading.set(true);
    error.set('');
    try {
      await apiPostAuth('/user/deletion/cancel', {});
      scheduledAt = null;
      void refreshCurrentUser();
      success.set('Deletion request cancelled. Your account stays as it is.');
    } catch (e: unknown) {
      error.set(errMessage(e));
    } finally {
      loading.set(false);
    }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/user/settings" class="text-gray-400 hover:text-gray-600"
    ><CaretLeftSolid class="w-4 h-4 inline mr-1" /> Back</a
  >
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
    Account Deletion
  </h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}
{#if scheduledAt}
  <Alert color="yellow" class="mb-4">
    Your account is scheduled for deletion on
    <strong>{new Date(scheduledAt).toLocaleString()}</strong>. You can still sign in and cancel
    until then.
  </Alert>
{/if}

<div
  class="max-w-md border-2 border-red-200 dark:border-red-900 rounded-lg p-5"
>
  <div class="flex items-start gap-3 mb-5">
    <ExclamationCircleOutline class="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
    <div>
      <p class="font-bold text-red-600 m-0">
        This will permanently delete your account
      </p>
      <p class="text-sm text-gray-500 mt-1 m-0">
        After a {graceDays}-day grace period your account and the projects you
        own (with their tasks, comments and attachments), your labels, teams,
        filters and settings are permanently removed. Projects shared with you
        are not affected; tasks you created in other people's projects stay
        there without your name. Download a copy first under
        <a href="/user/settings/data-export" class="underline">Data Export</a>.
      </p>
    </div>
  </div>
  <div class="mb-4">
    <Label for="del-password" class="mb-1">Confirm with your password</Label>
    <Input id="del-password" type="password" autocomplete="current-password" bind:value={password} />
  </div>
  <div class="flex gap-3 flex-wrap">
    {#if scheduledAt}
      <Button color="light" onclick={cancelDeletion} disabled={$loading}
        >Cancel Deletion Request</Button
      >
    {:else}
      <Button color="red" onclick={requestDeletion} disabled={$loading}
        >{$loading ? 'Processing…' : 'Request Account Deletion'}</Button
      >
    {/if}
  </div>
</div>
