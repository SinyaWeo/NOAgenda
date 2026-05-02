<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { apiGetAuth, apiPostAuth, apiPutAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { writable, derived } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { Alert, Badge, Button, Card, Input, Select } from 'flowbite-svelte';
  import { CheckCircleOutline, CogOutline } from 'flowbite-svelte-icons';

  const project = writable<any>(null);
  const tasks = writable<any[]>([]);
  const views = writable<any[]>([]);
  const loading = writable(true);
  const error = writable('');
  let newTaskTitle = $state('');
  let addingTask = $state(false);
  const filterStatus = writable('');
  const filterPriority = writable('');

  const PRIORITY_LABELS = ['—', 'Low', 'Medium', 'High', 'Urgent', 'Do Now'];

  const filteredTasks = derived([tasks, filterStatus, filterPriority], ([$tasks, $status, $priority]) =>
    $tasks.filter((t: any) => {
      if ($status && t.status !== $status) return false;
      if ($priority && String(t.priority ?? 0) !== $priority) return false;
      return true;
    })
  );

  onMount(async () => {
    const me = await getCurrentUser(); if (!me) { goto('/login'); return; }
    const id = $page.params.id;
    try {
      const [p, t, v] = await Promise.all([apiGetAuth<any>(`/projects/${id}`), apiGetAuth<any[]>(`/tasks?projectId=${id}`), apiGetAuth<any[]>(`/projects/${id}/views`).catch(() => [])]);
      project.set(p); tasks.set(t); views.set(v);
    } catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  });

  async function quickAdd(e: SubmitEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || addingTask) return;
    addingTask = true;
    const id = $page.params.id;
    try {
      await apiPostAuth('/tasks', { title: newTaskTitle, project: { id: Number(id) } });
      newTaskTitle = '';
      tasks.set(await apiGetAuth<any[]>(`/tasks?projectId=${id}`));
    } catch (e: any) { error.set(e.message); } finally { addingTask = false; }
  }

  async function toggleStatus(taskId: number, current: string) {
    const next = current === 'open' ? 'in_progress' : current === 'in_progress' ? 'done' : 'open';
    try {
      const updated = await apiPutAuth<any>(`/tasks/${taskId}`, { status: next });
      tasks.update((list) => list.map((t) => (t.id === taskId ? updated : t)));
    } catch (e: any) { error.set(e.message); }
  }
</script>

{#if $loading}
  <p class="text-gray-400">Loading...</p>
{:else if $error}
  <Alert color="red">{$error}</Alert>
{:else if $project}
  <div class="flex items-start justify-between gap-4 mb-4">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">{$project.name ?? $project.title}</h1>
      {#if $project.description}<p class="text-gray-500 dark:text-gray-400 m-0">{$project.description}</p>{/if}
    </div>
    <Button href="/projects/{$project.id}/edit" color="light" size="sm"><CogOutline class="w-4 h-4 mr-1" />Settings</Button>
  </div>

  {#if $views.length}
    <nav class="flex gap-2 mb-4 flex-wrap">
      {#each $views as v}
        <a href="/projects/{$project.id}/{v.id}" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 no-underline hover:bg-primary-200">{v.title}</a>
      {/each}
    </nav>
  {/if}

  <form onsubmit={quickAdd} class="flex gap-2 mb-4">
    <Input type="text" bind:value={newTaskTitle} placeholder="Add a task…" class="flex-1" />
    <Button type="submit" disabled={addingTask || !newTaskTitle.trim()}>{addingTask ? 'Adding…' : 'Add Task'}</Button>
  </form>

  <div class="flex items-center gap-3 mb-4 flex-wrap">
    <Select bind:value={$filterStatus} class="w-auto">
      <option value="">All statuses</option>
      <option value="open">Open</option>
      <option value="in_progress">In Progress</option>
      <option value="done">Done</option>
    </Select>
    <Select bind:value={$filterPriority} class="w-auto">
      <option value="">All priorities</option>
      <option value="1">Low</option><option value="2">Medium</option><option value="3">High</option><option value="4">Urgent</option><option value="5">Do Now</option>
    </Select>
    {#if $filterStatus || $filterPriority}
      <Button size="sm" color="light" onclick={() => { filterStatus.set(''); filterPriority.set(''); }}>Clear</Button>
    {/if}
    <span class="text-xs text-gray-400 ml-auto">{$filteredTasks.length} / {$tasks.length} tasks</span>
  </div>

  {#if $tasks.length === 0}
    <div class="text-center py-12 text-gray-400">
      <CheckCircleOutline class="w-12 h-12 mx-auto mb-3" />
      <p>No tasks yet. Add one above or <a href="/tasks/create?projectId={$project.id}" class="text-primary-600 hover:underline">create with more options</a>.</p>
    </div>
  {:else if $filteredTasks.length === 0}
    <p class="text-gray-400">No tasks match the current filters.</p>
  {:else}
    <Card class="p-0 overflow-hidden">
      {#each $filteredTasks as task, i}
        <div class="flex items-center gap-2.5 px-4 py-3 {i < $filteredTasks.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}">
          <button onclick={() => toggleStatus(task.id, task.status)} class="shrink-0 p-0.5 text-gray-400 hover:text-primary-500 transition-colors" title="Cycle status">
            <span class="w-3 h-3 rounded-full block" data-status={task.status}></span>
          </button>
          <a href="/tasks/{task.id}" class="flex-1 truncate font-medium text-gray-800 dark:text-gray-200 hover:underline {task.status === 'done' ? 'line-through text-gray-400' : ''}">{task.title}</a>
          {#if task.priority}<span class="text-xs shrink-0" data-priority={task.priority}>{PRIORITY_LABELS[task.priority] ?? task.priority}</span>{/if}
          {#if task.dueDate}<span class="text-xs shrink-0 {new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'}">{new Date(task.dueDate).toLocaleDateString()}</span>{/if}
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0" data-status={task.status}>{task.status?.replace('_', ' ') ?? 'open'}</span>
        </div>
      {/each}
    </Card>
  {/if}
{:else}
  <p>Project not found.</p>
{/if}
