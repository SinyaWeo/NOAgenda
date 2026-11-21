<script lang="ts">
	import type { Task } from '$lib/types';
	import { Card } from 'flowbite-svelte';
	import { CalendarMonthOutline } from 'flowbite-svelte-icons';
	import { isOverdue } from './util';
	import { t, fmt, type MessageKey } from '$lib/i18n';

	interface Props {
		tasks: Task[];
		/** The global task page: friendly status labels, struck-through done tasks, larger empty state. */
		large?: boolean;
	}
	let { tasks, large = false }: Props = $props();

	const dated = $derived(
		tasks
			.filter((t) => t.dueDate)
			.sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime())
	);
</script>

{#if dated.length}
	<Card class="p-0 overflow-hidden">
		{#each dated as task, i (task.id)}
			{@const overdue = isOverdue(task)}
			<div
				class="flex items-center gap-3 px-4 py-3 {i < dated.length - 1
					? 'border-b border-gray-100 dark:border-gray-700'
					: ''}"
			>
				<span class="w-2 h-2 rounded-full shrink-0 bg-current" data-status={overdue ? 'overdue' : task.status}
				></span>
				<a
					href="/tasks/{task.id}"
					class="flex-1 font-medium text-gray-800 dark:text-gray-200 hover:underline {large &&
					task.status === 'done'
						? 'line-through text-gray-400'
						: ''}">{task.title}</a
				>
				<span class="text-sm shrink-0 {overdue ? 'text-red-500' : 'text-gray-400'}"
					>{$fmt.date(task.dueDate as string)}</span
				>
				<span class="inline-flex items-center text-xs font-semibold shrink-0" data-status={task.status}
					>{$t(`common.status.${task.status ?? 'open'}` as MessageKey)}</span
				>
			</div>
		{/each}
	</Card>
{:else}
	<div class="text-center {large ? 'py-12' : 'py-10'} text-gray-400">
		<CalendarMonthOutline class="{large ? 'w-12 h-12 mb-3' : 'w-10 h-10 mb-2'} mx-auto" />
		<p>{$t('views.gantt.empty')}</p>
	</div>
{/if}
