<script lang="ts">
	import type { Task } from '$lib/types';
	import type { StatusChangeHandler } from '$lib/types-views';
	import { Card, Progressbar } from 'flowbite-svelte';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { isOverdue } from './util';
	import { t, fmt, type MessageKey } from '$lib/i18n';

	interface Props {
		tasks: Task[];
		projectNames: Record<number, string>;
		onStatusChange: StatusChangeHandler;
		/** Bulk selection: pass both to show a checkbox on every task. */
		selected?: number[];
		onToggle?: (taskId: number) => void;
	}
	let { tasks, projectNames, onStatusChange, selected = [], onToggle }: Props = $props();
</script>

<div class="flex flex-col gap-2 mb-4">
	{#each tasks as task (task.id)}
		{@const due = task.dueDate ? new Date(task.dueDate) : null}
		{@const overdue = isOverdue(task)}
		<Card
			class="flex flex-col gap-2 p-3.5 {overdue ? 'border-red-300 dark:bg-gray-800 dark:border-red-700' : ''}"
		>
			<div class="flex items-center gap-3">
				{#if onToggle}
					<input
						type="checkbox"
						class="w-4 h-4 shrink-0 cursor-pointer"
						checked={selected.includes(task.id)}
						onchange={() => onToggle(task.id)}
						aria-label={$t('views.bulk.select', { title: task.title ?? '' })}
					/>
				{/if}
				<div class="flex-1 min-w-0">
					<a
						href="/tasks/{task.id}"
						class="font-medium text-gray-900 dark:text-white hover:underline {task.status === 'done'
							? 'line-through text-gray-400'
							: ''}">{task.title}</a
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
							class="text-xs flex items-center justify-end gap-0.5 {overdue
								? 'text-red-500'
								: due !== null
									? 'text-gray-600 dark:text-gray-300'
									: 'text-gray-400'}"
						>
							{#if overdue}<ExclamationCircleOutline class="w-3.5 h-3.5 shrink-0" />{/if}
							{due !== null ? $fmt.date(due) : $t('views.notSet')}
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
						<select
							class="text-xs rounded-full ps-2 pe-8 py-0.5 font-semibold border-0 cursor-pointer bg-transparent"
							data-status={task.status}
							value={task.status}
							onchange={(e) =>
								onStatusChange(
									task.id,
									(e.target as HTMLSelectElement).value as 'open' | 'in_progress' | 'done'
								)}
							aria-label={$t('views.changeStatus')}
						>
							<option value="open">{$t('common.status.open')}</option>
							<option value="in_progress">{$t('common.status.in_progress')}</option>
							<option value="done">{$t('common.status.done')}</option>
						</select>
					</div>
				</div>
			</div>
			{#if task.percentDone && task.percentDone > 0}
				<Progressbar progress={task.percentDone} size="h-4" color="indigo" labelInside />
			{/if}
		</Card>
	{/each}
</div>
