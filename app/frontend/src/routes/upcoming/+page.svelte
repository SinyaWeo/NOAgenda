<script lang="ts">
	import { t, fmt, type MessageKey } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { apiGetAuth } from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { loadProjectNames } from '$lib/project-names';
	import { goto } from '$app/navigation';
	import { errMessage } from '$lib/errors';
	import type { Task } from '$lib/types';
	import { Alert, Card, Checkbox, Label, Progressbar, Select } from 'flowbite-svelte';
	import { CalendarMonthOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';

	const tasks = writable<Task[]>([]);
	let projectNames = $state<Record<number, string>>({});
	const loading = writable(true);
	const error = writable('');
	let showOverdue = $state(true);
	let daysAhead = $state(7);

	let loadSeq = 0;

	async function loadTasks() {
		const seq = ++loadSeq;
		loading.set(true);
		error.set('');
		try {
			const now = new Date();
			const cutoff = new Date(now.getTime() + daysAhead * 86400000);
			// Not done, and (no due date or due before the cutoff); overdue ones only on request.
			const q = new URLSearchParams({
				excludeDone: 'true',
				dueBefore: cutoff.toISOString(),
				includeUndated: 'true',
				sort: 'dueDate',
				order: 'ASC',
				limit: '200'
			});
			if (!showOverdue) q.set('dueAfter', now.toISOString());
			const list = await apiGetAuth<Task[]>(`/tasks?${q}`);
			// dueAfter would also hide the undated tasks (they must stay): fetch them separately.
			let rows = list;
			if (!showOverdue) {
				const undated = await apiGetAuth<Task[]>(
					`/tasks?${new URLSearchParams({ excludeDone: 'true', dueBefore: new Date(0).toISOString(), includeUndated: 'true', limit: '200' })}`
				);
				rows = [...list, ...undated.filter((t) => !t.dueDate)];
			}
			if (seq !== loadSeq) return;
			tasks.set(rows.slice(0, 200));
		} catch (e: unknown) {
			if (seq === loadSeq) error.set(errMessage(e));
		} finally {
			if (seq === loadSeq) loading.set(false);
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
</script>

<div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
		{$t('dashboard.upcoming.title')}
	</h1>
	<div class="flex items-center gap-4 flex-wrap">
		<div class="flex items-center gap-2">
			<Label for="days-select" class="text-sm text-gray-500 whitespace-nowrap"
				>{$t('dashboard.upcoming.showNext')}</Label
			>
			<Select id="days-select" bind:value={daysAhead} onchange={loadTasks} class="w-auto">
				<option value={7}>{$t('dashboard.upcoming.days', { count: 7 })}</option>
				<option value={14}>{$t('dashboard.upcoming.days', { count: 14 })}</option>
				<option value={30}>{$t('dashboard.upcoming.days', { count: 30 })}</option>
			</Select>
		</div>
		<Checkbox bind:checked={showOverdue} onchange={loadTasks}
			>{$t('dashboard.upcoming.includeOverdue')}</Checkbox
		>
	</div>
</div>

{#if $loading}
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else if $error}
	<Alert color="red">{$error}</Alert>
{:else if $tasks.length === 0}
	<div class="text-center py-12 text-gray-400">
		<CalendarMonthOutline class="w-12 h-12 mx-auto mb-3" />
		<p>{$t('dashboard.upcoming.empty')}</p>
		<p class="text-sm">
			{$t('dashboard.upcoming.emptyHint')}
		</p>
	</div>
{:else}
	<div class="flex flex-col gap-2">
		{#each $tasks as task (task.id)}
			{@const due = task.dueDate ? new Date(task.dueDate) : null}
			{@const isOverdue = due !== null && due < new Date()}
			<Card
				class="flex flex-col gap-2 p-3.5 {isOverdue
					? 'border-red-300 dark:bg-gray-800 dark:border-red-700'
					: ''}"
			>
				<div class="flex items-center gap-3">
					<div class="flex-1 min-w-0">
						<a href="/tasks/{task.id}" class="font-medium text-gray-900 dark:text-white hover:underline"
							>{task.title}</a
						>
						{#if task.parentId != null && projectNames[task.parentId]}<span class="text-xs text-gray-400 ml-2"
								>{projectNames[task.parentId]}</span
							>{/if}
					</div>
					<div class="shrink-0 text-right flex flex-col gap-1">
						<div>
							<div class="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">
								{$t('common.field.dueDate')}
							</div>
							<span
								class="text-xs flex items-center justify-end gap-0.5 {isOverdue
									? 'text-red-500'
									: due !== null
										? 'text-gray-600 dark:text-gray-300'
										: 'text-gray-400'}"
							>
								{#if isOverdue}<ExclamationCircleOutline class="w-3.5 h-3.5 shrink-0" />{/if}
								{due !== null ? $fmt.date(due) : $t('dashboard.upcoming.notSet')}
							</span>
						</div>
						<div>
							<div class="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">
								{$t('common.field.priority')}
							</div>
							<span class="text-xs" data-priority={task.priority}>
								{task.priority && task.priority > 0
									? $t(`common.priority.${task.priority}` as MessageKey)
									: '—'}
							</span>
						</div>
						<div>
							<div class="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">
								{$t('common.field.status')}
							</div>
							<span class="inline-flex items-center text-xs font-semibold" data-status={task.status}
								>{task.status ? $t(`common.status.${task.status}` as MessageKey) : task.status}</span
							>
						</div>
					</div>
				</div>
				{#if task.percentDone && task.percentDone > 0}
					<Progressbar progress={task.percentDone} size="h-4" color="indigo" labelInside />
				{/if}
			</Card>
		{/each}
	</div>
{/if}
