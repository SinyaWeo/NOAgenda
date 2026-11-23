<script lang="ts">
	import { page } from '$app/state';
	import { apiGetAuth, apiPostAuth, apiPutAuth } from '$lib/api';
	import { loadOnParamChange } from '$lib/param-loader.svelte';
	import { writable, derived } from 'svelte/store';
	import { Alert, Button, Card, Input, Select } from 'flowbite-svelte';
	import { CheckCircleOutline, CogOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { showToast } from '$lib/toast';
	import { announceRecurrence } from '$lib/recurrence';
	import { errMessage } from '$lib/errors';
	import { t, tr, fmt, type MessageKey } from '$lib/i18n';
	import type { Project, ProjectView, Task } from '$lib/types';

	const project = writable<Project | null>(null);
	const tasks = writable<Task[]>([]);
	const views = writable<ProjectView[]>([]);
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
		const [p, t, v] = await Promise.all([
			apiGetAuth<Project>(`/projects/${id}`),
			apiGetAuth<Task[]>(`/tasks?projectId=${id}`),
			apiGetAuth<ProjectView[]>(`/projects/${id}/views`).catch((): ProjectView[] => [])
		]);
		if (isStale()) return; // navigated to another project meanwhile
		project.set(p);
		tasks.set(t);
		views.set(v);
	}

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
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else if $error}
	<Alert color="red">{$error}</Alert>
{:else if $project}
	<div class="flex items-start justify-between gap-4 mb-4">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
				{$project.name ?? $project.title}
			</h1>
			{#if $project.description}<p class="text-gray-500 dark:text-gray-400 m-0">
					{$project.description}
				</p>{/if}
		</div>
		<Button href="/projects/{$project.id}/edit" color="light" size="sm">
			<CogOutline class="w-4 h-4 mr-1" />{$t('views.project.settings')}
		</Button>
	</div>

	{#if $views.length}
		<nav class="flex gap-2 mb-4 flex-wrap">
			{#each $views as v (v.id)}
				<a
					href="/projects/{$project.id}/{v.id}"
					class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 no-underline hover:bg-primary-200"
				>
					{v.title}
				</a>
			{/each}
		</nav>
	{/if}

	<form onsubmit={quickAdd} class="flex gap-2 mb-4">
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

	<div class="flex items-center gap-3 mb-4 flex-wrap">
		<Select placeholder="" bind:value={$filterStatus} class="w-auto">
			<option value="">{$t('views.project.allStatuses')}</option>
			<option value="open">{$t('common.status.open')}</option>
			<option value="in_progress">{$t('common.status.in_progress')}</option>
			<option value="done">{$t('common.status.done')}</option>
		</Select>
		<Select placeholder="" bind:value={$filterPriority} class="w-auto">
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
		<span class="text-xs text-gray-400 ml-auto">
			{$t('views.project.count', { shown: $filteredTasks.length, total: $tasks.length })}
		</span>
	</div>

	{#if $tasks.length === 0}
		<div class="text-center py-12 text-gray-400">
			<CheckCircleOutline class="w-12 h-12 mx-auto mb-3" />
			<p>
				{$t('views.project.emptyLead')}
				<a href="/tasks/create?projectId={$project.id}" class="text-primary-600 hover:underline">
					{$t('views.project.emptyLink')}
				</a>.
			</p>
		</div>
	{:else if $filteredTasks.length === 0}
		<p class="text-gray-400">{$t('views.project.noMatch')}</p>
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
							? 'line-through text-gray-400'
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
							class="text-xs shrink-0 flex items-center gap-0.5 {overdue ? 'text-red-500' : 'text-gray-400'}"
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
{:else}
	<p>{$t('views.project.notFound')}</p>
{/if}
