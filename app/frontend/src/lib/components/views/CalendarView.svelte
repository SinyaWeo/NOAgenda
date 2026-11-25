<script lang="ts">
	import { untrack } from 'svelte';
	import { apiGetAuth, apiPutAuth, MAX_PAGE_SIZE } from '$lib/api';
	import { authSession } from '$lib/auth';
	import {
		addDaysKey,
		bucketByDay,
		dayBounds,
		dayKey,
		dayKeyOf,
		effectiveZone,
		keyParts,
		keyToDate,
		monthGrid,
		rescheduled,
		weekRow,
		type DayKey,
		type WeekStart
	} from '$lib/calendar';
	import { errMessage } from '$lib/errors';
	import { cleanCriteria, criteriaToQuery } from '$lib/filters';
	import { t, tr, fmt, locale } from '$lib/i18n';
	import { taskProjectId } from '$lib/project-groups';
	import { showToast } from '$lib/toast';
	import type { FilterCriteria, Task } from '$lib/types';
	import type { TaskOccurrence } from '$lib/types-task';
	import { Button, ButtonGroup } from 'flowbite-svelte';
	import { isOverdue } from './util';

	interface Props {
		/** Show only this project's tasks (and its repeating tasks' future cycles). */
		projectId?: number;
		/** Filters of the global task page; the visible date range replaces their due-date filter. */
		criteria?: FilterCriteria;
		/** Start in the week view (compact, e.g. on the dashboard) instead of the month. */
		initialMode?: 'month' | 'week';
		/** id -> name of the user's projects: each task then shows a link to its project. */
		projectNames?: Record<number, string>;
	}
	let { projectId, criteria, initialMode = 'month', projectNames = {} }: Props = $props();

	type Entry =
		| { kind: 'task'; id: number; date: string; task: Task }
		| { kind: 'occurrence'; id: number; date: string; occurrence: TaskOccurrence };

	const MAX_CHIPS = 3;
	const zone = $derived(effectiveZone($authSession.user?.timezone));
	const weekStart = $derived<WeekStart>($locale === 'cs' ? 1 : 0);
	const todayKey = $derived(dayKeyOf(new Date(), zone));

	let mode = $state<'month' | 'week'>(untrack(() => initialMode));
	let anchor = $state<DayKey | null>(null); // a day inside the visible month/week; null = today
	const focus = $derived(anchor ?? todayKey);

	const rows = $derived.by<DayKey[][]>(() => {
		if (mode === 'week') return [weekRow(focus, weekStart)];
		const { year, month } = keyParts(focus);
		return monthGrid(year, month, weekStart);
	});
	const days = $derived(rows.flat());
	const focusMonth = $derived(keyParts(focus).month);
	const title = $derived(
		mode === 'month'
			? $fmt.monthYear(keyToDate(dayKey(keyParts(focus).year, keyParts(focus).month, 1)))
			: `${$fmt.date(keyToDate(days[0]))} – ${$fmt.date(keyToDate(days[6]))}`
	);
	const headers = $derived(weekRow(todayKey, weekStart).map((k) => $fmt.weekdayShort(keyToDate(k))));

	// Filters other than the date range: future cycles cannot honour them, so they are left out while any apply.
	const baseQuery = $derived(criteriaToQuery({ ...cleanCriteria(criteria ?? {}), due: undefined }));
	const filtered = $derived(Object.keys(cleanCriteria({ ...(criteria ?? {}), due: undefined })).length > 0);

	let tasks = $state<Task[]>([]);
	let occurrences = $state<TaskOccurrence[]>([]);
	let loadError = $state(false);
	let loadSeq = 0;

	async function load() {
		const seq = ++loadSeq;
		const first = days[0];
		const last = days[days.length - 1];
		const from = dayBounds(first, zone).start.toISOString();
		const to = dayBounds(last, zone).end.toISOString();
		const q = new URLSearchParams(baseQuery);
		q.set('dueAfter', from);
		q.set('dueBefore', to);
		q.set('sort', 'dueDate');
		q.set('limit', String(MAX_PAGE_SIZE));
		if (projectId !== undefined) q.set('projectId', String(projectId));
		const o = new URLSearchParams({ from, to });
		if (projectId !== undefined) o.set('projectId', String(projectId));
		try {
			const [list, future] = await Promise.all([
				apiGetAuth<Task[]>(`/tasks?${q}`),
				filtered
					? Promise.resolve([] as TaskOccurrence[])
					: apiGetAuth<TaskOccurrence[]>(`/tasks/occurrences?${o}`)
			]);
			if (seq !== loadSeq) return;
			tasks = list;
			occurrences = future;
			loadError = false;
		} catch (e: unknown) {
			if (seq !== loadSeq) return;
			loadError = true;
			showToast(errMessage(e, tr('views.calendar.loadFailed')), 'error');
		}
	}

	// Reload whenever the visible range, the filters or the project change.
	$effect(() => {
		void days;
		void baseQuery;
		void projectId;
		void filtered;
		void zone;
		untrack(load);
	});

	const byDay = $derived.by(() => {
		const entries: Entry[] = [
			...tasks
				.filter((x) => x.dueDate)
				.map((task): Entry => ({ kind: 'task', id: task.id, date: task.dueDate as string, task })),
			...occurrences.map((occurrence): Entry => ({
				kind: 'occurrence',
				id: occurrence.taskId,
				date: occurrence.dueDate,
				occurrence
			}))
		];
		return bucketByDay(entries, (e) => e.date, zone);
	});

	function step(direction: -1 | 1) {
		if (mode === 'week') {
			anchor = addDaysKey(focus, 7 * direction);
		} else {
			const { year, month } = keyParts(focus);
			anchor = dayKey(year, month + direction, 1);
		}
	}

	function showWeekOf(key: DayKey) {
		anchor = key;
		mode = 'week';
	}

	// Drag a task to another day.
	let draggingId = $state<number | null>(null);
	let overDay = $state<DayKey | null>(null);

	function onDragStart(e: DragEvent, task: Task) {
		if (!e.dataTransfer) return;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', String(task.id));
		draggingId = task.id;
	}

	function onDragEnd() {
		draggingId = null;
		overDay = null;
	}

	function onDragOver(e: DragEvent, key: DayKey) {
		if (draggingId == null) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		overDay = key;
	}

	async function onDrop(e: DragEvent, key: DayKey) {
		e.preventDefault();
		const task = tasks.find((x) => x.id === draggingId);
		onDragEnd();
		if (!task?.dueDate || dayKeyOf(task.dueDate, zone) === key) return;
		try {
			const updated = await apiPutAuth<Task>(`/tasks/${task.id}`, rescheduled(task, key, zone));
			tasks = tasks.map((x) => (x.id === task.id ? updated : x));
			showToast(tr('views.calendar.moved'), 'success');
			if (updated.repeatAfter) await load(); // its future cycles moved with it
		} catch (err: unknown) {
			showToast(errMessage(err, tr('views.calendar.moveFailed')), 'error');
		}
	}

	const name = (task: Task) => task.title ?? task.name ?? '';
</script>

<div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
	<div class="flex items-center gap-2">
		<ButtonGroup>
			<Button size="xs" color="light" aria-label={$t('views.calendar.prev')} onclick={() => step(-1)}>
				‹
			</Button>
			<Button size="xs" color="light" onclick={() => (anchor = null)}>{$t('views.calendar.today')}</Button>
			<Button size="xs" color="light" aria-label={$t('views.calendar.next')} onclick={() => step(1)}>
				›
			</Button>
		</ButtonGroup>
		<h2 class="text-lg font-semibold m-0 capitalize text-gray-800 dark:text-gray-100">{title}</h2>
	</div>
	<ButtonGroup>
		<Button size="xs" color={mode === 'month' ? 'primary' : 'light'} onclick={() => (mode = 'month')}>
			{$t('views.calendar.month')}
		</Button>
		<Button size="xs" color={mode === 'week' ? 'primary' : 'light'} onclick={() => (mode = 'week')}>
			{$t('views.calendar.week')}
		</Button>
	</ButtonGroup>
</div>

<div class="calendar-grid" role="grid" aria-label={title}>
	{#each headers as h (h)}
		<div class="calendar-day-header" role="columnheader">{h}</div>
	{/each}
	{#each days as key (key)}
		{@const entries = byDay.get(key) ?? []}
		{@const shown = mode === 'week' ? entries : entries.slice(0, MAX_CHIPS)}
		<div
			class="calendar-day"
			class:calendar-day-other={mode === 'month' && keyParts(key).month !== focusMonth}
			class:calendar-day-today={key === todayKey}
			class:calendar-day-over={overDay === key}
			class:calendar-day-tall={mode === 'week'}
			role="gridcell"
			tabindex="-1"
			aria-label={$fmt.dateLong(keyToDate(key))}
			ondragover={(e) => onDragOver(e, key)}
			ondragleave={(e) => {
				if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) overDay = null;
			}}
			ondrop={(e) => onDrop(e, key)}
		>
			<div class="calendar-day-num">{keyParts(key).day}</div>
			{#each shown as entry (entry.kind + entry.id + entry.date)}
				{@const entryProject =
					entry.kind === 'task' ? taskProjectId(entry.task, projectNames) : entry.occurrence.projectId}
				{#if entry.kind === 'task'}
					<a
						href="/tasks/{entry.task.id}"
						class="calendar-task-chip"
						class:calendar-task-overdue={isOverdue(entry.task)}
						class:calendar-task-done={entry.task.status === 'done'}
						data-status={isOverdue(entry.task) ? 'overdue' : entry.task.status}
						data-priority={entry.task.priority}
						draggable="true"
						title={name(entry.task)}
						ondragstart={(e) => onDragStart(e, entry.task)}
						ondragend={onDragEnd}
					>
						{name(entry.task)}
					</a>
				{:else}
					<a
						href="/tasks/{entry.occurrence.taskId}"
						class="calendar-task-chip calendar-task-future"
						data-priority={entry.occurrence.priority}
						title="{entry.occurrence.title ?? ''} — {$t('views.calendar.repeats')}"
					>
						<span aria-hidden="true">↻</span>
						{entry.occurrence.title ?? ''}
					</a>
				{/if}
				{#if entryProject != null && projectNames[entryProject]}
					<a href="/projects/{entryProject}" class="calendar-task-project">{projectNames[entryProject]}</a>
				{/if}
			{/each}
			{#if shown.length < entries.length}
				<button type="button" class="calendar-more" onclick={() => showWeekOf(key)}>
					{$t('views.calendar.more', { count: entries.length - shown.length })}
				</button>
			{/if}
		</div>
	{/each}
</div>

<p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
	{filtered ? $t('views.calendar.filtersNote') : $t('views.calendar.legend')}
</p>
{#if loadError}<p class="text-xs text-red-600 mt-1">{$t('views.calendar.loadFailed')}</p>{/if}
