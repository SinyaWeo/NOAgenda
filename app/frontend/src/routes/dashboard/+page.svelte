<script lang="ts">
	import { onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { apiGetAuth, apiPostAuth, apiGet } from '$lib/api';
	import { authSession, initializeAuth } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { Alert, Button, Card, Input, Select } from 'flowbite-svelte';
	import { ExclamationCircleOutline, CaretRightSolid } from 'flowbite-svelte-icons';
	import { showToast } from '$lib/toast';
	import { errMessage } from '$lib/errors';
	import { t, fmt, tr } from '$lib/i18n';
	import type { Project, Quote, Task } from '$lib/types';

	const user = derived(authSession, ($authSession) => $authSession.user);
	const projects = writable<Project[]>([]);
	const projectCount = writable(0); // total, not just the few shown below
	const error = writable('');
	const upcomingTasks = writable<Task[]>([]);
	const overdueTasks = writable<Task[]>([]);
	const loading = writable(true);
	const quote = writable<Quote | null>(null);

	let quickTitle = $state('');
	let quickProjectId = $state('');
	let addingTask = $state(false);

	const STATUS_DOTS: Record<string, string> = {
		open: 'bg-primary-500',
		in_progress: 'bg-amber-400',
		done: 'bg-green-500'
	};

	onMount(async () => {
		const me = $user ?? (await initializeAuth());
		if (!me) {
			goto('/user/login');
			return;
		}
		await refresh();
		try {
			const q = await apiGet<Quote | null>('/quotes/random');
			quote.set(q);
		} catch (_) {}
	});

	async function refresh() {
		try {
			const now = new Date();
			// The server does the filtering and sorting: only the few rows the page shows are fetched.
			const overdueQuery = new URLSearchParams({
				excludeDone: 'true',
				dueBefore: now.toISOString(),
				sort: 'dueDate',
				order: 'ASC',
				limit: '5'
			});
			const upcomingQuery = new URLSearchParams({
				excludeDone: 'true',
				sort: 'dueDate',
				order: 'ASC',
				limit: '8'
			});
			const [p, overdue, upcoming] = await Promise.all([
				apiGetAuth<Project[]>('/projects'),
				apiGetAuth<Task[]>(`/tasks?${overdueQuery}`),
				apiGetAuth<Task[]>(`/tasks?${upcomingQuery}`)
			]);
			projectCount.set(p.length);
			projects.set(p.slice(0, 5));
			error.set('');
			overdueTasks.set(overdue);
			upcomingTasks.set(upcoming);
		} catch (e: unknown) {
			// Do not pretend an empty dashboard: say that loading failed.
			error.set(errMessage(e, tr('dashboard.loadFailed')));
		} finally {
			loading.set(false);
		}
	}

	async function quickAddTask() {
		if (!quickTitle.trim() || !quickProjectId) return;
		addingTask = true;
		try {
			await apiPostAuth('/tasks', {
				title: quickTitle,
				project: { id: Number(quickProjectId) }
			});
			quickTitle = '';
			await refresh();
		} catch (e: unknown) {
			showToast(errMessage(e, tr('dashboard.quickAdd.failed')), 'error');
		} finally {
			addingTask = false;
		}
	}
</script>

{#if $loading}
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else}
	{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
	<!-- Header row: welcome text left, stat cards right -->
	<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
		<div class="min-w-0">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
				{$user?.name || $user?.username
					? $t('dashboard.welcomeName', { name: $user?.name || $user?.username })
					: $t('dashboard.welcome')}
			</h1>
			<p class="text-gray-500 dark:text-gray-400 mt-0 mb-0">
				{$fmt.dateLong(new Date())}
			</p>
		</div>

		<!-- Stat cards -->
		<div class="flex gap-3 shrink-0">
			<a href="/projects" class="no-underline">
				<Card class="p-4 hover:shadow-md transition-shadow cursor-pointer text-center">
					<p class="text-xs font-medium text-gray-500 uppercase tracking-wide m-0">
						{$t('dashboard.stat.projects')}
					</p>
					<p class="text-3xl font-bold text-gray-900 dark:text-white mt-1 mb-0">
						{$projectCount}
					</p>
				</Card>
			</a>
			<a href="/upcoming" class="no-underline">
				<Card class="p-4 hover:shadow-md transition-shadow cursor-pointer text-center">
					<p class="text-xs font-medium text-gray-500 uppercase tracking-wide m-0">
						{$t('dashboard.stat.upcoming')}
					</p>
					<p class="text-3xl font-bold text-gray-900 dark:text-white mt-1 mb-0">
						{$upcomingTasks.length}
					</p>
				</Card>
			</a>
			{#if $overdueTasks.length > 0}
				<a href="/upcoming" class="no-underline">
					<Card
						class="p-4 hover:shadow-md transition-shadow cursor-pointer text-center border-red-300 dark:bg-gray-800 dark:border-red-700"
					>
						<p class="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide m-0">
							{$t('dashboard.stat.overdue')}
						</p>
						<p class="text-3xl font-bold text-red-600 dark:text-red-400 mt-1 mb-0">
							{$overdueTasks.length}
						</p>
					</Card>
				</a>
			{/if}
		</div>
	</div>

	{#if $quote}
		<blockquote
			class="relative bg-white dark:bg-gray-800 border-l-4 border-primary-500 rounded-lg px-5 py-4 mb-6 shadow-sm"
		>
			<p class="text-gray-700 dark:text-gray-200 italic m-0">“{$quote.text}”</p>
			{#if $quote.author}
				<footer class="mt-2 text-sm text-gray-400">— {$quote.author}</footer>
			{/if}
		</blockquote>
	{/if}

	<!-- Quick-add task -->
	{#if $projects.length > 0}
		<Card class="mb-4">
			<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
				{$t('dashboard.quickAdd.title')}
			</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					quickAddTask();
				}}
				class="flex gap-2 flex-wrap"
			>
				<Input
					type="text"
					bind:value={quickTitle}
					placeholder={$t('dashboard.quickAdd.titlePlaceholder')}
					class="flex-1 min-w-36"
				/>
				<Select bind:value={quickProjectId} class="flex-1 min-w-36">
					<option value="">{$t('dashboard.quickAdd.selectProject')}</option>
					{#each $projects as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
				</Select>
				<Button type="submit" disabled={addingTask || !quickTitle.trim() || !quickProjectId}>
					{addingTask ? $t('dashboard.quickAdd.adding') : $t('dashboard.quickAdd.add')}
				</Button>
			</form>
		</Card>
	{/if}

	<div class="grid grid-cols-2 gap-6 items-stretch">
		<!-- Overdue -->
		{#if $overdueTasks.length > 0}
			<Card class="h-full border-red-300 dark:bg-gray-800 dark:border-red-700">
				<div class="flex items-center gap-2 mb-3">
					<ExclamationCircleOutline class="w-4 h-4 text-red-500" />
					<h2 class="text-base font-semibold text-red-600 dark:text-red-400 m-0">
						{$t('dashboard.overdue.title')}
					</h2>
				</div>
				{#each $overdueTasks as task (task.id)}
					<div
						class="flex justify-between items-center py-1.5 border-b border-red-100 dark:border-red-800 last:border-0"
					>
						<a
							href="/tasks/{task.id}"
							class="text-sm truncate text-gray-800 dark:text-gray-200 hover:underline">{task.title}</a
						>
						<span class="text-xs text-red-500 shrink-0 ml-2">{$fmt.date(task.dueDate)}</span>
					</div>
				{/each}
			</Card>
		{/if}

		<!-- Upcoming tasks -->
		<Card class={$overdueTasks.length === 0 ? 'col-span-2 h-full' : 'h-full'}>
			<div class="flex justify-between items-center mb-3">
				<h2 class="text-base font-semibold text-gray-900 dark:text-white m-0">
					{$t('dashboard.upcomingTasks.title')}
				</h2>
				<a
					href="/upcoming"
					class="text-sm text-primary-600 dark:text-primary-400 no-underline hover:underline"
					>{$t('dashboard.viewAll')} <CaretRightSolid class="w-3 h-3 inline ml-0.5" /></a
				>
			</div>
			{#if $upcomingTasks.length === 0}
				<p class="text-gray-400 text-sm m-0">{$t('dashboard.upcomingTasks.empty')}</p>
			{:else}
				{#each $upcomingTasks as task (task.id)}
					{@const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()}
					<div
						class="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
					>
						<span class="w-2 h-2 rounded-full shrink-0 {STATUS_DOTS[task.status ?? ''] ?? 'bg-gray-400'}"
						></span>
						<a
							href="/tasks/{task.id}"
							class="text-sm flex-1 truncate text-gray-800 dark:text-gray-200 hover:underline">{task.title}</a
						>
						{#if task.dueDate}<span class="text-xs shrink-0 {isOverdue ? 'text-red-500' : 'text-gray-400'}"
								>{$fmt.date(task.dueDate)}</span
							>{/if}
					</div>
				{/each}
			{/if}
		</Card>

		<!-- Recent projects -->
		<Card class="col-span-2">
			<div class="flex justify-between items-center mb-3">
				<h2 class="text-base font-semibold text-gray-900 dark:text-white m-0">
					{$t('dashboard.recentProjects.title')}
				</h2>
				<a
					href="/projects"
					class="text-sm text-primary-600 dark:text-primary-400 no-underline hover:underline"
					>{$t('dashboard.viewAll')} <CaretRightSolid class="w-3 h-3 inline ml-0.5" /></a
				>
			</div>
			{#if $projects.length === 0}
				{@const parts = $t('dashboard.recentProjects.empty', { link: '\u0000' }).split('\u0000')}
				<p class="text-gray-400 text-sm m-0">
					{parts[0]}<a href="/projects/new" class="text-primary-600 hover:underline"
						>{$t('dashboard.recentProjects.create')}</a
					>{parts[1]}
				</p>
			{:else}
				<div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
					{#each $projects as project (project.id)}
						<a
							href="/projects/{project.id}"
							class="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-medium no-underline hover:border-primary-500 transition-colors"
							>{project.name}</a
						>
					{/each}
				</div>
			{/if}
		</Card>
	</div>
{/if}
