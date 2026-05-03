<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { apiGetAuth, apiPutAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { writable } from 'svelte/store';
  import { Alert, Button, Card, Input, Label, Select, Textarea } from 'flowbite-svelte';

  const title = writable('');
  const description = writable('');
  const dueDate = writable('');
  const startDate = writable('');
  const priority = writable(0);
  const percentDone = writable(0);
  const repeatAfter = writable(0);
  const repeatMode = writable('default');
  const error = writable('');
  const loading = writable(true);
  const saving = writable(false);

  onMount(async () => {
    const me = await getCurrentUser(); if (!me) { goto('/login'); return; }
    try {
      const task = await apiGetAuth<any>(`/tasks/${page.params.id}`);
      title.set(task.title ?? ''); description.set(task.description ?? '');
      dueDate.set(task.dueDate ? task.dueDate.substring(0, 10) : '');
      startDate.set(task.startDate ? task.startDate.substring(0, 10) : '');
      priority.set(task.priority ?? 0); percentDone.set(task.percentDone ?? 0);
      repeatAfter.set(task.repeatAfter ?? 0); repeatMode.set(task.repeatMode ?? 'default');
    } catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  });

  async function handleEdit(event: Event) {
    event.preventDefault();
    saving.set(true); error.set('');
    try {
      await apiPutAuth(`/tasks/${page.params.id}`, { title: $title, description: $description, dueDate: $dueDate ? new Date($dueDate).toISOString() : null, startDate: $startDate ? new Date($startDate).toISOString() : null, priority: $priority, percentDone: $percentDone, repeatAfter: $repeatAfter || null, repeatMode: $repeatAfter ? $repeatMode : null });
      goto(`/tasks/${page.params.id}`);
    } catch (e: any) { error.set(e.message); } finally { saving.set(false); }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/tasks/{page.params.id}" class="text-gray-400 hover:text-gray-600">← Back to Task</a>
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Edit Task</h1>
</div>

{#if $loading}
  <p class="text-gray-400">Loading...</p>
{:else}
  {#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
  <Card class="max-w-xl">
    <form onsubmit={handleEdit} class="flex flex-col gap-4">
      <div>
        <Label for="edit-title" class="mb-1">Title <span class="text-red-500">*</span></Label>
        <Input id="edit-title" type="text" bind:value={$title} required />
      </div>
      <div>
        <Label for="edit-desc" class="mb-1">Description</Label>
        <Textarea id="edit-desc" bind:value={$description} rows={3} />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="edit-start" class="mb-1">Start Date</Label>
          <Input id="edit-start" type="date" bind:value={$startDate} />
        </div>
        <div>
          <Label for="edit-due" class="mb-1">Due Date</Label>
          <Input id="edit-due" type="date" bind:value={$dueDate} />
        </div>
        <div>
          <Label for="edit-priority" class="mb-1">Priority</Label>
          <Select id="edit-priority" bind:value={$priority}>
            <option value={0}>— Unset</option>
            <option value={1}>Low</option><option value={2}>Medium</option><option value={3}>High</option><option value={4}>Urgent</option><option value={5}>Do Now</option>
          </Select>
        </div>
        <div>
          <Label for="edit-percent" class="mb-1">Percent Done</Label>
          <Select id="edit-percent" bind:value={$percentDone}>
            {#each [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as p}<option value={p}>{p}%</option>{/each}
          </Select>
        </div>
      </div>
      <fieldset class="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <legend class="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Repeat</legend>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm text-gray-500">Every</span>
          <Input type="number" bind:value={$repeatAfter} min={0} class="w-16" />
          <Select bind:value={$repeatMode} class="w-auto">
            <option value="default">periods</option>
            <option value="monthly">months</option>
            <option value="from_current_date">periods from current date</option>
          </Select>
        </div>
      </fieldset>
      <div class="flex gap-2">
        <Button type="submit" disabled={$saving}>{$saving ? 'Saving…' : 'Save Changes'}</Button>
        <Button href="/tasks/{page.params.id}" color="light">Cancel</Button>
      </div>
    </form>
  </Card>
{/if}
