<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { apiGetAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { Alert, Badge, Card, Checkbox, Label, Select } from 'flowbite-svelte';
  import { CalendarMonthOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';

  const tasks = writable<any[]>([]);
  const loading = writable(true);
  const error = writable('');
  let showOverdue = $state(false);
  let daysAhead = $state(7);

  const STATUS_LABELS: Record<string, string> = { open: 'Open', in_progress: 'In Progress', done: 'Done' };
  const PRIORITY_LABELS = ['—', 'Low', 'Medium', 'High', 'Urgent', 'Do Now'];

  async function loadTasks() {
    loading.set(true);
    try {
      const all = await apiGetAuth<any[]>('/tasks');
      const now = new Date();
      const cutoff = new Date(now.getTime() + daysAhead * 86400000);
      tasks.set(all.filter((t: any) => {
        if (t.status === 'done') return false;
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        if (showOverdue && due < now) return true;
        return due <= cutoff;
      }).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    } catch (e: any) { error.set(e.message); }
    finally { loading.set(false); }
  }

  onMount(async () => {
    const me = await getCurrentUser();
    if (!me) { goto('/login'); return; }
    await loadTasks();
  });
</script>

<div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Upcoming Tasks</h1>
  <div class="flex items-center gap-4 flex-wrap">
    <div class="flex items-center gap-2">
      <Label for="days-select" class="text-sm text-gray-500 whitespace-nowrap">Show next</Label>
      <Select id="days-select" bind:value={daysAhead} onchange={loadTasks} class="w-auto">
        <option value={7}>7 days</option>
        <option value={14}>14 days</option>
        <option value={30}>30 days</option>
      </Select>
    </div>
    <Checkbox bind:checked={showOverdue} onchange={loadTasks}>Include overdue</Checkbox>
  </div>
</div>

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else if $error}
  <Alert color="red">{$error}</Alert>
{:else if $tasks.length === 0}
  <div class="text-center py-12 text-gray-400">
    <CalendarMonthOutline class="w-12 h-12 mx-auto mb-3" />
    <p>No upcoming tasks in this range.</p>
    <p class="text-sm">Try extending the date range or enabling overdue tasks.</p>
  </div>
{:else}
  <div class="flex flex-col gap-2">
    {#each $tasks as task}
      {@const due = new Date(task.dueDate)}
      {@const isOverdue = due < new Date()}
      <Card class="flex items-center gap-3 p-3.5 {isOverdue ? 'border-red-300 dark:border-red-700' : ''}">
        <div class="flex-1 min-w-0">
          <a href="/tasks/{task.id}" class="font-medium text-gray-900 dark:text-white hover:underline">{task.title}</a>
          {#if task.project?.name}<span class="text-xs text-gray-400 ml-2">{task.project.name}</span>{/if}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          {#if task.priority && task.priority > 0}
            <span class="text-xs font-medium" data-priority={task.priority}>{PRIORITY_LABELS[task.priority]}</span>
          {/if}
          <span class="text-sm {isOverdue ? 'text-red-500' : 'text-gray-400'}">
            {#if isOverdue}<ExclamationCircleOutline class="w-3.5 h-3.5 inline mr-0.5" />{/if}{due.toLocaleDateString()}
          </span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" data-status={task.status}>{STATUS_LABELS[task.status] ?? task.status}</span>
        </div>
      </Card>
    {/each}
  </div>
{/if}
