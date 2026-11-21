<script lang="ts">
	import { t, fmt, type MessageKey } from '$lib/i18n';
	import type { Task } from '$lib/types';
	import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
	import { CheckCircleOutline } from 'flowbite-svelte-icons';
	import { isOverdue } from './util';

	interface Props {
		tasks: Task[];
		/** Larger empty-state icon + the global page's wording. */
		large?: boolean;
		/** When given, a Project column is shown. */
		projectNames?: Record<number, string>;
	}
	let { tasks, large = false, projectNames }: Props = $props();
</script>

{#if tasks.length}
	<Table>
		<TableHead>
			<TableHeadCell>#</TableHeadCell>
			<TableHeadCell>{$t('common.field.title')}</TableHeadCell>
			{#if projectNames}<TableHeadCell>{$t('common.field.project')}</TableHeadCell>{/if}
			<TableHeadCell>{$t('common.field.status')}</TableHeadCell>
			<TableHeadCell>{$t('common.field.priority')}</TableHeadCell>
			<TableHeadCell>{$t('common.field.dueDate')}</TableHeadCell>
			<TableHeadCell>{$t('common.field.created')}</TableHeadCell>
		</TableHead>
		<TableBody>
			{#each tasks as task (task.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-400">{task.id}</TableBodyCell>
					<TableBodyCell
						><a href="/tasks/{task.id}" class="font-medium text-gray-800 dark:text-gray-200 hover:underline"
							>{task.title}</a
						></TableBodyCell
					>
					{#if projectNames}<TableBodyCell class="text-gray-400"
							>{(task.parentId != null && projectNames[task.parentId]) || '—'}</TableBodyCell
						>{/if}
					<TableBodyCell
						><span class="inline-flex items-center text-xs font-semibold" data-status={task.status}
							>{task.status ? $t(`common.status.${task.status}` as MessageKey) : '—'}</span
						></TableBodyCell
					>
					<TableBodyCell
						><span class="text-xs" data-priority={task.priority}
							>{task.priority ? $t(`common.priorityShort.${task.priority}` as MessageKey) : '—'}</span
						></TableBodyCell
					>
					<TableBodyCell class={isOverdue(task) ? 'text-red-500' : 'text-gray-400'}
						>{task.dueDate ? $fmt.date(task.dueDate) : '—'}</TableBodyCell
					>
					<TableBodyCell class="text-gray-400"
						>{task.createdAt ? $fmt.date(task.createdAt) : '—'}</TableBodyCell
					>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{:else}
	<div class="text-center {large ? 'py-12' : 'py-10'} text-gray-400">
		{#if large}<CheckCircleOutline class="w-12 h-12 mx-auto mb-3" />{/if}
		<p>{large ? $t('views.tasks.empty') : $t('views.table.empty')}</p>
	</div>
{/if}
