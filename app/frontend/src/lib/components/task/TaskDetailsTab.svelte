<script lang="ts">
	import { PRIORITY_LABELS } from '$lib/constants';
	import type { Task, TaskAssignee, TaskLabel } from '$lib/types';
	import { Button, Card, Progressbar, Select } from 'flowbite-svelte';

	let {
		task,
		taskLabels,
		assignees,
		onStatus,
		onPercentDone,
		onDefer,
	}: {
		task: Task;
		taskLabels: TaskLabel[];
		assignees: TaskAssignee[];
		onStatus: (status: string) => void;
		onPercentDone: (value: number) => void;
		onDefer: (days: number) => void;
	} = $props();
</script>

<Card class="mb-4">
	{#if task.description}<p
			class="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 mb-4"
		>
			{task.description}
		</p>{/if}

	<div class="grid grid-cols-2 gap-4 mb-4 sm:grid-cols-4">
		<div>
			<p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
				Status
			</p>
			<Select
				value={task.status ?? 'open'}
				onchange={(e) => onStatus((e.target as HTMLSelectElement).value)}
				class="w-full"
			>
				<option value="open">Open</option><option value="in_progress"
					>In Progress</option
				><option value="done">Done</option>
			</Select>
		</div>
		<div>
			<p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
				Priority
			</p>
			<p class="text-sm text-gray-900 dark:text-white" data-priority={task.priority}>
				{PRIORITY_LABELS[task.priority ?? -1] ?? '—'}
			</p>
		</div>
		{#if task.startDate}
			<div>
				<p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
					Start Date
				</p>
				<p class="text-sm text-gray-900 dark:text-white">
					{new Date(task.startDate).toLocaleDateString()}
				</p>
			</div>
		{/if}
		{#if task.dueDate}
			<div>
				<p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
					Due Date
				</p>
				<p
					class="text-sm {new Date(task.dueDate) < new Date() && task.status !== 'done'
						? 'text-red-600 font-bold'
						: 'text-gray-900 dark:text-white'}"
				>
					{new Date(task.dueDate).toLocaleDateString()}
				</p>
			</div>
		{/if}
	</div>

	<div class="mb-4">
		<div class="flex items-center justify-between mb-2">
			<p class="text-xs font-medium text-gray-500 uppercase tracking-wide m-0">
				Progress
			</p>
			<Select
				value={task.percentDone ?? 0}
				onchange={(e) =>
					onPercentDone(Number((e.target as HTMLSelectElement).value))}
				class="w-auto"
			>
				{#each [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as p (p)}<option
						value={p}>{p}%</option
					>{/each}
			</Select>
		</div>
		<Progressbar progress={task.percentDone ?? 0} />
	</div>

	{#if task.dueDate}
		<div class="flex items-center gap-2 flex-wrap">
			<span class="text-xs text-gray-400">Defer due date:</span>
			<Button size="xs" color="light" onclick={() => onDefer(1)}>+1 day</Button>
			<Button size="xs" color="light" onclick={() => onDefer(3)}>+3 days</Button>
			<Button size="xs" color="light" onclick={() => onDefer(7)}>+1 week</Button>
		</div>
	{/if}

	{#if taskLabels.length || assignees.length}
		<div
			class="flex gap-6 flex-wrap mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"
		>
			{#if taskLabels.length}
				<div>
					<p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
						Labels
					</p>
					<div class="flex items-center gap-1.5 flex-wrap">
						{#each taskLabels as tl (tl.id)}
							<span
								class="color-dot"
								style="--dot-color:{tl.label?.color ?? '#6366f1'}"
							></span>
							<span
								class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
								>{tl.label?.title ?? `Label #${tl.id}`}</span
							>
						{/each}
					</div>
				</div>
			{/if}
			{#if assignees.length}
				<div>
					<p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
						Assignees
					</p>
					<p class="text-sm text-gray-700 dark:text-gray-300 m-0">
						{assignees.map((a) => a.user?.username ?? `User #${a.id}`).join(', ')}
					</p>
				</div>
			{/if}
		</div>
	{/if}
</Card>
