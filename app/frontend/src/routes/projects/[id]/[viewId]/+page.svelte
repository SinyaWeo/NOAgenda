<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { apiGetAuth, apiPutAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Alert, Badge, Button, Card, Select, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { CalendarMonthOutline, CheckCircleOutline } from 'flowbite-svelte-icons';

  const view = writable<any>(null);
  const tasks = writable<any[]>([]);
  const buckets = writable<any[]>([]);
  const loading = writable(true);
  const error = writable('');

  const PRIORITY_SHORT = ['', 'Low', 'Med', 'High', 'Urgent', 'Now'];

  async function moveTaskToBucket(taskId: number, bucketId: number) {
    try {
      const updated = await apiPutAuth<any>(`/tasks/${taskId}`, { bucketId });
      tasks.update((list) => list.map((t) => (t.id === taskId ? updated : t)));
    } catch (_) {}
  }

  async function load() {
    const { id, viewId } = page.params;
    const [v, t] = await Promise.all([apiGetAuth<any>(`/projects/${id}/views/${viewId}`), apiGetAuth<any[]>(`/tasks?projectId=${id}`)]);
    view.set(v); tasks.set(t);
    if (v.viewType === 'kanban') { buckets.set(await apiGetAuth<any[]>(`/projects/${id}/views/${viewId}/buckets`)); }
  }

  onMount(async () => {
    const me = await getCurrentUser(); if (!me) { goto('/user/login'); return; }
    try { await load(); } catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  });
</script>

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else if $error}
  <Alert color="red">{$error}</Alert>
{:else if $view}
  <div class="flex items-center justify-between gap-4 mb-4">
    <div class="flex items-center gap-3">
      <a href="/projects/{page.params.id}" class="text-gray-400 hover:text-gray-600">← Back</a>
      <h1 class="text-xl font-bold text-gray-900 dark:text-white m-0">{$view.title}</h1>
      <Badge color="indigo">{$view.viewType}</Badge>
    </div>
    <Button href="/projects/{page.params.id}/settings/views" color="light" size="sm">Manage views</Button>
  </div>

  {#if $view.viewType === 'list'}
    {#if $tasks.length}
      <Card class="p-0 overflow-hidden">
        {#each $tasks as task, i}
          <div class="flex items-center gap-3 px-4 py-3 {i < $tasks.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}">
            <a href="/tasks/{task.id}" class="flex-1 font-medium text-gray-800 dark:text-gray-200 hover:underline">{task.title}</a>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0" data-status={task.status}>{task.status ?? 'open'}</span>
            {#if task.dueDate}<span class="text-xs shrink-0 {new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'}">{new Date(task.dueDate).toLocaleDateString()}</span>{/if}
            {#if task.priority}<span class="text-xs shrink-0" data-priority={task.priority ?? 0}>{PRIORITY_SHORT[task.priority] ?? ''}</span>{/if}
          </div>
        {/each}
      </Card>
    {:else}
      <div class="text-center py-10 text-gray-400"><CheckCircleOutline class="w-10 h-10 mx-auto mb-2" /><p>No tasks in this project yet.</p></div>
    {/if}

  {:else if $view.viewType === 'kanban'}
    {#if $buckets.length}
      <div class="board-cols">
        {#each $buckets as bucket}
          <div class="board-col">
            <div class="board-col-header"><h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 m-0">{bucket.title}</h3></div>
            <div class="board-col-body">
              {#each $tasks.filter((t: any) => t.bucketId === bucket.id) as task}
                <div class="board-card mb-2">
                  <a href="/tasks/{task.id}" class="font-medium text-sm text-gray-800 dark:text-gray-200 hover:underline">{task.title}</a>
                  {#if task.dueDate}<div class="text-xs text-gray-400">{new Date(task.dueDate).toLocaleDateString()}</div>{/if}
                  <Select value={task.bucketId} onchange={(e) => moveTaskToBucket(task.id, Number((e.target as HTMLSelectElement).value))} class="mt-2 text-xs">
                    {#each $buckets as b}<option value={b.id}>{b.title}</option>{/each}
                  </Select>
                </div>
              {/each}
              {#if !$tasks.filter((t: any) => t.bucketId === bucket.id).length}
                <p class="text-xs text-gray-400 text-center m-0">Empty</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-10 text-gray-400"><p>No buckets configured for this kanban view.</p></div>
    {/if}

  {:else if $view.viewType === 'table'}
    {#if $tasks.length}
      <Table>
        <TableHead>
          <TableHeadCell>#</TableHeadCell>
          <TableHeadCell>Title</TableHeadCell>
          <TableHeadCell>Status</TableHeadCell>
          <TableHeadCell>Priority</TableHeadCell>
          <TableHeadCell>Due Date</TableHeadCell>
          <TableHeadCell>Created</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each $tasks as task}
            <TableBodyRow>
              <TableBodyCell class="text-gray-400">{task.id}</TableBodyCell>
              <TableBodyCell><a href="/tasks/{task.id}" class="font-medium text-gray-800 dark:text-gray-200 hover:underline">{task.title}</a></TableBodyCell>
              <TableBodyCell><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" data-status={task.status}>{task.status ?? '—'}</span></TableBodyCell>
              <TableBodyCell class="text-gray-400">{PRIORITY_SHORT[task.priority] ?? '—'}</TableBodyCell>
              <TableBodyCell class={task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</TableBodyCell>
              <TableBodyCell class="text-gray-400">{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—'}</TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    {:else}
      <div class="text-center py-10 text-gray-400"><p>No tasks to display.</p></div>
    {/if}

  {:else if $view.viewType === 'gantt'}
    {@const dated = $tasks.filter((t: any) => t.dueDate).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())}
    {#if dated.length}
      <Card class="p-0 overflow-hidden">
        {#each dated as task, i}
          <div class="flex items-center gap-3 px-4 py-3 {i < dated.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}">
            <span class="w-2 h-2 rounded-full shrink-0" data-status={new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'overdue' : task.status}></span>
            <a href="/tasks/{task.id}" class="flex-1 font-medium text-gray-800 dark:text-gray-200 hover:underline">{task.title}</a>
            <span class="text-sm shrink-0 {new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'}">{new Date(task.dueDate).toLocaleDateString()}</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0" data-status={task.status}>{task.status ?? 'open'}</span>
          </div>
        {/each}
      </Card>
    {:else}
      <div class="text-center py-10 text-gray-400"><CalendarMonthOutline class="w-10 h-10 mx-auto mb-2" /><p>No tasks with due dates to display on the timeline.</p></div>
    {/if}

  {:else}
    <p class="text-gray-400">Unknown view type: {$view.viewType}</p>
  {/if}
{/if}
