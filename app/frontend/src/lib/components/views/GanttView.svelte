<script lang="ts">
	import type { Task } from '$lib/types';
	import { CalendarMonthOutline } from 'flowbite-svelte-icons';
	import { isOverdue } from './util';
	import { t, fmt, locale } from '$lib/i18n';
	import { addDays, diffDays, startOfDay } from '$lib/dates';

	interface Props {
		tasks: Task[];
		/** The global task page: struck-through done tasks, larger empty state. */
		large?: boolean;
	}
	let { tasks, large = false }: Props = $props();

	const ZOOMS = { day: 32, week: 12, month: 4 } as const;
	type Zoom = keyof typeof ZOOMS;
	const ROW = 40;
	const HEADER = 48;
	const TITLE_W = 220;

	let zoom = $state<Zoom>('day');
	const px = $derived(ZOOMS[zoom]);

	const rows = $derived(
		tasks
			.filter((t) => t.startDate || t.dueDate)
			.map((task) => {
				const a = startOfDay((task.startDate ?? task.dueDate) as string);
				const b = startOfDay((task.dueDate ?? task.startDate) as string);
				return { task, start: a <= b ? a : b, end: a <= b ? b : a };
			})
			.sort((x, y) => x.start.getTime() - y.start.getTime() || x.end.getTime() - y.end.getTime())
	);

	const today = startOfDay(new Date());
	const range = $derived.by(() => {
		let min = today;
		let max = today;
		for (const r of rows) {
			if (r.start < min) min = r.start;
			if (r.end > max) max = r.end;
		}
		const from = addDays(min, -3);
		return { from, days: diffDays(from, addDays(max, 3)) + 1 };
	});

	const width = $derived(range.days * px);
	const todayX = $derived((diffDays(range.from, today) + 0.5) * px);

	const days = $derived(Array.from({ length: range.days }, (_, i) => addDays(range.from, i)));
	const months = $derived.by(() => {
		const out: { label: string; x: number; w: number }[] = [];
		const f = new Intl.DateTimeFormat($locale, { month: 'long', year: 'numeric' });
		days.forEach((d, i) => {
			const last = out[out.length - 1];
			if (last && d.getDate() !== 1) last.w += px;
			else out.push({ label: f.format(d), x: i * px, w: px });
		});
		return out;
	});
	const ticks = $derived(
		zoom === 'month'
			? []
			: days
					.map((d, i) => ({ d, i }))
					.filter(({ d }) => zoom === 'day' || d.getDay() === 1)
					.map(({ d, i }) => ({ x: i * px, label: String(d.getDate()), weekend: d.getDay() % 6 === 0 }))
	);
	const weekends = $derived(
		zoom === 'month' ? [] : days.map((d, i) => ({ d, i })).filter(({ d }) => d.getDay() % 6 === 0)
	);

	let scroller: HTMLDivElement | undefined = $state();
	$effect(() => {
		// Bring today into view whenever the data or zoom changes the layout.
		void todayX;
		if (scroller) scroller.scrollLeft = Math.max(0, todayX - scroller.clientWidth / 3);
	});

	function bar(r: (typeof rows)[number]) {
		return {
			left: diffDays(range.from, r.start) * px,
			width: Math.max((diffDays(r.start, r.end) + 1) * px, 6)
		};
	}
</script>

{#if rows.length}
	<div class="flex justify-end mb-2 gap-1">
		{#each Object.keys(ZOOMS) as z (z)}
			<button
				type="button"
				class="px-3 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 {zoom === z
					? 'font-semibold text-primary-600 dark:text-primary-400'
					: 'text-gray-500 dark:text-gray-400 hover:underline'}"
				onclick={() => (zoom = z as Zoom)}
			>
				{$t(`views.gantt.zoom.${z}` as 'views.gantt.zoom.day')}
			</button>
		{/each}
	</div>
	<div
		class="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
	>
		<div class="shrink-0 border-r border-gray-200 dark:border-gray-700" style="width:{TITLE_W}px">
			<div
				class="px-3 flex items-center text-xs font-semibold uppercase text-gray-400 border-b border-gray-200 dark:border-gray-700"
				style="height:{HEADER}px"
			>
				{$t('views.gantt.task')}
			</div>
			{#each rows as { task } (task.id)}
				<div
					class="px-3 flex items-center border-b border-gray-100 dark:border-gray-700 last:border-b-0"
					style="height:{ROW}px"
				>
					<a
						href="/tasks/{task.id}"
						class="truncate text-sm font-medium text-gray-800 dark:text-gray-200 hover:underline {large &&
						task.status === 'done'
							? 'line-through text-gray-400'
							: ''}"
						title={task.title}
					>
						{task.title}
					</a>
				</div>
			{/each}
		</div>

		<div class="overflow-x-auto flex-1" bind:this={scroller}>
			<div class="relative" style="width:{width}px; height:{HEADER + rows.length * ROW}px">
				{#each weekends as { i } (i)}
					<div
						class="absolute top-0 bottom-0 bg-gray-50 dark:bg-gray-900/40"
						style="left:{i * px}px; width:{px}px"
					></div>
				{/each}

				<div
					class="absolute top-0 left-0 right-0 border-b border-gray-200 dark:border-gray-700"
					style="height:{HEADER}px"
				>
					{#each months as m (m.x)}
						<div
							class="absolute top-0 h-6 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700 truncate"
							style="left:{m.x}px; width:{m.w}px"
						>
							{m.label}
						</div>
					{/each}
					{#each ticks as tk (tk.x)}
						<div
							class="absolute top-6 h-6 text-center text-[11px] leading-6 text-gray-400 border-l border-gray-100 dark:border-gray-700"
							style="left:{tk.x}px; width:{px}px"
						>
							{zoom === 'day' ? tk.label : ''}{zoom === 'week' ? ' ' + tk.label : ''}
						</div>
					{/each}
				</div>

				{#each rows as r, i (r.task.id)}
					{@const b = bar(r)}
					{@const overdue = isOverdue(r.task)}
					<div
						class="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-700"
						style="top:{HEADER + i * ROW}px; height:{ROW}px"
					>
						<a
							href="/tasks/{r.task.id}"
							class="absolute top-2.5 h-5 rounded overflow-hidden bg-current opacity-90 hover:opacity-100"
							style="left:{b.left}px; width:{b.width}px"
							data-status={overdue ? 'overdue' : (r.task.status ?? 'open')}
							title="{r.task.title} · {$fmt.date(r.start)}{r.end > r.start ? ' – ' + $fmt.date(r.end) : ''}"
						>
							{#if r.task.percentDone}
								<span
									class="absolute inset-y-0 left-0 bg-black/30"
									style="width:{Math.min(100, r.task.percentDone)}%"
								></span>
							{/if}
						</a>
					</div>
				{/each}

				<div
					class="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none"
					style="left:{todayX}px"
					title={$t('views.gantt.today')}
				></div>
			</div>
		</div>
	</div>
{:else}
	<div class="text-center {large ? 'py-12' : 'py-10'} text-gray-400">
		<CalendarMonthOutline class="{large ? 'w-12 h-12 mb-3' : 'w-10 h-10 mb-2'} mx-auto" />
		<p>{$t('views.gantt.empty')}</p>
	</div>
{/if}
