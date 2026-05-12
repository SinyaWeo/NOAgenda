<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { writable } from 'svelte/store';
  import { Alert, Button, Card, Input, Label, Select } from 'flowbite-svelte';
  import { LinkOutline, CaretLeftSolid } from 'flowbite-svelte-icons';

  const webhooks = writable<any[]>([]);
  const loading = writable(true);
  const error = writable('');
  const success = writable('');
  const saving = writable(false);
  let newUrl = $state('');
  let newEvent = $state('task.created');
  let newSecret = $state('');
  const EVENT_OPTIONS = [
    'task.created',
    'task.updated',
    'task.deleted',
    'project.created',
    'project.updated',
    'project.deleted',
    'comment.created',
  ];

  onMount(async () => {
    const me = await getCurrentUser();
    if (!me) {
      goto('/user/login');
      return;
    }
    await load();
  });

  async function load() {
    loading.set(true);
    try {
      webhooks.set(await apiGetAuth<any[]>('/webhooks'));
    } catch (e: any) {
      error.set(e.message);
    } finally {
      loading.set(false);
    }
  }

  async function create(e: SubmitEvent) {
    e.preventDefault();
    if (!newUrl.trim()) return;
    saving.set(true);
    error.set('');
    success.set('');
    try {
      await apiPostAuth('/webhooks', {
        url: newUrl,
        event: newEvent,
        secret: newSecret || undefined,
        active: true,
      });
      newUrl = '';
      newSecret = '';
      success.set('Webhook created.');
      await load();
    } catch (e: any) {
      error.set(e.message);
    } finally {
      saving.set(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this webhook?')) return;
    try {
      await apiDeleteAuth(`/webhooks/${id}`);
      await load();
    } catch (e: any) {
      error.set(e.message);
    }
  }
</script>

<div class="flex items-center gap-3 mb-2">
  <a href="/user/settings" class="text-gray-400 hover:text-gray-600"
    ><CaretLeftSolid class="w-4 h-4 inline mr-1" /> Back</a
  >
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Webhooks</h1>
</div>
<p class="text-gray-500 mb-4">
  Receive HTTP POST callbacks when selected events happen.
</p>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

<Card class="mb-4">
  <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
    Add Webhook
  </h2>
  <form onsubmit={create} class="flex flex-col gap-4">
    <div>
      <Label for="wh-url" class="mb-1"
        >URL <span class="text-red-500">*</span></Label
      >
      <Input
        id="wh-url"
        type="url"
        bind:value={newUrl}
        placeholder="https://example.com/hook"
        required
      />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="wh-event" class="mb-1">Event</Label>
        <Select id="wh-event" bind:value={newEvent}>
          {#each EVENT_OPTIONS as ev}<option value={ev}>{ev}</option>{/each}
        </Select>
      </div>
      <div>
        <Label for="wh-secret" class="mb-1"
          >Secret <span class="text-xs text-gray-400">(optional)</span></Label
        >
        <Input
          id="wh-secret"
          type="text"
          bind:value={newSecret}
          placeholder="HMAC signing secret"
        />
      </div>
    </div>
    <div>
      <Button type="submit" disabled={$saving || !newUrl.trim()}
        >{$saving ? 'Creating…' : 'Create Webhook'}</Button
      >
    </div>
  </form>
</Card>

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else if $webhooks.length}
  <Card class="p-0 overflow-hidden">
    {#each $webhooks as wh, i}
      <div
        class="flex items-center gap-3 px-4 py-3 {i < $webhooks.length - 1
          ? 'border-b border-gray-100 dark:border-gray-700'
          : ''}"
      >
        <div class="flex-1 min-w-0">
          <p
            class="font-medium text-sm text-gray-900 dark:text-white m-0 break-all"
          >
            {wh.url}
          </p>
          <p class="text-xs text-gray-400 m-0">
            Event: <strong>{wh.event}</strong> · {wh.active
              ? 'Active'
              : 'Inactive'}
          </p>
        </div>
        <Button size="xs" color="red" onclick={() => remove(wh.id)}
          >Delete</Button
        >
      </div>
    {/each}
  </Card>
{:else}
  <div class="text-center py-10 text-gray-400">
    <LinkOutline class="w-10 h-10 mx-auto mb-2" />
    <p>No webhooks configured yet.</p>
  </div>
{/if}
