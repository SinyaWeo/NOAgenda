<script lang="ts">
	import { t, type MessageKey } from '$lib/i18n';
	import type { Label, Task, TaskAssignee, TaskLabel, UserSummary } from '$lib/types';
	import { describeRepeat, formFromTask, repeatPayload, type RepeatForm } from '$lib/repeat';
	import { dateInputToIso, isoToDateInput } from '$lib/dates';
	import RepeatHistory from './RepeatHistory.svelte';
	import RepeatFields from './RepeatFields.svelte';
	import InlineText from '$lib/components/InlineText.svelte';
	import { Button, Card, Input, Select } from 'flowbite-svelte';
	import { EditOutline } from 'flowbite-svelte-icons';

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
		onDefer,
		onUpdate
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
		/** Save some task fields; resolves to false when the save failed. */
		onUpdate: (patch: Record<string, unknown>) => Promise<boolean>;
	} = $props();

	const LABEL = 'block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1';

	let editingRepeat = $state(false);
	let repeatForm = $state<RepeatForm>(formFromTask({}));
	let savingRepeat = $state(false);

	function startRepeat() {
		repeatForm = formFromTask(task);
		editingRepeat = true;
	}

	async function saveRepeat(e: Event) {
		e.preventDefault();
		savingRepeat = true;
		try {
			if (await onUpdate(repeatPayload(repeatForm))) editingRepeat = false;
		} finally {
			savingRepeat = false;
		}
	}

	/** A date input changed: save it as the day's noon (or clear it). */
	const saveDate = (field: 'startDate' | 'dueDate', value: string) =>
		onUpdate({ [field]: dateInputToIso(value) });

	const overdue = $derived(!!task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done');

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

<Card class="mb-4 max-w-none">
	<div class="mb-4">
		<p class={LABEL}>{$t('common.field.description')}</p>
		<div class="text-sm text-gray-700 dark:text-gray-300">
			<InlineText
				value={task.description ?? ''}
				multiline
				label={$t('tasks.details.editDescription')}
				emptyText={$t('tasks.details.noDescription')}
				onSave={(v) => onUpdate({ description: v })}
			/>
		</div>
	</div>

	<div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4 mb-4">
		<div>
			<label for="task-status" class={LABEL}>{$t('common.field.status')}</label>
			<Select
				id="task-status"
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
			<label for="task-priority" class={LABEL}>{$t('common.field.priority')}</label>
			<Select
				id="task-priority"
				placeholder=""
				value={String(task.priority ?? 0)}
				onchange={(e) => onUpdate({ priority: Number((e.target as HTMLSelectElement).value) })}
				class="w-full"
			>
				<option value="0">{$t('tasks.form.priorityUnset')}</option>
				{#each [1, 2, 3, 4, 5] as p (p)}<option value={String(p)}>
						{$t(`common.priority.${p}` as MessageKey)}
					</option>{/each}
			</Select>
		</div>
		<div>
			<label for="task-start" class={LABEL}>{$t('tasks.details.startDate')}</label>
			<Input
				id="task-start"
				type="date"
				value={isoToDateInput(task.startDate)}
				onchange={(e) => saveDate('startDate', (e.target as HTMLInputElement).value)}
			/>
		</div>
		<div>
			<label for="task-due" class={LABEL}>{$t('tasks.details.dueDate')}</label>
			<Input
				id="task-due"
				type="date"
				class={overdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}
				value={isoToDateInput(task.dueDate)}
				onchange={(e) => saveDate('dueDate', (e.target as HTMLInputElement).value)}
			/>
			{#if overdue}<p class="text-xs text-red-600 dark:text-red-400 mt-1 mb-0">
					{$t('tasks.details.overdue')}
				</p>{/if}
		</div>
	</div>

	<div class="mb-4">
		<p class={LABEL}>{$t('tasks.repeat.summaryLabel')}</p>
		{#if editingRepeat}
			<form onsubmit={saveRepeat} class="flex flex-col gap-3">
				<RepeatFields bind:form={repeatForm} />
				<div class="flex gap-2">
					<Button type="submit" size="xs" disabled={savingRepeat}>
						{savingRepeat ? $t('common.saving') : $t('common.save')}
					</Button>
					<Button type="button" size="xs" color="light" onclick={() => (editingRepeat = false)}>
						{$t('common.cancel')}
					</Button>
				</div>
			</form>
		{:else}
			<div class="flex items-start gap-2">
				<p
					class="text-sm m-0 {repeatSummary
						? 'text-gray-900 dark:text-white'
						: 'text-gray-500 dark:text-gray-400 italic'}"
				>
					{repeatSummary || $t('tasks.repeat.kind.none')}
				</p>
				<button
					type="button"
					class="shrink-0 p-1 rounded text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
					aria-label={$t('tasks.details.editRepeat')}
					title={$t('tasks.details.editRepeat')}
					onclick={startRepeat}
				>
					<EditOutline class="w-4 h-4" />
				</button>
			</div>
		{/if}
	</div>

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
