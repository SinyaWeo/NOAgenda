<script lang="ts">
	import { t, fmt } from '$lib/i18n';
	import type { Attachment, Comment, Reminder, Task } from '$lib/types';
	import { Button, Card, Input, Select } from 'flowbite-svelte';
	import { PaperClipOutline } from 'flowbite-svelte-icons';
	import ActivityLog from '$lib/components/ActivityLog.svelte';
	import TaskVersionHistory from '$lib/components/task/TaskVersionHistory.svelte';

	let {
		taskId,
		reminders,
		attachments,
		comments,
		currentUserId,
		activityVersion,
		hasDueDate,
		onAddReminder,
		onDeleteReminder,
		onDownload,
		onUpload,
		onPostComment,
		onDeleteComment,
		onRestored
	}: {
		taskId: number;
		reminders: Reminder[];
		attachments: Attachment[];
		comments: Comment[];
		currentUserId: number | undefined;
		/** Changes whenever something that is recorded in the activity log may have changed. */
		activityVersion: string;
		/** The task has a due date, so reminders relative to it can be added. */
		hasDueDate: boolean;
		onAddReminder: (reminder: NewReminder) => Promise<boolean>;
		onDeleteReminder: (id: number) => void;
		onDownload: (id: number, filename: string) => void;
		onUpload: (e: Event) => void;
		onPostComment: (content: string) => Promise<boolean>;
		onDeleteComment: (id: number) => void;
		onRestored: (task: Task) => void;
	} = $props();

	export type NewReminder = { reminderDate: string } | { daysBefore: number; atTime: string };

	const LABEL = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1';

	let newComment = $state('');
	let addingComment = $state(false);
	let newReminderDate = $state('');
	let reminderKind = $state<'date' | 'before'>('date');
	let daysBefore = $state(1);
	let atTime = $state('09:00');

	// Per-task input must not leak from the task we just left.
	$effect(() => {
		void taskId;
		newComment = '';
		newReminderDate = '';
	});

	/** The API only lets a comment's author delete it. */
	function canDeleteComment(comment: Comment): boolean {
		return currentUserId != null && comment.author?.id === currentUserId;
	}

	async function submitReminder(e: SubmitEvent) {
		e.preventDefault();
		if (reminderKind === 'before') {
			if (!hasDueDate || !atTime || !Number.isInteger(daysBefore) || daysBefore < 0) return;
			await onAddReminder({ daysBefore, atTime });
			return;
		}
		if (!newReminderDate) return;
		if (await onAddReminder({ reminderDate: new Date(newReminderDate).toISOString() })) newReminderDate = '';
	}
	async function submitComment(e: SubmitEvent) {
		e.preventDefault();
		if (!newComment.trim()) return;
		addingComment = true;
		try {
			if (await onPostComment(newComment)) newComment = '';
		} finally {
			addingComment = false;
		}
	}
</script>

<!-- Reminders -->
<Card class="mb-4 max-w-none">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">{$t('tasks.reminders.title')}</h2>
	{#if reminders.length}
		<div class="mb-3">
			{#each reminders as rem, i (rem.id)}
				<div
					class="flex items-center gap-3 py-2 {i < reminders.length - 1
						? 'border-b border-gray-100 dark:border-gray-700'
						: ''}"
				>
					<span class="flex-1 text-sm text-gray-700 dark:text-gray-300">
						{#if rem.daysBefore != null && rem.atTime}
							{rem.daysBefore === 0
								? $t('tasks.reminders.onDueDay', { time: rem.atTime })
								: $t('tasks.reminders.relative', { count: rem.daysBefore, time: rem.atTime })}
							<span class="text-xs text-gray-500 dark:text-gray-400">
								· {$fmt.dateTime(rem.reminderDate)}
							</span>
						{:else}
							{$fmt.dateTime(rem.reminderDate)}
						{/if}
					</span>
					{#if rem.sentAt}<span class="text-xs font-medium tone-green">
							{$t('tasks.reminders.sent')}
						</span>{/if}
					<Button
						size="xs"
						color="light"
						onclick={() => onDeleteReminder(rem.id)}
						aria-label={$t('tasks.reminders.remove')}
					>
						✕
					</Button>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{$t('tasks.reminders.empty')}</p>
	{/if}
	<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">{$t('tasks.reminders.hint')}</p>
	<form onsubmit={submitReminder} class="flex flex-wrap items-end gap-2">
		<div>
			<label for="reminder-kind" class={LABEL}>{$t('tasks.reminders.kind')}</label>
			<Select id="reminder-kind" placeholder="" size="sm" class="w-auto" bind:value={reminderKind}>
				<option value="date">{$t('tasks.reminders.kindDate')}</option>
				<option value="before" disabled={!hasDueDate}>{$t('tasks.reminders.kindBefore')}</option>
			</Select>
		</div>
		{#if reminderKind === 'before'}
			<div>
				<label for="reminder-days" class={LABEL}>{$t('tasks.reminders.daysBefore')}</label>
				<Input
					id="reminder-days"
					type="number"
					size="sm"
					min="0"
					max="365"
					class="w-24"
					bind:value={daysBefore}
				/>
			</div>
			<div>
				<label for="reminder-time" class={LABEL}>{$t('tasks.reminders.atTime')}</label>
				<Input id="reminder-time" type="time" size="sm" class="w-32" bind:value={atTime} required />
			</div>
		{:else}
			<div class="flex-1 min-w-52">
				<label for="reminder-date" class={LABEL}>{$t('tasks.reminders.date')}</label>
				<Input id="reminder-date" type="datetime-local" size="sm" bind:value={newReminderDate} />
			</div>
		{/if}
		<Button type="submit" size="sm">{$t('common.add')}</Button>
	</form>
	{#if !hasDueDate}
		<p class="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-0">{$t('tasks.reminders.needsDueDate')}</p>
	{/if}
</Card>

<!-- Attachments -->
<Card class="mb-4 max-w-none">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">{$t('tasks.attachments.title')}</h2>
	{#if attachments.length}
		<div class="mb-3">
			{#each attachments as att, i (att.id)}
				<div
					class="flex items-center gap-2 py-2 {i < attachments.length - 1
						? 'border-b border-gray-100 dark:border-gray-700'
						: ''}"
				>
					<PaperClipOutline class="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
					<button
						type="button"
						onclick={() => onDownload(att.id, att.filename)}
						class="text-sm text-primary-600 dark:text-primary-400 hover:underline text-left"
					>
						{att.filename}
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{$t('tasks.attachments.empty')}</p>
	{/if}
	<label
		class="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
	>
		{$t('tasks.attachments.upload')}
		<input type="file" onchange={onUpload} class="sr-only" />
	</label>
</Card>

<!-- Comments -->
<Card class="mb-4 max-w-none">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">{$t('tasks.comments.title')}</h2>
	{#if comments.length}
		<div class="mb-4">
			{#each comments as comment, i (comment.id)}
				<div
					class="flex flex-col gap-1 py-3 {i < comments.length - 1
						? 'border-b border-gray-100 dark:border-gray-700'
						: ''}"
				>
					<div class="flex items-center justify-between">
						<span class="text-sm font-bold text-primary-600 dark:text-primary-400">
							{comment.author?.username ?? $t('common.unknown')}
						</span>
						<div class="flex items-center gap-2">
							<span class="text-xs text-gray-500 dark:text-gray-400">{$fmt.dateTime(comment.createdAt)}</span>
							{#if canDeleteComment(comment)}
								<Button size="xs" color="light" onclick={() => onDeleteComment(comment.id)}>
									{$t('common.delete')}
								</Button>
							{/if}
						</div>
					</div>
					<p class="text-sm text-gray-700 dark:text-gray-300 m-0 whitespace-pre-wrap">
						{comment.content}
					</p>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{$t('tasks.comments.empty')}</p>
	{/if}
	<form onsubmit={submitComment} class="flex gap-2">
		<Input
			type="text"
			bind:value={newComment}
			placeholder={$t('tasks.comments.placeholder')}
			class="flex-1"
		/>
		<Button type="submit" size="sm" disabled={addingComment}>{$t('tasks.comments.post')}</Button>
	</form>
</Card>

<!-- Version history -->
<Card class="mb-4 max-w-none">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">{$t('tasks.history.title')}</h2>
	<TaskVersionHistory {taskId} version={activityVersion} {onRestored} />
</Card>

<!-- Activity log -->
<Card class="mb-4 max-w-none">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">{$t('activity.title')}</h2>
	<ActivityLog endpoint="/activity?nodeId={taskId}" version={activityVersion} />
</Card>
