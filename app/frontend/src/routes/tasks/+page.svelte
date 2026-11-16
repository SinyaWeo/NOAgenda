<script lang="ts">
  import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_SHORT } from '$lib/constants';
  import { onMount } from 'svelte';
  import { apiGetAuth, apiPutAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { loadProjectNames } from '$lib/project-names';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { showToast } from '$lib/toast';
  import {
    Alert,
    Button,
    ButtonGroup,
    Card,
    Progressbar,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
  } from 'flowbite-svelte';
  import {
    CalendarMonthOutline,
    CheckCircleOutline,
    ChevronLeftOutline,
    ChevronRightOutline,
    ExclamationCircleOutline,
    PlusOutline,
  } from 'flowbite-svelte-icons';

  const tasks = writable<any[]>([]);
  let projectNames = $state<Record<number, string>>({});
  const loading = writable(true);
  const error = writable('');
  const sort = writable('createdAt');
  const order = writable<'ASC' | 'DESC'>('DESC');
  const currentPage = writable(1);
  const limit = 20;
  const hasMore = writable(false);


  const VIEWS = [
    { id: 'list', label: 'List' },
    { id: 'kanban', label: 'Kanban' },
    { id: 'table', label: 'Table' },
    { id: 'gantt', label: 'Gantt' },
  ];

  const KANBAN_COLS = [
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'done', label: 'Done' },
  ];

  const validViews = new Set(['list', 'kanban', 'table', 'gantt']);
  const viewMode = $derived(
    validViews.has(page.url.searchParams.get('view') ?? '')
      ? (page.url.searchParams.get('view') as
          | 'list'
          | 'kanban'
          | 'table'
          | 'gantt')
      : 'list',
  );

  function setView(v: string) {
    goto(`${page.url.pathname}?view=${v}`, { replaceState: true });
  }

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
      goto('/user/login');
      return;
    }
    void loadProjectNames().then((n) => (projectNames = n));
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

  async function updateTaskStatus(taskId: number, status: string) {
    try {
      const updated = await apiPutAuth<any>(`/tasks/${taskId}`, { status });
      tasks.update((list) =>
        list.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
      );
      showToast('Status updated', 'success');
    } catch (e: any) {
      showToast(e.message ?? 'Failed to update status', 'error');
    }
  }
</script>

<div class="flex items-center justify-between mb-4">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Tasks</h1>
  <Button href="/tasks/create"
    ><PlusOutline class="w-4 h-4 mr-1" />Create Task</Button
  >
</div>

<ButtonGroup class="mb-4 *:ring-primary-700!">
  {#each VIEWS as v}
    <Button
      size="sm"
      color={viewMode === v.id ? 'primary' : 'light'}
      onclick={() => setView(v.id)}>{v.label}</Button
    >
  {/each}
</ButtonGroup>

{#if viewMode !== 'kanban'}
  <div class="flex items-center gap-2 mb-4 flex-wrap">
    <span class="text-sm text-gray-500">Sort:</span>
    <ButtonGroup class="*:ring-primary-700!">
      {#each [['createdAt', 'Created'], ['dueDate', 'Due Date'], ['priority', 'Priority'], ['title', 'Title'], ['status', 'Status']] as [field, label]}
        <Button
          size="sm"
          color={$sort === field ? 'primary' : 'light'}
          onclick={() => changeSort(field)}
        >
          {label}{$sort === field ? ($order === 'ASC' ? ' ↑' : ' ↓') : ''}
        </Button>
      {/each}
    </ButtonGroup>
  </div>
{/if}

{#if $loading}
  <p class="text-gray-400">Loading tasks...</p>
{:else if $error}
  <Alert color="red">{$error}</Alert>
{:else if viewMode === 'list'}
  {#if $tasks.length}
    <div class="flex flex-col gap-2 mb-4">
      {#each $tasks as task}
        {@const due = task.dueDate ? new Date(task.dueDate) : null}
        {@const isOverdue =
          due !== null && due < new Date() && task.status !== 'done'}
        <Card
          class="flex flex-col gap-2 p-3.5 {isOverdue
            ? 'border-red-300 dark:bg-gray-800 dark:border-red-700'
            : ''}"
        >
          <div class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <a
                href="/tasks/{task.id}"
                class="font-medium text-gray-900 dark:text-white hover:underline {task.status ===
                'done'
                  ? 'line-through text-gray-400'
                  : ''}">{task.title}</a
              >
              {#if projectNames[task.parentId]}<span class="text-xs text-gray-400 ml-2"
                  >{projectNames[task.parentId]}</span
                >{/if}
            </div>
            <div class="shrink-0 text-right flex flex-col gap-1">
              <div>
                <div
                  class="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5"
                >
                  Due date
                </div>
                <span
                  class="text-xs flex items-center justify-end gap-0.5 {isOverdue
                    ? 'text-red-500'
                    : due !== null
                      ? 'text-gray-600 dark:text-gray-300'
                      : 'text-gray-400'}"
                >
                  {#if isOverdue}<ExclamationCircleOutline
                      class="w-3.5 h-3.5 shrink-0"
                    />{/if}
                  {due !== null ? due.toLocaleDateString() : 'Not set'}
                </span>
              </div>
              <div>
                <div
                  class="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5"
                >
                  Priority
                </div>
                <span
                  class="text-xs dark:text-gray-400"
                  data-priority={task.priority}
                >
                  {task.priority && task.priority > 0
                    ? PRIORITY_LABELS[task.priority]
                    : '—'}
                </span>
              </div>
              <div>
                <div
                  class="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5"
                >
                  Status
                </div>
                <select
                  class="text-xs rounded-full px-2 py-0.5 font-semibold border-0 cursor-pointer bg-transparent dark:text-white"
                  data-status={task.status}
                  value={task.status}
                  onchange={(e) =>
                    updateTaskStatus(
                      task.id,
                      (e.target as HTMLSelectElement).value,
                    )}
                  aria-label="Change status"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
          </div>
          {#if task.percentDone && task.percentDone > 0}
            <Progressbar
              progress={task.percentDone}
              size="h-4"
              color="indigo"
              labelInside
            />
          {/if}
        </Card>
      {/each}
    </div>
    <div class="flex items-center gap-3 justify-center">
      <Button
        size="sm"
        color="light"
        disabled={$currentPage === 1}
        onclick={prevPage}
        ><ChevronLeftOutline class="w-4 h-4 mr-1" />Prev</Button
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
{:else if viewMode === 'kanban'}
  <div class="board-cols">
    {#each KANBAN_COLS as col}
      {@const colTasks = $tasks.filter((t) => t.status === col.key)}
      <div class="board-col">
        <div class="board-col-header">
          <h3
            class="text-sm font-semibold text-gray-700 dark:text-gray-300 m-0"
          >
            {col.label}
          </h3>
          <span class="text-xs text-gray-400">{colTasks.length}</span>
        </div>
        <div class="board-col-body">
          {#each colTasks as task}
            <div class="board-card mb-2">
              <a
                href="/tasks/{task.id}"
                class="font-medium text-sm text-gray-800 dark:text-gray-200 hover:underline"
                >{task.title}</a
              >
              {#if task.dueDate}
                {@const overdue =
                  new Date(task.dueDate) < new Date() && task.status !== 'done'}
                <div
                  class="text-xs {overdue
                    ? 'text-red-500'
                    : 'text-gray-400'} mt-1"
                >
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
              {/if}
              {#if task.priority && task.priority > 0}<div
                  class="text-xs text-gray-400 mt-0.5"
                >
                  {PRIORITY_SHORT[task.priority]}
                </div>{/if}
            </div>
          {/each}
          {#if !colTasks.length}
            <p class="text-xs text-gray-400 text-center m-0">Empty</p>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{:else if viewMode === 'table'}
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
            <TableBodyCell
              ><a
                href="/tasks/{task.id}"
                class="font-medium text-gray-800 dark:text-gray-200 hover:underline"
                >{task.title}</a
              ></TableBodyCell
            >
            <TableBodyCell
              ><span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                data-status={task.status}
                >{STATUS_LABELS[task.status] ?? task.status}</span
              ></TableBodyCell
            >
            <TableBodyCell class="text-gray-400"
              >{PRIORITY_SHORT[task.priority] ?? '—'}</TableBodyCell
            >
            <TableBodyCell
              class={task.dueDate &&
              new Date(task.dueDate) < new Date() &&
              task.status !== 'done'
                ? 'text-red-500'
                : 'text-gray-400'}
              >{task.dueDate
                ? new Date(task.dueDate).toLocaleDateString()
                : '—'}</TableBodyCell
            >
            <TableBodyCell class="text-gray-400"
              >{task.createdAt
                ? new Date(task.createdAt).toLocaleDateString()
                : '—'}</TableBodyCell
            >
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
    <div class="flex items-center gap-3 justify-center mt-4">
      <Button
        size="sm"
        color="light"
        disabled={$currentPage === 1}
        onclick={prevPage}
        ><ChevronLeftOutline class="w-4 h-4 mr-1" />Prev</Button
      >
      <span class="text-sm text-gray-400">Page {$currentPage}</span>
      <Button size="sm" color="light" disabled={!$hasMore} onclick={nextPage}
        >Next<ChevronRightOutline class="w-4 h-4 ml-1" /></Button
      >
    </div>
  {:else}
    <div class="text-center py-12 text-gray-400">
      <CheckCircleOutline class="w-12 h-12 mx-auto mb-3" />
      <p>No tasks found.</p>
    </div>
  {/if}
{:else if viewMode === 'gantt'}
  {@const dated = $tasks
    .filter((t) => t.dueDate)
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )}
  {#if dated.length}
    <Card class="p-0 overflow-hidden">
      {#each dated as task, i}
        {@const overdue =
          new Date(task.dueDate) < new Date() && task.status !== 'done'}
        <div
          class="flex items-center gap-3 px-4 py-3 {i < dated.length - 1
            ? 'border-b border-gray-100 dark:border-gray-700'
            : ''}"
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            data-status={overdue ? 'overdue' : task.status}
          ></span>
          <a
            href="/tasks/{task.id}"
            class="flex-1 font-medium text-gray-800 dark:text-gray-200 hover:underline {task.status ===
            'done'
              ? 'line-through text-gray-400'
              : ''}">{task.title}</a
          >
          <span
            class="text-sm shrink-0 {overdue
              ? 'text-red-500'
              : 'text-gray-400'}"
            >{new Date(task.dueDate).toLocaleDateString()}</span
          >
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
            data-status={task.status}
            >{STATUS_LABELS[task.status] ?? task.status}</span
          >
        </div>
      {/each}
    </Card>
  {:else}
    <div class="text-center py-12 text-gray-400">
      <CalendarMonthOutline class="w-12 h-12 mx-auto mb-3" />
      <p>No tasks with due dates to display on the timeline.</p>
    </div>
  {/if}
{/if}
