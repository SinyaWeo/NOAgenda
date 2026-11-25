<script lang="ts">
	import { t, fmt, type MessageKey } from '$lib/i18n';
	import type {
		Attachment,
		Label,
		Reminder,
		Task,
		TaskAssignee,
		TaskLabel,
		TaskRelation,
		UserSummary
	} from '$lib/types';
	import { describeRepeat, formFromTask, repeatPayload, type RepeatForm } from '$lib/repeat';
	import { dateInputToIso, isoToDateInput } from '$lib/dates';
	import RepeatHistory from './RepeatHistory.svelte';
	import RepeatFields from './RepeatFields.svelte';
	import InlineText from '$lib/components/InlineText.svelte';
	import TaskWorkItems from './TaskWorkItems.svelte';
	import TaskReminderEditor, { type NewReminder } from './TaskReminderEditor.svelte';
	import { EditOutline, PaperClipOutline } from 'flowbite-svelte-icons';
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
		onUpdate,
		subtasks,
		relations,
		onAddSubtask,
		onAddRelation,
		onDeleteRelation,
		reminders,
		onAddReminder,
		onDeleteReminder,
		attachments,
		onDownload,
		onUpload,
		onDeleteAttachment
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
		subtasks: Task[];
		relations: TaskRelation[];
		onAddSubtask: (title: string) => Promise<boolean>;
		onAddRelation: (relatedTaskId: number, kind: string) => Promise<boolean>;
		onDeleteRelation: (kind: string, relatedTaskId: number) => void;
		reminders: Reminder[];
		onAddReminder: (reminder: NewReminder) => Promise<boolean>;
		onDeleteReminder: (id: number) => void;
		attachments: Attachment[];
		onDownload: (id: number, filename: string) => void;
		onUpload: (e: Event) => void;
		onDeleteAttachment: (attachment: Attachment) => void;
	} = $props();

	const LABEL = 'block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1';

	/** The field whose editor is open (only one at a time); null: all show their value. */
	let editing = $state<
		| 'status'
		| 'priority'
		| 'startDate'
		| 'dueDate'
		| 'labels'
		| 'assignee'
		| 'reminders'
		| 'attachments'
		| null
	>(null);
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

	/** The small editor box that opens under a value. */
	const PANEL_BOX =
		'mt-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40';
	const PANEL = `${PANEL_BOX} flex flex-col gap-2`;

	const VALUE =
		'text-sm text-left cursor-pointer bg-transparent border-0 p-0 hover:underline focus:outline-none focus-visible:underline';

	const overdue = $derived(!!task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done');

	/** Live value while dragging the slider; null once the change is committed. */
	let dragValue = $state<number | null>(null);
	const progress = $derived(dragValue ?? task.percentDone ?? 0);

	/** Labels the panel offers: the user's own, plus any other label already on the task (removable). */
	const labelChoices = $derived([
		...allLabels,
		...taskLabels.flatMap((tl) =>
			tl.label && !allLabels.some((l) => l.id === tl.label!.id) ? [tl.label] : []
		)
	]);
	const onTask = (labelId: number) => taskLabels.some((tl) => tl.label?.id === labelId);

	/** Only the creator may reassign, and only when there is someone to choose. */
	const canAssign = $derived(assignable.length > 1);
	const assigneeNames = $derived(
		assignees
			.map((a) => a.user?.name || a.user?.username || $t('tasks.details.userFallback', { id: a.id }))
			.join(', ')
	);

	const repeatSummary = $derived.by(() => {
		void $t; // re-runs when the language changes
		return describeRepeat(task);
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') editing = null;
	}}
/>

{#snippet reminderText(rem: Reminder)}
	{#if rem.daysBefore != null && rem.atTime}
		{rem.daysBefore === 0
			? $t('tasks.reminders.onDueDay', { time: rem.atTime })
			: $t('tasks.reminders.relative', { count: rem.daysBefore, time: rem.atTime })}
		<span class="text-xs text-gray-500 dark:text-gray-400 not-italic">
			· {$fmt.dateTime(rem.reminderDate)}
		</span>
	{:else}
		{$fmt.dateTime(rem.reminderDate)}
	{/if}
	{#if rem.sentAt}<span class="text-xs font-medium tone-green">· {$t('tasks.reminders.sent')}</span>{/if}
{/snippet}

<Card class="mb-4 max-w-none">
	<div class="flex flex-col md:flex-row gap-6">
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

			<TaskWorkItems
				taskId={task.id}
				{subtasks}
				{relations}
				{onAddSubtask}
				{onAddRelation}
				{onDeleteRelation}
			/>

			{#if task.repeatAfter}
				<div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
					<RepeatHistory taskId={task.id} version={task.updatedAt} />
				</div>
			{/if}
		</div>

		<dl
			class="md:w-60 shrink-0 m-0 flex flex-col gap-4 border-t pt-6 md:border-t-0 md:pt-0 md:border-l md:pl-6 border-gray-100 dark:border-gray-700"
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
				<dt class={LABEL}>{$t('tasks.details.labels')}</dt>
				<dd class="m-0">
					<button
						type="button"
						class="{VALUE} flex flex-wrap gap-x-3 gap-y-1 {taskLabels.length
							? 'text-gray-900 dark:text-white'
							: 'text-gray-500 dark:text-gray-400 italic'}"
						title={$t('tasks.details.change')}
						aria-expanded={editing === 'labels'}
						onclick={() => (editing = editing === 'labels' ? null : 'labels')}
					>
						{#each taskLabels as tl (tl.id)}
							<span class="inline-flex items-center gap-1.5">
								<span class="color-dot" style="--dot-color:{tl.label?.color ?? '#6366f1'}"></span>
								{tl.label?.title ?? $t('tasks.details.labelFallback', { id: tl.id })}
							</span>
						{:else}
							{$t('common.none')}
						{/each}
					</button>
					{#if editing === 'labels'}
						<div class={PANEL}>
							{#if labelChoices.length}
								<ul class="m-0 p-0 list-none flex flex-col gap-1.5 max-h-60 overflow-y-auto">
									{#each labelChoices as l (l.id)}
										<li>
											<label class="flex items-center gap-2 text-sm cursor-pointer">
												<input
													type="checkbox"
													class="rounded"
													checked={onTask(l.id)}
													onchange={(e) =>
														(e.target as HTMLInputElement).checked ? onAddLabel(l.id) : onRemoveLabel(l.id)}
												/>
												<span class="color-dot" style="--dot-color:{l.color ?? '#6366f1'}"></span>
												<span class="min-w-0 break-words">{l.title}</span>
											</label>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="m-0 text-xs text-gray-500 dark:text-gray-400">
									{$t('tasks.details.noLabelsYet')}
									<a href="/labels" class="text-primary-600 hover:underline">
										{$t('tasks.details.createLabels')}
									</a>
								</p>
							{/if}
							<div>
								<Button size="xs" color="light" onclick={() => (editing = null)}>
									{$t('common.close')}
								</Button>
							</div>
						</div>
					{/if}
				</dd>
			</div>
			{#if canAssign || assignees.length}
				<div>
					<dt class={LABEL}>{$t('tasks.details.assignee')}</dt>
					<dd class="m-0">
						{#if editing === 'assignee'}
							<Select
								placeholder=""
								size="sm"
								autofocus
								value={assignees[0]?.user?.id ?? ''}
								aria-label={$t('tasks.details.assignee')}
								onchange={(e) => {
									onAssign(Number((e.target as HTMLSelectElement).value));
									editing = null;
								}}
								onblur={() => (editing = null)}
							>
								{#if !assignees.length}<option value="" disabled>
										{$t('tasks.details.unassigned')}
									</option>{/if}
								{#each assignable as u (u.id)}<option value={u.id}>{u.name || u.username}</option>{/each}
							</Select>
						{:else if canAssign}
							<button
								type="button"
								class="{VALUE} {assignees.length
									? 'text-gray-900 dark:text-white'
									: 'text-gray-500 dark:text-gray-400 italic'}"
								title={$t('tasks.details.change')}
								onclick={() => (editing = 'assignee')}
							>
								{assigneeNames || $t('tasks.details.unassigned')}
							</button>
						{:else}
							<span class="text-sm text-gray-900 dark:text-white">{assigneeNames}</span>
						{/if}
					</dd>
				</div>
			{/if}
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
			<div>
				<dt class={LABEL}>{$t('tasks.reminders.title')}</dt>
				<dd class="m-0">
					<button
						type="button"
						class="{VALUE} flex flex-col gap-1 {reminders.length
							? 'text-gray-900 dark:text-white'
							: 'text-gray-500 dark:text-gray-400 italic'}"
						title={$t('tasks.details.change')}
						aria-expanded={editing === 'reminders'}
						onclick={() => (editing = editing === 'reminders' ? null : 'reminders')}
					>
						{#each reminders as rem (rem.id)}
							<span class="block">{@render reminderText(rem)}</span>
						{:else}
							{$t('common.none')}
						{/each}
					</button>
					{#if editing === 'reminders'}
						<div class={PANEL}>
							<TaskReminderEditor
								{reminders}
								hasDueDate={!!task.dueDate}
								describe={reminderText}
								onAdd={onAddReminder}
								onDelete={onDeleteReminder}
							/>
							<div>
								<Button size="xs" color="light" onclick={() => (editing = null)}>
									{$t('common.close')}
								</Button>
							</div>
						</div>
					{/if}
				</dd>
			</div>
			<div>
				<dt class="{LABEL} flex items-center gap-1">
					{$t('tasks.attachments.title')}
					<button
						type="button"
						class="p-0.5 rounded bg-transparent border-0 cursor-pointer text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
						aria-label={$t('tasks.attachments.edit')}
						title={$t('tasks.attachments.edit')}
						aria-expanded={editing === 'attachments'}
						onclick={() => (editing = editing === 'attachments' ? null : 'attachments')}
					>
						<EditOutline class="w-3.5 h-3.5" />
					</button>
				</dt>
				<dd class="m-0">
					{#if attachments.length}
						<ul class="m-0 p-0 list-none flex flex-col gap-1">
							{#each attachments as att (att.id)}
								<li class="flex items-start gap-1.5 text-sm">
									<PaperClipOutline class="w-4 h-4 mt-0.5 text-gray-500 dark:text-gray-400 shrink-0" />
									<button
										type="button"
										class="min-w-0 break-all text-left bg-transparent border-0 p-0 cursor-pointer text-primary-600 dark:text-primary-400 hover:underline"
										onclick={() => onDownload(att.id, att.filename)}
									>
										{att.filename}
									</button>
									{#if editing === 'attachments'}
										<button
											type="button"
											class="ml-auto shrink-0 bg-transparent border-0 p-0 leading-none cursor-pointer text-gray-500 dark:text-gray-400 hover:text-red-600"
											aria-label={$t('tasks.attachments.remove', { name: att.filename })}
											title={$t('tasks.attachments.remove', { name: att.filename })}
											onclick={() => onDeleteAttachment(att)}
										>
											✕
										</button>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<button
							type="button"
							class="{VALUE} text-gray-500 dark:text-gray-400 italic"
							title={$t('tasks.details.change')}
							onclick={() => (editing = editing === 'attachments' ? null : 'attachments')}
						>
							{$t('common.none')}
						</button>
					{/if}
					{#if editing === 'attachments'}
						<div class="{PANEL_BOX} flex flex-wrap items-center gap-2">
							<label
								class="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
							>
								{$t('tasks.attachments.upload')}
								<input type="file" onchange={onUpload} class="sr-only" />
							</label>
							<Button size="xs" color="light" onclick={() => (editing = null)}>
								{$t('common.close')}
							</Button>
						</div>
					{/if}
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
