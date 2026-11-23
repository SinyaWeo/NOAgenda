<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import { apiGetAuth, apiPostAuth, apiGet } from '$lib/api';
	import { authSession, initializeAuth } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { Alert, Button, Card, Input, Select, Textarea } from 'flowbite-svelte';
	import { ExclamationCircleOutline, CaretRightSolid } from 'flowbite-svelte-icons';
	import CalendarView from '$lib/components/views/CalendarView.svelte';
	import { showToast } from '$lib/toast';
	import { errMessage } from '$lib/errors';
	import { t, fmt, tr } from '$lib/i18n';
	import { MAX_TASK_TITLE, needsTextarea, taskTitles } from '$lib/quick-add';
	import type { Project, Quote, Task } from '$lib/types';

	const user = derived(authSession, ($authSession) => $authSession.user);
	const projects = writable<Project[]>([]);
	const allProjects = writable<Project[]>([]); // every project, for the quick-add choice
	const projectCount = writable(0); // total, not just the few shown below
	const error = writable('');
	const upcomingTasks = writable<Task[]>([]);
	const overdueTasks = writable<Task[]>([]);
	const loading = writable(true);
	const quote = writable<Quote | null>(null);

	let quickText = $state('');
	let quickProjectId = $state('');
	let adding = $state(false);
	// A single-line input until the text needs more room; then a text area, which stays until the text is cleared.
	let multiline = $state(false);
	let quickArea = $state<HTMLTextAreaElement | undefined>();

	$effect(() => {
		if (!quickText) multiline = false;
		else if (!multiline && needsTextarea(quickText)) {
			multiline = true;
			tick().then(() => {
				quickArea?.focus();
				quickArea?.setSelectionRange(quickText.length, quickText.length);
			});
		}
	});

	/** A single-line input drops line breaks, so a paste with some (and Shift+Enter) is inserted by hand. */
	function insertAtCaret(el: HTMLInputElement, text: string) {
		const start = el.selectionStart ?? quickText.length;
		const end = el.selectionEnd ?? start;
		quickText = quickText.slice(0, start) + text + quickText.slice(end);
	}
	function onQuickPaste(e: ClipboardEvent) {
		const pasted = e.clipboardData?.getData('text') ?? '';
		if (!/[\r\n]/.test(pasted)) return;
		e.preventDefault();
		insertAtCaret(e.currentTarget as HTMLInputElement, pasted.replace(/\r\n?/g, '\n'));
	}
	function onQuickKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || !e.shiftKey) return;
		e.preventDefault();
		insertAtCaret(e.currentTarget as HTMLInputElement, '\n');
	}

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
			allProjects.set(p);
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

	/** One task per line, in order. Lines already added are removed from the box if a later one fails. */
	async function quickAddTasks() {
		const titles = taskTitles(quickText);
		if (!titles.length) return;
		if (titles.some((l) => l.length > MAX_TASK_TITLE)) {
			showToast(tr('dashboard.quickAdd.lineTooLong', { max: MAX_TASK_TITLE }), 'error');
			return;
		}
		adding = true;
		let done = 0;
		try {
			for (const title of titles) {
				await apiPostAuth('/tasks', {
					title,
					...(quickProjectId ? { project: { id: Number(quickProjectId) } } : {})
				});
				done++;
			}
			quickText = '';
		} catch (e: unknown) {
			quickText = titles.slice(done).join('\n');
			showToast(errMessage(e, tr('dashboard.quickAdd.failed')), 'error');
		} finally {
			adding = false;
			if (done) await refresh();
		}
	}

	/** The whole text, line breaks included, as one private idea (under the chosen project, if any). */
	async function quickAddIdea() {
		const text = quickText.trim();
		if (!text) return;
		adding = true;
		try {
			await apiPostAuth('/ideas', {
				text,
				...(quickProjectId ? { projectId: Number(quickProjectId) } : {})
			});
			quickText = '';
			showToast(tr('dashboard.quickAdd.ideaAdded'));
		} catch (e: unknown) {
			showToast(errMessage(e, tr('dashboard.quickAdd.ideaFailed')), 'error');
		} finally {
			adding = false;
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

	<!-- Quick add: a task per line, or one idea -->
	<Card class="mb-4">
		<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
			{$t('dashboard.quickAdd.title')}
		</h2>
		<p class="text-sm text-gray-500 dark:text-gray-400 -mt-2 mb-3">
			{$t('dashboard.quickAdd.hint')}
		</p>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				quickAddTasks();
			}}
			class="flex flex-col gap-2"
		>
			{#if multiline}
				<Textarea
					bind:value={quickText}
					bind:elementRef={quickArea}
					rows={4}
					placeholder={$t('dashboard.quickAdd.placeholder')}
					aria-label={$t('dashboard.quickAdd.placeholder')}
					class="w-full"
				/>
			{:else}
				<Input
					type="text"
					bind:value={quickText}
					onpaste={onQuickPaste}
					onkeydown={onQuickKeydown}
					placeholder={$t('dashboard.quickAdd.placeholder')}
					aria-label={$t('dashboard.quickAdd.placeholder')}
					class="w-full"
				/>
			{/if}
			<Select
				placeholder=""
				bind:value={quickProjectId}
				aria-label={$t('common.field.project')}
				class="w-full"
			>
				<option value="">{$t('dashboard.quickAdd.noProject')}</option>
				{#each $allProjects as p (p.id)}<option value={String(p.id)}>{p.name}</option>{/each}
			</Select>
			<div class="flex gap-2 flex-wrap">
				<Button type="button" onclick={quickAddTasks} disabled={adding || !taskTitles(quickText).length}>
					{adding ? $t('dashboard.quickAdd.adding') : $t('dashboard.quickAdd.addTasks')}
				</Button>
				<Button type="button" color="light" onclick={quickAddIdea} disabled={adding || !quickText.trim()}>
					{$t('dashboard.quickAdd.addIdea')}
				</Button>
			</div>
		</form>
	</Card>

	<div class="grid grid-cols-2 gap-6 items-stretch">
		<!-- Overdue -->
		{#if $overdueTasks.length > 0}
			<Card class="col-span-2 border-red-300 dark:bg-gray-800 dark:border-red-700">
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
							class="text-sm truncate text-gray-800 dark:text-gray-200 hover:underline"
						>
							{task.title}
						</a>
						<span class="text-xs text-red-500 shrink-0 ml-2">{$fmt.date(task.dueDate)}</span>
					</div>
				{/each}
			</Card>
		{/if}

		<!-- Upcoming tasks -->
		<Card class="col-span-2">
			<div class="flex justify-between items-center mb-3">
				<h2 class="text-base font-semibold text-gray-900 dark:text-white m-0">
					{$t('dashboard.upcomingTasks.title')}
				</h2>
				<a
					href="/upcoming"
					class="text-sm text-primary-600 dark:text-primary-400 no-underline hover:underline"
				>
					{$t('dashboard.viewAll')}
					<CaretRightSolid class="w-3 h-3 inline ml-0.5" />
				</a>
			</div>
			<CalendarView initialMode="week" />
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
				>
					{$t('dashboard.viewAll')}
					<CaretRightSolid class="w-3 h-3 inline ml-0.5" />
				</a>
			</div>
			{#if $projects.length === 0}
				{@const parts = $t('dashboard.recentProjects.empty', { link: '\u0000' }).split('\u0000')}
				<p class="text-gray-400 text-sm m-0">
					{parts[0]}<a href="/projects/new" class="text-primary-600 hover:underline">
						{$t('dashboard.recentProjects.create')}
					</a>{parts[1]}
				</p>
			{:else}
				<div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
					{#each $projects as project (project.id)}
						<a
							href="/projects/{project.id}"
							class="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-medium no-underline hover:border-primary-500 transition-colors"
						>
							{project.name}
						</a>
					{/each}
				</div>
			{/if}
		</Card>
	</div>
{/if}
