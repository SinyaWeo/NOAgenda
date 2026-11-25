<script lang="ts">
	import type { Task } from '$lib/types';
	import type { StatusChangeHandler } from '$lib/types-views';
	import { Card, Progressbar } from 'flowbite-svelte';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { isOverdue } from './util';
	import { t, fmt, type MessageKey } from '$lib/i18n';
	import { groupByProject } from '$lib/project-groups';

	interface Props {
		tasks: Task[];
		projectNames: Record<number, string>;
		onStatusChange: StatusChangeHandler;
		/** Bulk selection: pass both to show a checkbox on every task. */
		selected?: number[];
		onToggle?: (taskId: number) => void;
	}
	let { tasks, projectNames, onStatusChange, selected = [], onToggle }: Props = $props();

	const groups = $derived(groupByProject(tasks, projectNames));
</script>

{#each groups as group (group.projectId)}
	<section class="mb-6">
		<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-baseline gap-2">
			{#if group.projectId != null}
				<a href="/projects/{group.projectId}" class="hover:underline">{group.name}</a>
			{:else}
				{$t('views.tasks.noProject')}
			{/if}
			<span class="text-xs font-normal text-gray-500 dark:text-gray-400">{group.tasks.length}</span>
		</h3>
		<div class="flex flex-col gap-2">
			{#each group.tasks as task (task.id)}
				{@const due = task.dueDate ? new Date(task.dueDate) : null}
				{@const overdue = isOverdue(task)}
				<Card
					class="max-w-none flex flex-col gap-2 p-3.5 {overdue
						? 'border-red-300 dark:bg-gray-800 dark:border-red-700'
						: ''}"
				>
					<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
						{#if onToggle}
							<input
								type="checkbox"
								class="w-4 h-4 shrink-0 cursor-pointer"
								checked={selected.includes(task.id)}
								onchange={() => onToggle(task.id)}
								aria-label={$t('views.bulk.select', { title: task.title ?? '' })}
							/>
						{/if}
						<div class="flex-1 min-w-48">
							<a
								href="/tasks/{task.id}"
								class="font-medium text-gray-900 dark:text-white hover:underline {task.status === 'done'
									? 'line-through text-gray-500 dark:text-gray-400'
									: ''}"
							>
								{task.title}
							</a>
						</div>
						<div class="shrink-0 flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
							<span
								class="text-xs flex items-center gap-0.5 w-28 {overdue
									? 'text-red-500'
									: due !== null
										? 'text-gray-600 dark:text-gray-300'
										: 'text-gray-500 dark:text-gray-400'}"
								title={$t('common.field.dueDate')}
							>
								{#if overdue}<ExclamationCircleOutline class="w-3.5 h-3.5 shrink-0" />{/if}
								{due !== null ? $fmt.date(due) : $t('views.notSet')}
							</span>
							<span class="text-xs w-16" data-priority={task.priority} title={$t('common.field.priority')}>
								{task.priority && task.priority > 0
									? $t(`common.priority.${task.priority}` as MessageKey)
									: '—'}
							</span>
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
								title={$t('common.field.status')}
							>
								<option value="open">{$t('common.status.open')}</option>
								<option value="in_progress">{$t('common.status.in_progress')}</option>
								<option value="done">{$t('common.status.done')}</option>
							</select>
						</div>
					</div>
					{#if task.percentDone && task.percentDone > 0}
						<Progressbar progress={task.percentDone} size="h-4" color="indigo" labelInside />
					{/if}
				</Card>
			{/each}
		</div>
	</section>
{/each}
