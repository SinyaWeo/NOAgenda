<script lang="ts">
  import { untrack } from 'svelte';
  import { onMount } from 'svelte';
  import { apiGetAuth, apiPostAuth, apiPutAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { errMessage } from '$lib/errors';
  import { cleanCriteria, criteriaToQuery, describeCriteria, needsClientDueFilter } from '$lib/filters';
  import { loadProjectNames } from '$lib/project-names';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { showToast } from '$lib/toast';
  import type { FilterCriteria, NodeStatus, SavedFilter, Task } from '$lib/types';
  import type { KanbanColumn, ProjectOption, TaskViewMode } from '$lib/types-views';
  import TaskListView from '$lib/components/views/TaskListView.svelte';
  import StatusKanbanView from '$lib/components/views/StatusKanbanView.svelte';
  import TableView from '$lib/components/views/TableView.svelte';
  import GanttView from '$lib/components/views/GanttView.svelte';
  import CriteriaEditor from '$lib/components/views/CriteriaEditor.svelte';
  import { Alert, Badge, Button, ButtonGroup, Input, Select } from 'flowbite-svelte';
  import {
    CheckCircleOutline,
    ChevronLeftOutline,
    ChevronRightOutline,
    PlusOutline,
  } from 'flowbite-svelte-icons';

  const tasks = writable<Task[]>([]);
  let projectNames = $state<Record<number, string>>({});
  const loading = writable(true);
  const error = writable('');
  const sort = writable('createdAt');
  const order = writable<'ASC' | 'DESC'>('DESC');
  const currentPage = writable(1);
  const limit = 20;
  const hasMore = writable(false);

  // Saved filters / applied criteria
  let savedFilters = $state<SavedFilter[]>([]);
  let filtersLoaded = false;
  let criteria = $state<FilterCriteria>({});
  let selectedFilterId = $state('');
  let showRefine = $state(false);
  let draftCriteria = $state<FilterCriteria>({});
  let showSave = $state(false);
  let saveName = $state('');
  let saving = $state(false);
  let lastFilterParam: string | null | undefined = undefined;
  let loadSeq = 0;

  const projectOptions = $derived<ProjectOption[]>(
    Object.entries(projectNames).map(([id, name]) => ({ id: Number(id), name })),
  );
  const chips = $derived(describeCriteria(criteria));

  const VIEWS: { id: TaskViewMode; label: string }[] = [
    { id: 'list', label: 'List' },
    { id: 'kanban', label: 'Kanban' },
    { id: 'table', label: 'Table' },
    { id: 'gantt', label: 'Gantt' },
  ];

  const KANBAN_COLS: KanbanColumn[] = [
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'done', label: 'Done' },
  ];

  const validViews = new Set<string>(['list', 'kanban', 'table', 'gantt']);
  const viewMode = $derived<TaskViewMode>(
    validViews.has(page.url.searchParams.get('view') ?? '')
      ? (page.url.searchParams.get('view') as TaskViewMode)
      : 'list',
  );

  /** Navigate to the same page with some query params changed (others, e.g. ?view=, are kept). */
  function setParams(changes: Record<string, string | null>) {
    const params = new URLSearchParams(page.url.searchParams);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    goto(`${page.url.pathname}${qs ? `?${qs}` : ''}`, { replaceState: true, keepFocus: true, noScroll: true });
  }

  function setView(v: TaskViewMode) {
    setParams({ view: v });
  }

  async function loadTasks() {
    const seq = ++loadSeq;
    loading.set(true);
    error.set('');
    try {
      const q = criteriaToQuery(criteria);
      q.set('sort', $sort);
      q.set('order', $order);
      let rows: Task[];
      let more: boolean;
      if (needsClientDueFilter(criteria)) {
        // No server parameter for "no due date": fetch a large page and filter + page here.
        q.set('limit', '500');
        const all = (await apiGetAuth<Task[]>(`/tasks?${q}`)).filter((t) => !t.dueDate);
        const start = ($currentPage - 1) * limit;
        rows = all.slice(start, start + limit);
        more = all.length > start + limit;
      } else {
        q.set('page', String($currentPage));
        q.set('limit', String(limit + 1));
        const list = await apiGetAuth<Task[]>(`/tasks?${q}`);
        more = list.length > limit;
        rows = list.slice(0, limit);
      }
      if (seq !== loadSeq) return;
      hasMore.set(more);
      tasks.set(rows);
    } catch (e: unknown) {
      if (seq === loadSeq) error.set(errMessage(e));
    } finally {
      if (seq === loadSeq) loading.set(false);
    }
  }

  async function ensureFilters() {
    if (filtersLoaded) return;
    try {
      savedFilters = await apiGetAuth<SavedFilter[]>('/filters');
      filtersLoaded = true;
    } catch (e: unknown) {
      showToast(errMessage(e, 'Could not load saved filters'), 'error');
    }
  }

  /** The ?filter= param changed (or this is the first load): apply that saved filter, then load. */
  async function syncFromUrl(param: string | null) {
    if (param === lastFilterParam) return;
    lastFilterParam = param;
    if (param) {
      await ensureFilters();
      const f = savedFilters.find((x) => String(x.id) === param);
      if (f) {
        criteria = { ...(f.filters ?? {}) };
        selectedFilterId = String(f.id);
      } else {
        showToast('Saved filter not found', 'error');
        criteria = {};
        selectedFilterId = '';
        lastFilterParam = null;
        setParams({ filter: null });
      }
    } else {
      criteria = {};
      selectedFilterId = '';
    }
    currentPage.set(1);
    await loadTasks();
  }

  $effect(() => {
    const param = page.url.searchParams.get('filter');
    untrack(() => void syncFromUrl(param));
  });

  onMount(async () => {
    const me = await getCurrentUser();
    if (!me) {
      goto('/user/login');
      return;
    }
    void loadProjectNames().then((n) => (projectNames = n));
    void ensureFilters();
  });

  function chooseSavedFilter(id: string) {
    selectedFilterId = id;
    setParams({ filter: id || null });
  }

  function clearFilter() {
    showSave = false;
    showRefine = false;
    if (lastFilterParam) {
      setParams({ filter: null }); // the URL change reloads
    } else {
      criteria = {};
      selectedFilterId = '';
      currentPage.set(1);
      void loadTasks();
    }
  }

  function openRefine() {
    draftCriteria = { ...criteria };
    showRefine = !showRefine;
  }

  /** Apply hand-edited criteria; they are no longer the saved filter named in the URL. */
  function applyRefine() {
    criteria = cleanCriteria(draftCriteria);
    selectedFilterId = '';
    showRefine = false;
    currentPage.set(1);
    if (lastFilterParam) {
      lastFilterParam = null; // so the URL change below does not reload a second time
      setParams({ filter: null });
    }
    void loadTasks();
  }

  async function saveCurrentFilters(e: Event) {
    e.preventDefault();
    if (!saveName.trim() || saving) return;
    saving = true;
    try {
      const created = await apiPostAuth<SavedFilter>('/filters', {
        name: saveName.trim(),
        filters: cleanCriteria(criteria),
      });
      savedFilters = [...savedFilters, created];
      saveName = '';
      showSave = false;
      selectedFilterId = String(created.id);
      lastFilterParam = String(created.id); // criteria are already applied: no reload needed
      setParams({ filter: String(created.id) });
      showToast('Filter saved', 'success');
    } catch (e: unknown) {
      showToast(errMessage(e, 'Could not save the filter'), 'error');
    } finally {
      saving = false;
    }
  }

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

  async function updateTaskStatus(taskId: number, status: NodeStatus) {
    try {
      const updated = await apiPutAuth<Task>(`/tasks/${taskId}`, { status });
      tasks.update((list) =>
        list.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
      );
      showToast('Status updated', 'success');
    } catch (e: unknown) {
      showToast(errMessage(e, 'Failed to update status'), 'error');
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
  {#each VIEWS as v (v.id)}
    <Button
      size="sm"
      color={viewMode === v.id ? 'primary' : 'light'}
      onclick={() => setView(v.id)}>{v.label}</Button
    >
  {/each}
</ButtonGroup>

<div class="flex items-center gap-2 mb-3 flex-wrap">
  <label for="saved-filter" class="text-sm text-gray-500">Saved filter:</label>
  <Select
    id="saved-filter"
    class="w-auto"
    value={selectedFilterId}
    onchange={(e) => chooseSavedFilter((e.target as HTMLSelectElement).value)}
  >
    <option value="">None</option>
    {#each savedFilters as f (f.id)}<option value={String(f.id)}>{f.name}</option>{/each}
  </Select>
  <Button size="sm" color="light" onclick={openRefine}>{showRefine ? 'Hide filter editor' : 'Edit filters'}</Button>
  <a href="/filters" class="text-xs text-primary-600 hover:underline">Manage saved filters</a>
</div>

{#if showRefine}
  <div class="mb-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
    <CriteriaEditor bind:criteria={draftCriteria} projects={projectOptions} idPrefix="tasks-crit" />
    <div class="mt-3 flex gap-2">
      <Button size="sm" onclick={applyRefine}>Apply filters</Button>
      <Button size="sm" color="light" onclick={() => (showRefine = false)}>Cancel</Button>
    </div>
  </div>
{/if}

{#if chips.length}
  <div class="flex items-center gap-2 mb-3 flex-wrap" aria-label="Active filters">
    {#each chips as chip (chip)}<Badge color="indigo">{chip}</Badge>{/each}
    <Button size="xs" color="light" onclick={clearFilter}>Clear</Button>
    {#if !showSave}
      <Button size="xs" color="light" onclick={() => (showSave = true)}>Save current filters</Button>
    {:else}
      <form onsubmit={saveCurrentFilters} class="flex items-center gap-2">
        <Input type="text" size="sm" bind:value={saveName} placeholder="Filter name" required class="w-44" aria-label="Filter name" />
        <Button type="submit" size="xs" disabled={saving || !saveName.trim()}>Save</Button>
        <Button type="button" size="xs" color="light" onclick={() => (showSave = false)}>Cancel</Button>
      </form>
    {/if}
  </div>
{/if}

{#if viewMode !== 'kanban'}
  <div class="flex items-center gap-2 mb-4 flex-wrap">
    <span class="text-sm text-gray-500">Sort:</span>
    <ButtonGroup class="*:ring-primary-700!">
      {#each [['createdAt', 'Created'], ['dueDate', 'Due Date'], ['priority', 'Priority'], ['title', 'Title'], ['status', 'Status']] as [field, label] (field)}
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

{#snippet pager(extraClass: string)}
  <div class="flex items-center gap-3 justify-center {extraClass}">
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
{/snippet}

{#if $loading}
  <p class="text-gray-400">Loading tasks...</p>
{:else if $error}
  <Alert color="red">{$error}</Alert>
{:else if viewMode === 'list'}
  {#if $tasks.length}
    <TaskListView tasks={$tasks} {projectNames} onStatusChange={updateTaskStatus} />
    {@render pager('')}
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
  <StatusKanbanView tasks={$tasks} columns={KANBAN_COLS} />
{:else if viewMode === 'table'}
  <TableView tasks={$tasks} friendlyStatus large />
  {#if $tasks.length}{@render pager('mt-4')}{/if}
{:else if viewMode === 'gantt'}
  <GanttView tasks={$tasks} large />
{/if}
