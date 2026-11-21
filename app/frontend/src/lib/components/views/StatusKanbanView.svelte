<script lang="ts">
	import type { Task } from '$lib/types';
	import type { KanbanColumn, StatusChangeHandler } from '$lib/types-views';
	import { t, fmt, type MessageKey } from '$lib/i18n';

	interface Props {
		tasks: Task[];
		columns: KanbanColumn[];
		/** Called when a card is dropped on another column; omit for a read-only board. */
		onStatusChange?: StatusChangeHandler;
	}
	let { tasks, columns, onStatusChange }: Props = $props();

	let draggingId = $state<number | null>(null);
	let overCol = $state<string | null>(null);

	function onDragStart(e: DragEvent, task: Task) {
		if (!onStatusChange || !e.dataTransfer) return;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', String(task.id));
		draggingId = task.id;
	}

	function onDragEnd() {
		draggingId = null;
		overCol = null;
	}

	function onDragOver(e: DragEvent, key: string) {
		if (draggingId == null) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		overCol = key;
	}

	function onDrop(e: DragEvent, key: KanbanColumn['key']) {
		e.preventDefault();
		const task = tasks.find((x) => x.id === draggingId);
		onDragEnd();
		if (task && task.status !== key) onStatusChange?.(task.id, key);
	}
</script>

<div class="board-cols">
	{#each columns as col (col.key)}
		{@const colTasks = tasks.filter((t) => t.status === col.key)}
		<div
			class="board-col"
			class:board-col-over={overCol === col.key}
			role="group"
			aria-label={col.label}
			ondragover={(e) => onDragOver(e, col.key)}
			ondragleave={(e) => {
				if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) overCol = null;
			}}
			ondrop={(e) => onDrop(e, col.key)}
		>
			<div class="board-col-header">
				<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 m-0">
					{col.label}
				</h3>
				<span class="text-xs text-gray-400">{colTasks.length}</span>
			</div>
			<div class="board-col-body">
				{#each colTasks as task (task.id)}
					<div
						class="board-card mb-2"
						class:board-card-dragging={draggingId === task.id}
						role="listitem"
						draggable={onStatusChange ? 'true' : undefined}
						ondragstart={(e) => onDragStart(e, task)}
						ondragend={onDragEnd}
					>
						<a
							href="/tasks/{task.id}"
							class="font-medium text-sm text-gray-800 dark:text-gray-200 hover:underline">{task.title}</a
						>
						{#if task.dueDate}
							{@const overdue = new Date(task.dueDate) < new Date() && task.status !== 'done'}
							<div class="text-xs {overdue ? 'text-red-500' : 'text-gray-400'} mt-1">
								{$fmt.date(task.dueDate)}
							</div>
						{/if}
						{#if task.priority && task.priority > 0}<div class="text-xs text-gray-400 mt-0.5">
								{$t(`common.priorityShort.${task.priority}` as MessageKey)}
							</div>{/if}
					</div>
				{/each}
				{#if !colTasks.length}
					<p class="text-xs text-gray-400 text-center m-0">{$t('views.column.empty')}</p>
				{/if}
			</div>
		</div>
	{/each}
</div>
