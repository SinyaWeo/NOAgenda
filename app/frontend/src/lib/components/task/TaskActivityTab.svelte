<script lang="ts">
	import { t, fmt } from '$lib/i18n';
	import type { Attachment, Comment, Reminder } from '$lib/types';
	import { Button, Card, Input } from 'flowbite-svelte';
	import { PaperClipOutline } from 'flowbite-svelte-icons';

	let {
		taskId,
		reminders,
		attachments,
		comments,
		currentUserId,
		onAddReminder,
		onDeleteReminder,
		onDownload,
		onUpload,
		onPostComment,
		onDeleteComment
	}: {
		taskId: number;
		reminders: Reminder[];
		attachments: Attachment[];
		comments: Comment[];
		currentUserId: number | undefined;
		onAddReminder: (localDateTime: string) => Promise<boolean>;
		onDeleteReminder: (id: number) => void;
		onDownload: (id: number, filename: string) => void;
		onUpload: (e: Event) => void;
		onPostComment: (content: string) => Promise<boolean>;
		onDeleteComment: (id: number) => void;
	} = $props();

	let newComment = $state('');
	let addingComment = $state(false);
	let newReminderDate = $state('');

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

	async function submitReminder() {
		if (!newReminderDate) return;
		if (await onAddReminder(newReminderDate)) newReminderDate = '';
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
<Card class="mb-4">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">{$t('tasks.reminders.title')}</h2>
	{#if reminders.length}
		<div class="mb-3">
			{#each reminders as rem, i (rem.id)}
				<div
					class="flex items-center gap-3 py-2 {i < reminders.length - 1
						? 'border-b border-gray-100 dark:border-gray-700'
						: ''}"
				>
					<span class="flex-1 text-sm text-gray-700 dark:text-gray-300"
						>{$fmt.dateTime(rem.reminderDate)}</span
					>
					{#if rem.sentAt}<span class="text-xs font-medium tone-green">{$t('tasks.reminders.sent')}</span
						>{/if}
					<Button
						size="xs"
						color="light"
						onclick={() => onDeleteReminder(rem.id)}
						aria-label={$t('tasks.reminders.remove')}>✕</Button
					>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-400 mb-3">{$t('tasks.reminders.empty')}</p>
	{/if}
	<p class="text-xs text-gray-400 mb-2">{$t('tasks.reminders.hint')}</p>
	<div class="flex gap-2">
		<Input type="datetime-local" bind:value={newReminderDate} class="flex-1" />
		<Button size="sm" onclick={submitReminder}>{$t('common.add')}</Button>
	</div>
</Card>

<!-- Attachments -->
<Card class="mb-4">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">{$t('tasks.attachments.title')}</h2>
	{#if attachments.length}
		<div class="mb-3">
			{#each attachments as att, i (att.id)}
				<div
					class="flex items-center gap-2 py-2 {i < attachments.length - 1
						? 'border-b border-gray-100 dark:border-gray-700'
						: ''}"
				>
					<PaperClipOutline class="w-4 h-4 text-gray-400 shrink-0" />
					<button
						type="button"
						onclick={() => onDownload(att.id, att.filename)}
						class="text-sm text-primary-600 dark:text-primary-400 hover:underline text-left"
						>{att.filename}</button
					>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-400 mb-3">{$t('tasks.attachments.empty')}</p>
	{/if}
	<label
		class="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
	>
		{$t('tasks.attachments.upload')}
		<input type="file" onchange={onUpload} class="sr-only" />
	</label>
</Card>

<!-- Comments -->
<Card>
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
						<span class="text-sm font-bold text-primary-600 dark:text-primary-400"
							>{comment.author?.username ?? $t('common.unknown')}</span
						>
						<div class="flex items-center gap-2">
							<span class="text-xs text-gray-400">{$fmt.dateTime(comment.createdAt)}</span>
							{#if canDeleteComment(comment)}
								<Button size="xs" color="light" onclick={() => onDeleteComment(comment.id)}
									>{$t('common.delete')}</Button
								>
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
		<p class="text-sm text-gray-400 mb-4">{$t('tasks.comments.empty')}</p>
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
