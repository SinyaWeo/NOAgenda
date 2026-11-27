<script lang="ts">
	import type { Task } from '#lib/types.js';
	import { CalendarMonthOutline, CloseOutline } from 'flowbite-svelte-icons';
	import { goto } from '$app/navigation';
	import { isOverdue } from './util';
	import { taskProjectId } from '#lib/project-groups.js';
	import { t, locale } from '#lib/i18n/index.js';
	import { apiDeleteAuth, apiGetAuth, apiPostAuth, MAX_PAGE_SIZE } from '#lib/api.js';
	import { userTimeZone } from '#lib/auth.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import { dismissToast, showToast } from '#lib/toast.svelte.js';
	import {
		addDaysKey,
		dayKeyOf,
		diffDaysKey,
		keyParts,
		keyToDate,
		weekdayOfKey,
		type DayKey
	} from '#lib/calendar.js';
	import {
		cascade,
		datesFor,
		dragSpan,
		spanOf,
		violated,
		wouldCycle,
		type DateChange,
		type DragMode,
		type GanttData,
		type GanttDependency,
		type Span
	} from '#lib/gantt.js';

	interface Props {
		tasks: Task[];
		/** The global task page: struck-through done tasks, larger empty state. */
		large?: boolean;
		/** id -> name of the user's projects: each task then links to its project. */
		projectNames?: Record<number, string>;
		/**
		 * Receives tasks saved from the chart (moved, resized, pushed). Without it the chart is read-only;
		 * with it, the bars the user may edit can be dragged and linked.
		 */
		onTasksChange?: (updated: Task[]) => void;
	}
	let { tasks, large = false, projectNames = {}, onTasksChange }: Props = $props();

	const uid = $props.id();
	const ZOOMS = { day: 32, week: 12, month: 4 } as const;
	type Zoom = keyof typeof ZOOMS;
	const ROW = 40;
	const HEADER = 48;
	const TITLE_W = 220;
	const BAR_TOP = 10;
	const BAR_H = 20;
	/** Width of the resize grips at both ends of a bar. */
	const GRIP = 6;

	let zoom = $state<Zoom>('day');
	const px = $derived(ZOOMS[zoom]);
	const tz = $derived(userTimeZone());

	/** Tasks on the chart with the days they cover, in a stable order (by their saved dates). */
	const rows = $derived(
		tasks
			.map((task) => ({ task, span: spanOf(task, tz) }))
			.filter((r): r is { task: Task; span: Span } => r.span !== null)
			.sort(
				(x, y) =>
					x.span.start.localeCompare(y.span.start) ||
					x.span.end.localeCompare(y.span.end) ||
					x.task.id - y.task.id
			)
	);
	const rowIndex = $derived(new Map(rows.map((r, i) => [r.task.id, i])));
	const baseSpans = $derived(new Map(rows.map((r) => [r.task.id, r.span])));
	const taskById = $derived(new Map(rows.map((r) => [r.task.id, r.task])));

	// ---- dependencies and permissions (GET /gantt)
	let gantt = $state<GanttData>({ dependencies: [], editable: [] });
	const idsKey = $derived(
		rows
			.map((r) => r.task.id)
			.sort((a, b) => a - b)
			.slice(0, MAX_PAGE_SIZE)
			.join(',')
	);
	let loadSeq = 0;
	async function loadGantt(ids: string) {
		const seq = ++loadSeq;
		if (!ids) {
			gantt = { dependencies: [], editable: [] };
			return;
		}
		try {
			const data = await apiGetAuth<GanttData>(`/gantt?taskIds=${ids}`);
			if (seq === loadSeq) gantt = data;
		} catch (e: unknown) {
			if (seq === loadSeq) showToast(errMessage(e, t('views.gantt.loadFailed')), 'error');
		}
	}
	$effect(() => {
		void loadGantt(idsKey);
	});
	const editable = $derived(new Set(onTasksChange ? gantt.editable : []));
	const deps = $derived(gantt.dependencies.filter((d) => rowIndex.has(d.fromId) && rowIndex.has(d.toId)));

	// ---- drag state
	type BarDrag = {
		kind: 'bar';
		id: number;
		mode: DragMode;
		x0: number;
		origin: Span;
		days: number;
		moved: boolean;
	};
	type LinkDrag = { kind: 'link'; fromId: number; x: number; y: number; overId: number | null };
	let drag = $state<BarDrag | LinkDrag | null>(null);
	/** Spans being shown instead of the saved ones (while dragging and until the save answers). */
	let preview = $state<Map<number, Span> | null>(null);
	let previewBlocked: number[] = [];
	/** The click that ends a drag must not open the task. */
	let suppressClick = false;
	let selected = $state<string | null>(null);
	let chart: HTMLDivElement | undefined = $state();

	const spanFor = (id: number): Span | undefined => preview?.get(id) ?? baseSpans.get(id);

	// ---- layout
	const todayKey = $derived(dayKeyOf(new Date(), tz));
	const range = $derived.by(() => {
		let min = todayKey;
		let max = todayKey;
		for (const r of rows) {
			if (r.span.start < min) min = r.span.start;
			if (r.span.end > max) max = r.span.end;
		}
		const from = addDaysKey(min, -7);
		return { from, days: diffDaysKey(from, addDaysKey(max, 14)) + 1 };
	});
	const xOf = (key: DayKey) => diffDaysKey(range.from, key) * px;
	const width = $derived(range.days * px);
	const height = $derived(HEADER + rows.length * ROW);
	const todayX = $derived((diffDaysKey(range.from, todayKey) + 0.5) * px);

	const days = $derived(Array.from({ length: range.days }, (_, i) => addDaysKey(range.from, i)));
	const months = $derived.by(() => {
		const out: { label: string; x: number; w: number }[] = [];
		const f = new Intl.DateTimeFormat(locale.current, { month: 'long', year: 'numeric', timeZone: 'UTC' });
		days.forEach((d, i) => {
			const last = out[out.length - 1];
			if (last && keyParts(d).day !== 1) last.w += px;
			else out.push({ label: f.format(keyToDate(d)), x: i * px, w: px });
		});
		return out;
	});
	const ticks = $derived(
		zoom === 'month'
			? []
			: days
					.map((d, i) => ({ d, i }))
					.filter(({ d }) => zoom === 'day' || weekdayOfKey(d) === 1)
					.map(({ d, i }) => ({ x: i * px, label: String(keyParts(d).day) }))
	);
	const weekends = $derived(
		zoom === 'month' ? [] : days.map((d, i) => ({ d, i })).filter(({ d }) => weekdayOfKey(d) % 6 === 0)
	);

	const dayLabel = $derived.by(() => {
		const f = new Intl.DateTimeFormat(locale.current, { day: 'numeric', month: 'short', timeZone: 'UTC' });
		return (key: DayKey) => f.format(keyToDate(key));
	});
	const spanLabel = (s: Span) =>
		s.start === s.end ? dayLabel(s.start) : `${dayLabel(s.start)} – ${dayLabel(s.end)}`;

	let scroller: HTMLDivElement | undefined = $state();
	$effect(() => {
		// Bring today into view whenever the zoom or the date range changes the layout (not on every save).
		void zoom;
		void range.from;
		if (scroller) scroller.scrollLeft = Math.max(0, todayX - scroller.clientWidth / 3);
	});

	function box(id: number) {
		const s = spanFor(id) as Span;
		const left = xOf(s.start);
		const w = Math.max((diffDaysKey(s.start, s.end) + 1) * px, 6);
		const top = HEADER + (rowIndex.get(id) ?? 0) * ROW;
		return { left, right: left + w, width: w, top, mid: top + ROW / 2 };
	}

	const depKey = (d: GanttDependency) => `${d.fromId}>${d.toId}`;
	const arrows = $derived(
		deps.map((d) => {
			const a = box(d.fromId);
			const b = box(d.toId);
			const g = 8;
			const x1 = a.right;
			const x2 = b.left;
			const path =
				x2 - x1 >= 2 * g
					? `M${x1},${a.mid} H${x1 + g} V${b.mid} H${x2}`
					: `M${x1},${a.mid} H${x1 + g} V${a.mid + (b.mid > a.mid ? ROW / 2 : -ROW / 2)} H${x2 - g} V${b.mid} H${x2}`;
			const broken = violated(spanFor(d.fromId) as Span, spanFor(d.toId) as Span);
			return {
				dep: d,
				key: depKey(d),
				path,
				broken,
				handle: { x: x1 + g, y: (a.mid + b.mid) / 2 },
				removable: d.rows.every((r) => editable.has(r.taskId)),
				label: t(broken ? 'views.gantt.dependencyBroken' : 'views.gantt.dependency', {
					from: taskById.get(d.fromId)?.title ?? '',
					to: taskById.get(d.toId)?.title ?? ''
				})
			};
		})
	);
	const selectedArrow = $derived(arrows.find((a) => a.key === selected) ?? null);

	// ---- saving
	const before = (id: number): DateChange => {
		const task = taskById.get(id) as Task;
		return { id, startDate: task.startDate ?? null, dueDate: task.dueDate ?? null };
	};

	async function save(changes: DateChange[]): Promise<Task[]> {
		const updated = await apiPostAuth<Task[]>('/tasks/schedule', { changes });
		onTasksChange?.(updated);
		return updated;
	}

	/** The latest "moved" toast: a new move replaces it instead of stacking another one. */
	let moveToast: number | null = null;
	function showMoveToast(...args: Parameters<typeof showToast>) {
		if (moveToast !== null) dismissToast(moveToast);
		moveToast = showToast(...args);
	}

	async function commit(moved: Map<number, Span>, id: number, blocked: number[]) {
		const changes = [...moved].map(([tid, s]) => datesFor(taskById.get(tid) as Task, s, tz));
		const previous = [...moved.keys()].map(before);
		const title = taskById.get(id)?.title ?? '';
		preview = moved;
		try {
			await save(changes);
			preview = null;
			const count = moved.size - 1;
			showMoveToast(
				count ? t('views.gantt.movedWithDependents', { title, count }) : t('views.gantt.moved', { title }),
				'success',
				undefined,
				{ label: t('views.gantt.undo'), run: () => undo(previous) }
			);
			if (blocked.length) {
				const titles = blocked.map((b) => taskById.get(b)?.title ?? `#${b}`).join(', ');
				showToast(t('views.gantt.blocked', { titles }), 'info', 6000);
			}
		} catch (e: unknown) {
			preview = null;
			showMoveToast(errMessage(e, t('views.gantt.saveFailed')), 'error');
		}
	}

	async function undo(previous: DateChange[]) {
		try {
			await save(previous);
			showMoveToast(t('views.gantt.undone'));
		} catch (e: unknown) {
			showMoveToast(errMessage(e, t('views.gantt.saveFailed')), 'error');
		}
	}

	/** Move or resize `id` (and push what waits for it), from the saved dates. */
	function plan(id: number, days: number, mode: DragMode) {
		const origin = baseSpans.get(id) as Span;
		return cascade(baseSpans, deps, new Map([[id, dragSpan(origin, days, mode)]]), editable);
	}

	// ---- dragging bars
	function onBarDown(e: PointerEvent, id: number) {
		if (e.button !== 0 || drag) return;
		const el = e.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		const offset = e.clientX - rect.left;
		const grips = rect.width >= 3 * GRIP;
		const mode: DragMode =
			grips && offset <= GRIP ? 'start' : grips && offset >= rect.width - GRIP ? 'end' : 'move';
		el.setPointerCapture(e.pointerId);
		selected = null;
		drag = { kind: 'bar', id, mode, x0: e.clientX, origin: baseSpans.get(id) as Span, days: 0, moved: false };
	}

	function onBarMove(e: PointerEvent) {
		if (drag?.kind !== 'bar') return;
		const dx = e.clientX - drag.x0;
		if (!drag.moved && Math.abs(dx) < 4) return;
		drag.moved = true;
		const days = Math.round(dx / px);
		if (days === drag.days && preview) return;
		drag.days = days;
		const r = plan(drag.id, days, drag.mode);
		preview = r.moved;
		previewBlocked = r.blocked;
	}

	function onBarUp() {
		if (drag?.kind !== 'bar') return;
		const { id, moved, days } = drag;
		drag = null;
		if (!moved) return; // a plain click: the button's onclick opens the task
		suppressClick = true;
		if (days === 0 || !preview) {
			preview = null;
			return;
		}
		void commit(preview, id, previewBlocked);
	}

	function onBarCancel() {
		drag = null;
		preview = null;
	}

	function onBarClick(id: number) {
		if (suppressClick) {
			suppressClick = false;
			return;
		}
		void goto(`/tasks/${id}`);
	}

	function onBarKey(e: KeyboardEvent, id: number) {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		e.preventDefault();
		if (preview) return; // a save is still running
		const r = plan(id, e.key === 'ArrowLeft' ? -1 : 1, e.shiftKey ? 'end' : 'move');
		void commit(r.moved, id, r.blocked);
	}

	// ---- linking (drag from the dot at a bar's end onto another bar)
	function pointIn(e: PointerEvent) {
		const rect = (chart as HTMLDivElement).getBoundingClientRect();
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}
	function rowAt(y: number): number | null {
		const i = Math.floor((y - HEADER) / ROW);
		return rows[i]?.task.id ?? null;
	}

	function onLinkDown(e: PointerEvent, fromId: number) {
		if (e.button !== 0 || drag) return;
		e.stopPropagation();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		const p = pointIn(e);
		selected = null;
		drag = { kind: 'link', fromId, ...p, overId: null };
	}

	function onLinkMove(e: PointerEvent) {
		if (drag?.kind !== 'link') return;
		const p = pointIn(e);
		const over = rowAt(p.y);
		drag = { ...drag, ...p, overId: over === drag.fromId ? null : over };
	}

	function onLinkUp(e: PointerEvent) {
		if (drag?.kind !== 'link') return;
		const { fromId } = drag;
		const toId = rowAt(pointIn(e).y);
		drag = null;
		if (toId !== null && toId !== fromId) void connect(fromId, toId);
	}

	async function connect(fromId: number, toId: number) {
		if (deps.some((d) => d.fromId === fromId && d.toId === toId)) {
			showToast(t('views.gantt.linkExists'), 'info');
			return;
		}
		if (wouldCycle(gantt.dependencies, fromId, toId)) {
			showToast(t('views.gantt.linkCycle'), 'error');
			return;
		}
		try {
			await apiPostAuth(`/tasks/${fromId}/relations`, { relatedTaskId: toId, kind: 'blocks' });
			showToast(
				t('views.gantt.linked', {
					from: taskById.get(fromId)?.title ?? '',
					to: taskById.get(toId)?.title ?? ''
				})
			);
		} catch (e: unknown) {
			showToast(errMessage(e, t('views.gantt.linkFailed')), 'error');
		}
		await loadGantt(idsKey);
	}

	async function unlink(d: GanttDependency) {
		try {
			for (const r of d.rows)
				await apiDeleteAuth(`/tasks/${r.taskId}/relations/${r.kind}/${r.relatedTaskId}`);
			selected = null;
			showToast(t('views.gantt.unlinked'));
		} catch (e: unknown) {
			showToast(errMessage(e, t('views.gantt.unlinkFailed')), 'error');
		}
		await loadGantt(idsKey);
	}

	function onWindowKey(e: KeyboardEvent) {
		if (!selectedArrow) return;
		if (e.key === 'Escape') selected = null;
		const target = e.target as HTMLElement | null;
		if (target?.closest('input, textarea, select, [contenteditable]')) return;
		if ((e.key === 'Delete' || e.key === 'Backspace') && selectedArrow.removable) {
			e.preventDefault();
			void unlink(selectedArrow.dep);
		}
	}

	function onWindowDown(e: PointerEvent) {
		if (selected && !(e.target as Element | null)?.closest('[data-dependency]')) selected = null;
	}
</script>

<svelte:window onkeydown={onWindowKey} onpointerdown={onWindowDown} />

{#if rows.length}
	<div class="flex flex-wrap items-center justify-between mb-2 gap-2">
		<p class="text-xs text-gray-500 dark:text-gray-400 m-0">
			{#if editable.size}{t('views.gantt.help')}{/if}
		</p>
		<div class="flex gap-1">
			{#each Object.keys(ZOOMS) as z (z)}
				<button
					type="button"
					class="px-3 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 {zoom === z
						? 'font-semibold text-primary-600 dark:text-primary-400'
						: 'text-gray-500 dark:text-gray-400 hover:underline'}"
					onclick={() => (zoom = z as Zoom)}
				>
					{t(`views.gantt.zoom.${z}` as 'views.gantt.zoom.day')}
				</button>
			{/each}
		</div>
	</div>
	<div
		class="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
	>
		<div class="shrink-0 border-r border-gray-200 dark:border-gray-700" style="width:{TITLE_W}px">
			<div
				class="px-3 flex items-center text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
				style="height:{HEADER}px"
			>
				{t('views.gantt.task')}
			</div>
			{#each rows as { task } (task.id)}
				{@const pid = taskProjectId(task, projectNames)}
				<div
					class="px-3 flex flex-col justify-center min-w-0 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
					style="height:{ROW}px"
				>
					<a
						href="/tasks/{task.id}"
						class="truncate text-sm leading-tight font-medium text-gray-800 dark:text-gray-200 hover:underline {large &&
						task.status === 'done'
							? 'line-through text-gray-500 dark:text-gray-400'
							: ''}"
						title={task.title}
					>
						{task.title}
					</a>
					{#if pid != null && projectNames[pid]}
						<a
							href="/projects/{pid}"
							class="truncate text-xs leading-tight text-gray-500 dark:text-gray-400 hover:underline"
						>
							{projectNames[pid]}
						</a>
					{/if}
				</div>
			{/each}
		</div>

		<div class="overflow-x-auto flex-1" bind:this={scroller}>
			<div class="relative select-none" style="width:{width}px; height:{height}px" bind:this={chart}>
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
							class="absolute top-6 h-6 text-center text-[11px] leading-6 text-gray-500 dark:text-gray-400 border-l border-gray-100 dark:border-gray-700"
							style="left:{tk.x}px; width:{px}px"
						>
							{zoom === 'day' ? tk.label : ''}{zoom === 'week' ? ' ' + tk.label : ''}
						</div>
					{/each}
				</div>

				{#each rows as r, i (r.task.id)}
					<div
						class="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-700 {drag?.kind ===
							'link' && drag.overId === r.task.id
							? 'bg-primary-50 dark:bg-primary-900/30'
							: ''}"
						style="top:{HEADER + i * ROW}px; height:{ROW}px"
					></div>
				{/each}

				<!-- Dependency arrows: under the bars, which they connect at their ends. -->
				<svg class="absolute inset-0 overflow-visible pointer-events-none" {width} {height}>
					<defs>
						{#each [{ id: 'n', cls: 'text-gray-400 dark:text-gray-500' }, { id: 'r', cls: 'tone-red' }, { id: 's', cls: 'text-primary-600 dark:text-primary-400' }] as m (m.id)}
							<marker
								id="{uid}-{m.id}"
								class={m.cls}
								viewBox="0 0 8 8"
								refX="7"
								refY="4"
								markerWidth="7"
								markerHeight="7"
								orient="auto"
							>
								<path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
							</marker>
						{/each}
					</defs>
					{#each arrows as a (a.key)}
						{@const isSel = selected === a.key}
						<path
							d={a.path}
							fill="none"
							stroke="currentColor"
							stroke-width={isSel ? 2.5 : 1.5}
							class={isSel
								? 'text-primary-600 dark:text-primary-400'
								: a.broken
									? 'tone-red'
									: 'text-gray-400 dark:text-gray-500'}
							stroke-dasharray={a.broken && !isSel ? '4 3' : undefined}
							marker-end="url(#{uid}-{isSel ? 's' : a.broken ? 'r' : 'n'})"
						/>
						<path
							d={a.path}
							fill="none"
							stroke="transparent"
							stroke-width="12"
							class="cursor-pointer focus:outline-hidden"
							style="pointer-events: stroke"
							role="button"
							tabindex="0"
							aria-label={a.label}
							data-dependency
							onclick={() => (selected = a.key)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									selected = a.key;
								}
							}}
						>
							<title>{a.label}</title>
						</path>
					{/each}
					{#if drag?.kind === 'link'}
						{@const from = box(drag.fromId)}
						<line
							x1={from.right}
							y1={from.mid}
							x2={drag.x}
							y2={drag.y}
							stroke="currentColor"
							stroke-width="1.5"
							stroke-dasharray="4 3"
							class="text-primary-600 dark:text-primary-400"
						/>
					{/if}
				</svg>

				{#each rows as r (r.task.id)}
					{@const b = box(r.task.id)}
					{@const s = spanFor(r.task.id) as Span}
					{@const overdue = isOverdue(r.task)}
					{@const canEdit = editable.has(r.task.id)}
					{@const status = overdue ? 'overdue' : (r.task.status ?? 'open')}
					{@const dragging = drag?.kind === 'bar' && drag.id === r.task.id && drag.moved}
					{#if canEdit}
						<button
							type="button"
							class="group absolute rounded overflow-hidden bg-current opacity-90 hover:opacity-100 focus:opacity-100 cursor-grab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 {dragging
								? 'cursor-grabbing opacity-100 shadow-md z-10'
								: ''} {preview?.has(r.task.id) && !dragging ? 'opacity-70' : ''}"
							style="left:{b.left}px; top:{b.top +
								BAR_TOP}px; width:{b.width}px; height:{BAR_H}px; touch-action: none"
							data-status={status}
							title="{r.task.title} · {spanLabel(s)}"
							aria-label={t('views.gantt.barEditable', { title: r.task.title ?? '', dates: spanLabel(s) })}
							onpointerdown={(e) => onBarDown(e, r.task.id)}
							onpointermove={onBarMove}
							onpointerup={onBarUp}
							onpointercancel={onBarCancel}
							onclick={() => onBarClick(r.task.id)}
							onkeydown={(e) => onBarKey(e, r.task.id)}
						>
							{#if r.task.percentDone}
								<span
									class="absolute inset-y-0 left-0 bg-black/30 pointer-events-none"
									style="width:{Math.min(100, r.task.percentDone)}%"
								></span>
							{/if}
							{#if b.width >= 3 * GRIP}
								<span
									class="absolute inset-y-0 left-0 cursor-ew-resize bg-black/0 group-hover:bg-black/20"
									style="width:{GRIP}px"
								></span>
								<span
									class="absolute inset-y-0 right-0 cursor-ew-resize bg-black/0 group-hover:bg-black/20"
									style="width:{GRIP}px"
								></span>
							{/if}
						</button>
						<button
							type="button"
							class="absolute rounded-full border-2 border-white dark:border-gray-800 bg-primary-600 dark:bg-primary-400 cursor-crosshair opacity-60 hover:opacity-100 focus:opacity-100 pointer-coarse:opacity-100"
							style="left:{b.right + 3}px; top:{b.mid - 6}px; width:12px; height:12px; touch-action: none"
							title={t('views.gantt.linkHandle', { title: r.task.title ?? '' })}
							aria-label={t('views.gantt.linkHandle', { title: r.task.title ?? '' })}
							tabindex="-1"
							onpointerdown={(e) => onLinkDown(e, r.task.id)}
							onpointermove={onLinkMove}
							onpointerup={onLinkUp}
							onpointercancel={() => (drag = null)}
						></button>
						{#if dragging}
							<div
								class="absolute z-20 px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap bg-gray-900 text-white dark:bg-white dark:text-gray-900 pointer-events-none"
								style="left:{b.left}px; top:{b.top - 12}px"
							>
								{spanLabel(s)}
							</div>
						{/if}
					{:else}
						<a
							href="/tasks/{r.task.id}"
							class="absolute rounded overflow-hidden bg-current opacity-90 hover:opacity-100"
							style="left:{b.left}px; top:{b.top + BAR_TOP}px; width:{b.width}px; height:{BAR_H}px"
							data-status={status}
							title="{r.task.title} · {spanLabel(s)}"
							aria-label={t('views.gantt.bar', { title: r.task.title ?? '', dates: spanLabel(s) })}
						>
							{#if r.task.percentDone}
								<span
									class="absolute inset-y-0 left-0 bg-black/30"
									style="width:{Math.min(100, r.task.percentDone)}%"
								></span>
							{/if}
						</a>
					{/if}
				{/each}

				{#if selectedArrow?.removable}
					<button
						type="button"
						data-dependency
						class="absolute z-20 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-md text-xs font-medium text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 cursor-pointer whitespace-nowrap"
						style="left:{selectedArrow.handle.x}px; top:{selectedArrow.handle.y}px"
						onclick={() => selectedArrow && unlink(selectedArrow.dep)}
					>
						<CloseOutline class="w-3.5 h-3.5" />
						{t('views.gantt.removeDependency')}
					</button>
				{/if}

				<div
					class="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none"
					style="left:{todayX}px"
					title={t('views.gantt.today')}
				></div>
			</div>
		</div>
	</div>
{:else}
	<div class="text-center {large ? 'py-12' : 'py-10'} text-gray-500 dark:text-gray-400">
		<CalendarMonthOutline class="{large ? 'w-12 h-12 mb-3' : 'w-10 h-10 mb-2'} mx-auto" />
		<p>{t('views.gantt.empty')}</p>
	</div>
{/if}
