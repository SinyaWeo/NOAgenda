<script lang="ts">
	import { t, fmt, type MessageKey } from '$lib/i18n';
	import type { Label, Task, TaskAssignee, TaskLabel, UserSummary } from '$lib/types';
	import { describeRepeat } from '$lib/repeat';
	import RepeatHistory from './RepeatHistory.svelte';
	import { Button, Card, Select } from 'flowbite-svelte';

	let {
		task,
		taskLabels,
		allLabels,
		assignees,
		assignable,
		onAssign,
		onAddLabel,
		onRemoveLabel,
		onStatus,
		onPercentDone,
		onDefer
	}: {
		task: Task;
		taskLabels: TaskLabel[];
		/** The user's own labels (only these can be attached). */
		allLabels: Label[];
		assignees: TaskAssignee[];
		/** Who the creator may assign to; empty when the viewer cannot reassign. */
		assignable: UserSummary[];
		onAssign: (userId: number) => void;
		onAddLabel: (labelId: number) => void;
		onRemoveLabel: (labelId: number) => void;
		onStatus: (status: string) => void;
		onPercentDone: (value: number) => void;
		onDefer: (days: number) => void;
	} = $props();

	/** Live value while dragging the slider; null once the change is committed. */
	let dragValue = $state<number | null>(null);
	const progress = $derived(dragValue ?? task.percentDone ?? 0);

	const repeatSummary = $derived.by(() => {
		void $t; // re-runs when the language changes
		return describeRepeat(task);
	});

	/** Labels not on the task yet. */
	const available = $derived(allLabels.filter((l) => !taskLabels.some((tl) => tl.label?.id === l.id)));
</script>

<Card class="mb-4">
	{#if task.description}<p class="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 mb-4">
			{task.description}
		</p>{/if}

	<div class="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-4 mb-4">
		<div>
			<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
				{$t('common.field.status')}
			</p>
			<Select
				placeholder=""
				value={task.status ?? 'open'}
				onchange={(e) => onStatus((e.target as HTMLSelectElement).value)}
				class="w-full"
			>
				<option value="open">{$t('common.status.open')}</option><option value="in_progress">
					{$t('common.status.in_progress')}
				</option><option value="done">{$t('common.status.done')}</option>
			</Select>
		</div>
		<div>
			<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
				{$t('common.field.priority')}
			</p>
			<p class="text-sm" data-priority={task.priority}>
				{$t(`common.priority.${task.priority ?? 0}` as MessageKey)}
			</p>
		</div>
		{#if task.startDate}
			<div>
				<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
					{$t('tasks.details.startDate')}
				</p>
				<p class="text-sm text-gray-900 dark:text-white">
					{$fmt.date(task.startDate)}
				</p>
			</div>
		{/if}
		{#if task.dueDate}
			<div>
				<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
					{$t('tasks.details.dueDate')}
				</p>
				<p
					class="text-sm {new Date(task.dueDate) < new Date() && task.status !== 'done'
						? 'text-red-600 font-bold'
						: 'text-gray-900 dark:text-white'}"
				>
					{$fmt.date(task.dueDate)}
				</p>
			</div>
		{/if}
	</div>

	{#if repeatSummary}
		<div class="mb-4">
			<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
				{$t('tasks.repeat.summaryLabel')}
			</p>
			<p class="text-sm text-gray-900 dark:text-white m-0">{repeatSummary}</p>
		</div>
	{/if}

	<div class="mb-4">
		<div class="flex items-center justify-between mb-2">
			<label
				for="task-progress"
				class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide m-0"
			>
				{$t('common.field.progress')}
			</label>
			<span class="text-sm font-medium">{progress}%</span>
		</div>
		<input
			id="task-progress"
			type="range"
			min="0"
			max="100"
			step="10"
			class="progress-slider w-full cursor-pointer"
			style:--pct="{progress}%"
			value={progress}
			oninput={(e) => (dragValue = Number((e.target as HTMLInputElement).value))}
			onchange={(e) => {
				onPercentDone(Number((e.target as HTMLInputElement).value));
				dragValue = null;
			}}
		/>
	</div>

	{#if task.dueDate}
		<div class="flex items-center gap-2 flex-wrap">
			<span class="text-xs text-gray-500 dark:text-gray-400">{$t('tasks.details.deferLabel')}</span>
			<Button size="xs" color="light" onclick={() => onDefer(1)}>{$t('tasks.details.defer1')}</Button>
			<Button size="xs" color="light" onclick={() => onDefer(3)}>{$t('tasks.details.defer3')}</Button>
			<Button size="xs" color="light" onclick={() => onDefer(7)}>{$t('tasks.details.defer7')}</Button>
		</div>
	{/if}

	{#if task.repeatAfter}
		<div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
			<RepeatHistory taskId={task.id} version={task.updatedAt} />
		</div>
	{/if}

	<div class="flex gap-6 flex-wrap mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
		<div>
			<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
				{$t('tasks.details.labels')}
			</p>
			<div class="flex items-center gap-1.5 flex-wrap">
				{#each taskLabels as tl (tl.id)}
					<span
						class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
					>
						<span class="color-dot" style="--dot-color:{tl.label?.color ?? '#6366f1'}"></span>
						{tl.label?.title ?? $t('tasks.details.labelFallback', { id: tl.id })}
						{#if tl.label}
							<button
								type="button"
								class="bg-transparent border-0 cursor-pointer text-gray-500 dark:text-gray-400 hover:text-red-600 p-0 leading-none"
								aria-label={$t('tasks.details.removeLabel', { title: tl.label.title })}
								onclick={() => onRemoveLabel(tl.label!.id)}
							>
								✕
							</button>
						{/if}
					</span>
				{/each}
				{#if available.length}
					<Select
						placeholder=""
						size="sm"
						class="w-auto"
						value=""
						aria-label={$t('tasks.details.addLabel')}
						onchange={(e) => {
							const el = e.target as HTMLSelectElement;
							if (el.value) onAddLabel(Number(el.value));
							el.value = '';
						}}
					>
						<option value="">{$t('tasks.details.addLabel')}</option>
						{#each available as l (l.id)}<option value={l.id}>{l.title}</option>{/each}
					</Select>
				{:else if !allLabels.length}
					<span class="text-xs text-gray-500 dark:text-gray-400">
						{$t('tasks.details.noLabelsYet')}
						<a href="/labels" class="text-primary-600 hover:underline">{$t('tasks.details.createLabels')}</a>
					</span>
				{/if}
			</div>
		</div>
		{#if assignable.length > 1}
			<div>
				<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
					{$t('tasks.details.assignee')}
				</p>
				<Select
					placeholder=""
					value={assignees[0]?.user?.id ?? ''}
					onchange={(e) => onAssign(Number((e.target as HTMLSelectElement).value))}
					class="w-full max-w-xs"
				>
					{#if !assignees.length}<option value="">{$t('tasks.form.assignee')}</option>{/if}
					{#each assignable as u (u.id)}<option value={u.id}>{u.name || u.username}</option>{/each}
				</Select>
			</div>
		{:else if assignees.length}
			<div>
				<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
					{$t('tasks.details.assignee')}
				</p>
				<p class="text-sm text-gray-700 dark:text-gray-300 m-0">
					{assignees
						.map((a) => a.user?.username ?? $t('tasks.details.userFallback', { id: a.id }))
						.join(', ')}
				</p>
			</div>
		{/if}
	</div>
</Card>
