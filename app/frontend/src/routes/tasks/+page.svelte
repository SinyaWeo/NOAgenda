<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGetAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { Alert, Button, Card } from 'flowbite-svelte';
  import {
    CheckCircleOutline,
    ChevronLeftOutline,
    ChevronRightOutline,
    PlusOutline,
  } from 'flowbite-svelte-icons';

  const tasks = writable<any[]>([]);
  const loading = writable(true);
  const error = writable('');
  const sort = writable('createdAt');
  const order = writable<'ASC' | 'DESC'>('DESC');
  const currentPage = writable(1);
  const limit = 20;
  const hasMore = writable(false);
  const STATUS_LABELS: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    done: 'Done',
  };
  const PRIORITY_LABELS = ['—', 'Low', 'Medium', 'High', 'Urgent', 'Do Now'];

  async function loadTasks() {
    loading.set(true);
    error.set('');
    try {
      const list = await apiGetAuth<any[]>(
        `/tasks?sort=${$sort}&order=${$order}&page=${$currentPage}&limit=${limit + 1}`,
      );
      hasMore.set(list.length > limit);
      tasks.set(list.slice(0, limit));
    } catch (e: any) {
      error.set(e.message);
    } finally {
      loading.set(false);
    }
  }

  onMount(async () => {
    const me = await getCurrentUser();
    if (!me) {
      goto('/login');
      return;
    }
    await loadTasks();
  });

  async function changeSort(field: string) {
    if ($sort === field) {
      order.update((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      sort.set(field);
      order.set('ASC');
    }
    currentPage.set(1);
    await loadTasks();
  }
  async function prevPage() {
    if ($currentPage > 1) {
      currentPage.update((p) => p - 1);
      await loadTasks();
    }
  }
  async function nextPage() {
    if ($hasMore) {
      currentPage.update((p) => p + 1);
      await loadTasks();
    }
  }
</script>

<div class="flex items-center justify-between mb-4">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Tasks</h1>
  <Button href="/tasks/create"
    ><PlusOutline class="w-4 h-4 mr-1" />Create Task</Button
  >
</div>

<div class="flex items-center gap-2 mb-4 flex-wrap">
  <span class="text-sm text-gray-500">Sort:</span>
  {#each [['createdAt', 'Created'], ['dueDate', 'Due Date'], ['priority', 'Priority'], ['title', 'Title'], ['status', 'Status']] as [field, label]}
    <Button
      size="sm"
      color={$sort === field ? 'primary' : 'light'}
      onclick={() => changeSort(field)}
    >
      {label}{$sort === field ? ($order === 'ASC' ? ' ↑' : ' ↓') : ''}
    </Button>
  {/each}
</div>

{#if $loading}
  <p class="text-gray-400">Loading tasks...</p>
{:else if $error}
  <Alert color="red">{$error}</Alert>
{:else if $tasks.length}
  <Card class="p-0 overflow-hidden mb-4">
    {#each $tasks as task, i}
      {@const isOverdue =
        task.dueDate &&
        new Date(task.dueDate) < new Date() &&
        task.status !== 'done'}
      <div
        class="flex items-center gap-2.5 px-4 py-3 {i < $tasks.length - 1
          ? 'border-b border-gray-100 dark:border-gray-700'
          : ''} {isOverdue ? 'bg-red-50 dark:bg-red-900/10' : ''}"
      >
        <span
          class="w-2.5 h-2.5 rounded-full shrink-0"
          data-status={task.status}
        ></span>
        <a
          href="/tasks/{task.id}"
          class="flex-1 truncate font-medium text-gray-800 dark:text-gray-200 hover:underline {task.status ===
          'done'
            ? 'line-through text-gray-400'
            : ''}">{task.title}</a
        >
        <div class="flex items-center gap-2 shrink-0">
          {#if task.priority && task.priority > 0}<span
              class="text-xs"
              data-priority={task.priority}
              >{PRIORITY_LABELS[task.priority]}</span
            >{/if}
          {#if task.dueDate}<span
              class="text-xs {isOverdue ? 'text-red-500' : 'text-gray-400'}"
              >{new Date(task.dueDate).toLocaleDateString()}</span
            >{/if}
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
            data-status={task.status}
            >{STATUS_LABELS[task.status] ?? task.status}</span
          >
        </div>
      </div>
    {/each}
  </Card>
  <div class="flex items-center gap-3 justify-center">
    <Button
      size="sm"
      color="light"
      disabled={$currentPage === 1}
      onclick={prevPage}><ChevronLeftOutline class="w-4 h-4 mr-1" />Prev</Button
    >
    <span class="text-sm text-gray-400">Page {$currentPage}</span>
    <Button size="sm" color="light" disabled={!$hasMore} onclick={nextPage}
      >Next<ChevronRightOutline class="w-4 h-4 ml-1" /></Button
    >
  </div>
{:else}
  <div class="text-center py-12 text-gray-400">
    <CheckCircleOutline class="w-12 h-12 mx-auto mb-3" />
    <p>
      No tasks found. <a
        href="/tasks/create"
        class="text-primary-600 hover:underline">Create a task.</a
      >
    </p>
  </div>
{/if}
