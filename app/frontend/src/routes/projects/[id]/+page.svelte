<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { apiDeleteAuth, apiGetAuth, apiPostAuth, apiPutAuth } from '$lib/api';
	import { loadOnParamChange } from '$lib/param-loader.svelte';
	import { writable, derived } from 'svelte/store';
	import { Alert, Button, ButtonGroup, Card, Input, Select } from 'flowbite-svelte';
	import {
		CheckCircleOutline,
		ClockOutline,
		CogOutline,
		ExclamationCircleOutline
	} from 'flowbite-svelte-icons';
	import BucketKanbanView from '$lib/components/views/BucketKanbanView.svelte';
	import TableView from '$lib/components/views/TableView.svelte';
	import GanttView from '$lib/components/views/GanttView.svelte';
	import CalendarView from '$lib/components/views/CalendarView.svelte';
	import MindmapView from '$lib/components/views/MindmapView.svelte';
	import { showToast } from '$lib/toast';
	import { announceRecurrence } from '$lib/recurrence';
	import { errMessage } from '$lib/errors';
	import { t, tr, fmt, type MessageKey } from '$lib/i18n';
	import type { KanbanBucket, NodeStatus, Project, Task } from '$lib/types';

	type ProjectViewMode = 'list' | 'kanban' | 'table' | 'gantt' | 'calendar' | 'mindmap';
	const VIEWS: { id: ProjectViewMode; label: MessageKey }[] = [
		{ id: 'list', label: 'views.mode.list' },
		{ id: 'kanban', label: 'views.mode.kanban' },
		{ id: 'table', label: 'views.mode.table' },
		{ id: 'gantt', label: 'views.mode.gantt' },
		{ id: 'calendar', label: 'views.mode.calendar' },
		{ id: 'mindmap', label: 'views.mode.mindmap' }
	];
	/** The views that show the task list loaded here (and so use its filters); calendar and mind map load their own. */
	const FILTERED_VIEWS: ProjectViewMode[] = ['list', 'kanban', 'table', 'gantt'];

	const viewMode = $derived<ProjectViewMode>(
		VIEWS.find((v) => v.id === page.url.searchParams.get('view'))?.id ?? 'list'
	);

	function setView(v: ProjectViewMode) {
		const params = new URLSearchParams(page.url.search);
		if (v === 'list') params.delete('view');
		else params.set('view', v);
		const qs = params.toString();
		goto(`${page.url.pathname}${qs ? `?${qs}` : ''}`, {
			replaceState: true
		});
	}

	const project = writable<Project | null>(null);
	const tasks = writable<Task[]>([]);
	const buckets = writable<KanbanBucket[]>([]);
	/** Project managers arrange the board; everyone else gets it read-only. */
	const canManageBuckets = $derived($project?.access === 'admin');
	const loading = writable(true);
	const error = writable('');
	let newTaskTitle = $state('');
	let addingTask = $state(false);
	const filterStatus = writable('');
	const filterPriority = writable('');

	const filteredTasks = derived([tasks, filterStatus, filterPriority], ([$tasks, $status, $priority]) =>
		$tasks.filter((t) => {
			if ($status && t.status !== $status) return false;
			if ($priority && String(t.priority ?? 0) !== $priority) return false;
			return true;
		})
	);

	async function loadProject(id: string, isStale: () => boolean) {
		newTaskTitle = '';
		const [p, t, b] = await Promise.all([
			apiGetAuth<Project>(`/projects/${id}`),
			apiGetAuth<Task[]>(`/tasks?projectId=${id}`),
			apiGetAuth<KanbanBucket[]>(`/projects/${id}/buckets`).catch((): KanbanBucket[] => [])
		]);
		if (isStale()) return; // navigated to another project meanwhile
		project.set(p);
		tasks.set(t);
		buckets.set(b);
	}

	const bucketsUrl = () => `/projects/${page.params.id}/buckets`;

	async function moveTaskToBucket(taskId: number, bucketId: number) {
		try {
			const before = $tasks.find((t) => t.id === taskId)?.status;
			const target = $buckets.find((b) => b.id === bucketId)?.status;
			const updated = await apiPutAuth<Task>(`/tasks/${taskId}`, { bucketId });
			tasks.update((list) => list.map((t) => (t.id === taskId ? updated : t)));
			if (target) announceRecurrence(target, before, updated);
		} catch (e: unknown) {
			showToast(errMessage(e, tr('views.toast.moveTaskFailed')), 'error');
		}
	}

	/** Run a bucket change, then refresh buckets and tasks (a status change moves tasks too); failures show as a toast. */
	async function changeBuckets(fn: () => Promise<unknown>, failed: MessageKey) {
		try {
			await fn();
		} catch (e: unknown) {
			showToast(errMessage(e, tr(failed)), 'error');
		}
		const id = page.params.id;
		await Promise.all([
			apiGetAuth<KanbanBucket[]>(bucketsUrl()).then((b) => buckets.set(b)),
			apiGetAuth<Task[]>(`/tasks?projectId=${id}`).then((t) => tasks.set(t))
		]).catch(() => undefined);
	}

	const createBucket = (title: string, status: NodeStatus) =>
		changeBuckets(() => apiPostAuth(bucketsUrl(), { title, status }), 'views.toast.bucketSaveFailed');
	const updateBucket = (id: number, data: { title?: string; limit?: number | null; status?: NodeStatus }) =>
		changeBuckets(() => apiPutAuth(`${bucketsUrl()}/${id}`, data), 'views.toast.bucketSaveFailed');
	const deleteBucket = (id: number) =>
		changeBuckets(() => apiDeleteAuth(`${bucketsUrl()}/${id}`), 'views.toast.bucketDeleteFailed');
	/** Swap with a neighbour, then renumber 0..n-1 so equal or gappy positions cannot break the order. */
	const reorderBucket = (id: number, direction: -1 | 1) =>
		changeBuckets(async () => {
			const list = [...$buckets];
			const from = list.findIndex((b) => b.id === id);
			const to = from + direction;
			if (from < 0 || to < 0 || to >= list.length) return;
			[list[from], list[to]] = [list[to], list[from]];
			await Promise.all(
				list.flatMap((b, i) =>
					b.position === i ? [] : [apiPutAuth(`${bucketsUrl()}/${b.id}`, { position: i })]
				)
			);
		}, 'views.toast.bucketSaveFailed');

	// Reloads when only the project id changes, not just on first mount.
	loadOnParamChange(() => page.params.id ?? '', loadProject, loading, error);

	async function quickAdd(e: SubmitEvent) {
		e.preventDefault();
		if (!newTaskTitle.trim() || addingTask) return;
		addingTask = true;
		const id = page.params.id;
		try {
			await apiPostAuth('/tasks', {
				title: newTaskTitle,
				project: { id: Number(id) }
			});
			newTaskTitle = '';
			tasks.set(await apiGetAuth<Task[]>(`/tasks?projectId=${id}`));
		} catch (e: unknown) {
			showToast(errMessage(e, tr('views.toast.addTaskFailed')), 'error');
		} finally {
			addingTask = false;
		}
	}

	async function updateTaskStatus(taskId: number, status: string) {
		try {
			const before = $tasks.find((t) => t.id === taskId)?.status;
			const updated = await apiPutAuth<Task>(`/tasks/${taskId}`, { status });
			tasks.update((list) => list.map((t) => (t.id === taskId ? updated : t)));
			if (!announceRecurrence(status, before, updated)) showToast(tr('views.toast.statusUpdated'), 'success');
		} catch (e: unknown) {
			showToast(errMessage(e, tr('views.toast.statusFailed')), 'error');
		}
	}
</script>

{#if $loading}
	<p class="text-gray-500 dark:text-gray-400">{$t('common.loading')}</p>
{:else if $error}
	<Alert color="red">{$error}</Alert>
{:else if $project}
	<div class="page-narrow">
		<div class="mb-6">
			<div class="flex items-center gap-3 flex-wrap">
				<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
					{$project.name ?? $project.title}
				</h1>
				<Button href="/projects/{$project.id}/edit" color="light" size="sm">
					<CogOutline class="w-4 h-4 mr-1" />{$t('views.project.settings')}
				</Button>
				<Button href="/projects/{$project.id}/settings/activity" color="light" size="sm">
					<ClockOutline class="w-4 h-4 mr-1" />{$t('activity.project.link')}
				</Button>
			</div>
			{#if $project.description}<p class="text-gray-500 dark:text-gray-400 mt-1 mb-0">
					{$project.description}
				</p>{/if}
		</div>

		<form onsubmit={quickAdd} class="flex gap-2 mb-6 w-full md:w-1/2">
			<Input
				type="text"
				bind:value={newTaskTitle}
				placeholder={$t('views.project.addPlaceholder')}
				class="flex-1"
			/>
			<Button type="submit" disabled={addingTask || !newTaskTitle.trim()}>
				{addingTask ? $t('views.project.adding') : $t('views.project.addTask')}
			</Button>
		</form>

		<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
			{$t('views.project.tasksHeading')}
		</h2>

		<ButtonGroup class="mb-4 max-w-full overflow-x-auto *:shrink-0 *:whitespace-nowrap *:ring-primary-700!">
			{#each VIEWS as v (v.id)}
				<Button size="sm" color={viewMode === v.id ? 'primary' : 'light'} onclick={() => setView(v.id)}>
					{$t(v.label)}
				</Button>
			{/each}
		</ButtonGroup>

		{#if FILTERED_VIEWS.includes(viewMode)}
			<div class="flex items-center gap-3 mb-4 flex-wrap">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{$t('views.project.filter')}</span>
				<Select placeholder="" size="sm" bind:value={$filterStatus} class="w-auto">
					<option value="">{$t('views.project.allStatuses')}</option>
					<option value="open">{$t('common.status.open')}</option>
					<option value="in_progress">{$t('common.status.in_progress')}</option>
					<option value="done">{$t('common.status.done')}</option>
				</Select>
				<Select placeholder="" size="sm" bind:value={$filterPriority} class="w-auto">
					<option value="">{$t('views.project.allPriorities')}</option>
					{#each [1, 2, 3, 4, 5] as p (p)}
						<option value={String(p)}>{$t(`common.priority.${p}` as MessageKey)}</option>
					{/each}
				</Select>
				{#if $filterStatus || $filterPriority}
					<Button
						size="sm"
						color="light"
						onclick={() => {
							filterStatus.set('');
							filterPriority.set('');
						}}
					>
						{$t('common.clear')}
					</Button>
				{/if}
				<span class="text-xs text-gray-500 dark:text-gray-400 ml-auto">
					{$t('views.project.count', { shown: $filteredTasks.length, total: $tasks.length })}
				</span>
			</div>
		{/if}

		{#if viewMode === 'kanban'}
			<BucketKanbanView
				tasks={$filteredTasks}
				buckets={$buckets}
				onMove={moveTaskToBucket}
				onCreate={canManageBuckets ? createBucket : undefined}
				onUpdate={canManageBuckets ? updateBucket : undefined}
				onDelete={canManageBuckets ? deleteBucket : undefined}
				onReorder={canManageBuckets ? reorderBucket : undefined}
			/>
		{:else if viewMode === 'table'}
			<TableView tasks={$filteredTasks} />
		{:else if viewMode === 'gantt'}
			<GanttView tasks={$filteredTasks} />
		{:else if viewMode === 'calendar'}
			<CalendarView projectId={$project.id} />
		{:else if viewMode === 'mindmap'}
			<MindmapView projectId={String($project.id)} />
		{:else if $tasks.length === 0}
			<div class="text-center py-12 text-gray-500 dark:text-gray-400">
				<CheckCircleOutline class="w-12 h-12 mx-auto mb-3" />
				<p>
					{$t('views.project.emptyLead')}
					<a href="/tasks/create?projectId={$project.id}" class="text-primary-600 hover:underline">
						{$t('views.project.emptyLink')}
					</a>.
				</p>
			</div>
		{:else if $filteredTasks.length === 0}
			<p class="text-gray-500 dark:text-gray-400">{$t('views.project.noMatch')}</p>
		{:else}
			<Card class="p-0 overflow-hidden">
				{#each $filteredTasks as task, i (task.id)}
					<div
						class="flex items-center gap-2.5 px-4 py-3 {i < $filteredTasks.length - 1
							? 'border-b border-gray-100 dark:border-gray-700'
							: ''}"
					>
						<a
							href="/tasks/{task.id}"
							class="flex-1 truncate font-medium text-gray-800 dark:text-gray-200 hover:underline {task.status ===
							'done'
								? 'line-through text-gray-500 dark:text-gray-400'
								: ''}"
						>
							{task.title}
						</a>
						{#if task.priority}<span class="text-xs shrink-0" data-priority={task.priority}>
								{$t(`common.priority.${task.priority}` as MessageKey)}
							</span>{/if}
						{#if task.dueDate}
							{@const overdue = new Date(task.dueDate) < new Date() && task.status !== 'done'}
							<span
								class="text-xs shrink-0 flex items-center gap-0.5 {overdue
									? 'text-red-500'
									: 'text-gray-500 dark:text-gray-400'}"
							>
								{#if overdue}<ExclamationCircleOutline class="w-3.5 h-3.5 shrink-0" />{/if}
								{$fmt.date(task.dueDate)}
							</span>
						{/if}
						<select
							class="text-xs rounded-full ps-2 pe-8 py-0.5 font-semibold border-0 cursor-pointer bg-transparent shrink-0"
							data-status={task.status}
							value={task.status}
							onchange={(e) => updateTaskStatus(task.id, (e.target as HTMLSelectElement).value)}
							aria-label={$t('views.changeStatus')}
						>
							<option value="open">{$t('common.status.open')}</option>
							<option value="in_progress">{$t('common.status.in_progress')}</option>
							<option value="done">{$t('common.status.done')}</option>
						</select>
					</div>
				{/each}
			</Card>
		{/if}
	</div>
{:else}
	<p>{$t('views.project.notFound')}</p>
{/if}
