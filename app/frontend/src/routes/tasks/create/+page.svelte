<script lang="ts">
  import { dateInputToIso } from '$lib/dates';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { apiPostAuth, apiGetAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { writable, get } from 'svelte/store';
  import { onMount } from 'svelte';
  import {
    Alert,
    Button,
    Card,
    Input,
    Label,
    Select,
    Textarea,
  } from 'flowbite-svelte';
  import { CaretLeftSolid } from 'flowbite-svelte-icons';
  import { showToast } from '$lib/toast';

  const title = writable('');
  const description = writable('');
  const projectId = writable<number | undefined>(undefined);
  const dueDate = writable('');
  const priority = writable(0);
  const error = writable('');
  const loading = writable(false);
  const projects = writable<any[]>([]);

  onMount(async () => {
    const me = await getCurrentUser();
    if (!me) {
      goto('/user/login');
      return;
    }
    const pid = page.url.searchParams.get('projectId');
    if (pid) projectId.set(Number(pid));
    try {
      projects.set(await apiGetAuth<any[]>('/projects'));
    } catch (_) {}
  });

  async function handleCreate(event: Event) {
    event.preventDefault();
    loading.set(true);
    error.set('');
    try {
      const pid = get(projectId);
      const task = await apiPostAuth<any>('/tasks', {
        title: get(title),
        description: get(description),
        ...(pid ? { project: { id: pid } } : {}),
        dueDate: dateInputToIso(get(dueDate)) ?? undefined,
        priority: Number(get(priority)),
      });
      showToast('Task created!', 'success');
      goto(`/tasks/${task.id}`);
    } catch (e: any) {
      error.set(e.message);
    } finally {
      loading.set(false);
    }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a
    href={$projectId ? `/projects/${$projectId}` : '/tasks'}
    class="text-gray-400 hover:text-gray-600"
    ><CaretLeftSolid class="w-4 h-4 inline mr-1" /> Back</a
  >
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
    Create Task
  </h1>
</div>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="max-w-xl">
  <form onsubmit={handleCreate} class="flex flex-col gap-4">
    <div>
      <Label for="task-title" class="mb-1"
        >Title <span class="text-red-500">*</span></Label
      >
      <Input id="task-title" type="text" bind:value={$title} required />
    </div>
    <div>
      <Label for="task-desc" class="mb-1">Description</Label>
      <Textarea id="task-desc" bind:value={$description} rows={3} />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="task-due" class="mb-1">Due Date</Label>
        <Input id="task-due" type="date" bind:value={$dueDate} />
      </div>
      <div>
        <Label for="task-priority" class="mb-1">Priority</Label>
        <Select id="task-priority" bind:value={$priority}>
          <option value={0}>— Unset</option>
          <option value={1}>Low</option><option value={2}>Medium</option><option
            value={3}>High</option
          ><option value={4}>Urgent</option><option value={5}>Do Now</option>
        </Select>
      </div>
    </div>
    {#if !$projectId}
      <div>
        <Label for="task-project" class="mb-1"
          >Project <span class="text-red-500">*</span></Label
        >
        <Select id="task-project" bind:value={$projectId} required>
          <option value={undefined}>Select a project…</option>
          {#each $projects as p}<option value={p.id}>{p.name ?? p.title}</option
            >{/each}
        </Select>
      </div>
    {/if}
    <div class="flex gap-2">
      <Button type="submit" disabled={$loading}
        >{$loading ? 'Creating…' : 'Create Task'}</Button
      >
      <Button
        href={$projectId ? `/projects/${$projectId}` : '/tasks'}
        color="light">Cancel</Button
      >
    </div>
  </form>
</Card>
