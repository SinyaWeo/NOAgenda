<script lang="ts">
	import { t, fmt, type MessageKey } from '$lib/i18n';
	import type { Label, Task, TaskAssignee, TaskLabel, UserSummary } from '$lib/types';
	import { describeRepeat, formFromTask, repeatPayload, type RepeatForm } from '$lib/repeat';
	import { dateInputToIso, isoToDateInput } from '$lib/dates';
	import RepeatHistory from './RepeatHistory.svelte';
	import RepeatFields from './RepeatFields.svelte';
	import InlineText from '$lib/components/InlineText.svelte';
	import { Button, Card, Input, Modal, Select } from 'flowbite-svelte';

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

	/** The field whose editor is open (only one at a time); null: all show their value. */
	let editing = $state<'status' | 'priority' | 'startDate' | 'dueDate' | null>(null);
	let repeatOpen = $state(false);
	let repeatForm = $state<RepeatForm>(formFromTask({}));
	let savingRepeat = $state(false);

	function openRepeat() {
		editing = null;
		repeatForm = formFromTask(task);
		repeatOpen = true;
	}

	async function saveRepeat() {
		savingRepeat = true;
		try {
			if (await onUpdate(repeatPayload(repeatForm))) repeatOpen = false;
		} finally {
			savingRepeat = false;
		}
	}

	/** A date was picked (or cleared): save it as that day's noon and close the editor. */
	async function saveDate(field: 'startDate' | 'dueDate', value: string) {
		if (await onUpdate({ [field]: dateInputToIso(value) })) editing = null;
	}

	function defer(days: number) {
		onDefer(days);
		editing = null;
	}

	/** Open the browser's date picker right away where supported (the input stays usable otherwise). */
	function showPicker(node: HTMLInputElement) {
		node.focus();
		try {
			node.showPicker?.();
		} catch {
			/* not allowed outside a user gesture in some browsers: the focused input is enough */
		}
	}

	const VALUE =
		'text-sm text-left cursor-pointer bg-transparent border-0 p-0 hover:underline focus:outline-none focus-visible:underline';

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

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') editing = null;
	}}
/>

<Card class="mb-4 max-w-none">
	<div class="flex flex-col-reverse md:flex-row gap-6">
		<div class="flex-1 min-w-0">
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
								<a href="/labels" class="text-primary-600 hover:underline">
									{$t('tasks.details.createLabels')}
								</a>
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
		</div>

		<dl
			class="md:w-60 shrink-0 m-0 flex flex-col gap-4 md:border-l md:pl-6 border-gray-100 dark:border-gray-700"
		>
			<div>
				<dt class={LABEL}>{$t('common.field.status')}</dt>
				<dd class="m-0">
					{#if editing === 'status'}
						<Select
							placeholder=""
							size="sm"
							autofocus
							value={task.status ?? 'open'}
							aria-label={$t('common.field.status')}
							onchange={(e) => {
								onStatus((e.target as HTMLSelectElement).value);
								editing = null;
							}}
							onblur={() => (editing = null)}
						>
							{#each ['open', 'in_progress', 'done'] as st (st)}
								<option value={st}>{$t(`common.status.${st}` as MessageKey)}</option>
							{/each}
						</Select>
					{:else}
						<button
							type="button"
							class="{VALUE} font-semibold"
							data-status={task.status ?? 'open'}
							title={$t('tasks.details.change')}
							onclick={() => (editing = 'status')}
						>
							{$t(`common.status.${task.status ?? 'open'}` as MessageKey)}
						</button>
					{/if}
				</dd>
			</div>
			<div>
				<dt class={LABEL}>{$t('common.field.priority')}</dt>
				<dd class="m-0">
					{#if editing === 'priority'}
						<Select
							placeholder=""
							size="sm"
							autofocus
							value={String(task.priority ?? 0)}
							aria-label={$t('common.field.priority')}
							onchange={async (e) => {
								if (await onUpdate({ priority: Number((e.target as HTMLSelectElement).value) }))
									editing = null;
							}}
							onblur={() => (editing = null)}
						>
							<option value="0">{$t('tasks.form.priorityUnset')}</option>
							{#each [1, 2, 3, 4, 5] as p (p)}<option value={String(p)}>
									{$t(`common.priority.${p}` as MessageKey)}
								</option>{/each}
						</Select>
					{:else}
						<button
							type="button"
							class="{VALUE} {task.priority ? 'font-semibold' : 'text-gray-500 dark:text-gray-400 italic'}"
							data-priority={task.priority || undefined}
							title={$t('tasks.details.change')}
							onclick={() => (editing = 'priority')}
						>
							{task.priority ? $t(`common.priority.${task.priority}` as MessageKey) : $t('views.notSet')}
						</button>
					{/if}
				</dd>
			</div>
			{#each [{ field: 'startDate', label: 'tasks.details.startDate' }, { field: 'dueDate', label: 'tasks.details.dueDate' }] as const as d (d.field)}
				{@const value = task[d.field]}
				{@const late = d.field === 'dueDate' && overdue}
				<div>
					<dt class={LABEL}>{$t(d.label)}</dt>
					<dd class="m-0">
						<button
							type="button"
							class="{VALUE} {late
								? 'font-semibold'
								: value
									? 'text-gray-900 dark:text-white'
									: 'text-gray-500 dark:text-gray-400 italic'}"
							data-status={late ? 'overdue' : undefined}
							title={$t('tasks.details.change')}
							aria-expanded={editing === d.field}
							onclick={() => (editing = editing === d.field ? null : d.field)}
						>
							{value ? $fmt.date(value) : $t('views.notSet')}
							{#if late}· {$t('tasks.details.overdue')}{/if}
						</button>
						{#if editing === d.field}
							<div
								class="mt-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex flex-col gap-2"
							>
								<Input
									type="date"
									size="sm"
									value={isoToDateInput(value)}
									aria-label={$t(d.label)}
									onchange={(e) => saveDate(d.field, (e.target as HTMLInputElement).value)}
									{@attach showPicker}
								/>
								{#if d.field === 'dueDate' && value}
									<div class="flex items-center gap-1 flex-wrap">
										<span class="text-xs text-gray-500 dark:text-gray-400">
											{$t('tasks.details.deferLabel')}
										</span>
										<Button size="xs" color="light" onclick={() => defer(1)}>
											{$t('tasks.details.defer1')}
										</Button>
										<Button size="xs" color="light" onclick={() => defer(3)}>
											{$t('tasks.details.defer3')}
										</Button>
										<Button size="xs" color="light" onclick={() => defer(7)}>
											{$t('tasks.details.defer7')}
										</Button>
									</div>
								{/if}
								<div class="flex gap-2">
									{#if value}
										<Button size="xs" color="light" onclick={() => saveDate(d.field, '')}>
											{$t('common.clear')}
										</Button>
									{/if}
									<Button size="xs" color="light" onclick={() => (editing = null)}>
										{$t('common.cancel')}
									</Button>
								</div>
							</div>
						{/if}
					</dd>
				</div>
			{/each}
			<div>
				<dt class={LABEL}>{$t('tasks.repeat.summaryLabel')}</dt>
				<dd class="m-0">
					<button
						type="button"
						class="{VALUE} {repeatSummary
							? 'text-gray-900 dark:text-white'
							: 'text-gray-500 dark:text-gray-400 italic'}"
						title={$t('tasks.details.editRepeat')}
						onclick={openRepeat}
					>
						{repeatSummary || $t('tasks.repeat.kind.none')}
					</button>
				</dd>
			</div>
		</dl>
	</div>
</Card>

<Modal title={$t('tasks.details.editRepeat')} bind:open={repeatOpen} size="md">
	<RepeatFields bind:form={repeatForm} />
	{#snippet footer()}
		<Button onclick={saveRepeat} disabled={savingRepeat}>
			{savingRepeat ? $t('common.saving') : $t('common.save')}
		</Button>
		<Button color="light" onclick={() => (repeatOpen = false)}>{$t('common.cancel')}</Button>
	{/snippet}
</Modal>
