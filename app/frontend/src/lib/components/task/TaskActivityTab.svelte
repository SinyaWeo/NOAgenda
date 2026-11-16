<script lang="ts">
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
		onDeleteComment,
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
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Reminders</h2>
	{#if reminders.length}
		<div class="mb-3">
			{#each reminders as rem, i (rem.id)}
				<div
					class="flex items-center gap-3 py-2 {i < reminders.length - 1
						? 'border-b border-gray-100 dark:border-gray-700'
						: ''}"
				>
					<span class="flex-1 text-sm text-gray-700 dark:text-gray-300"
						>{new Date(rem.reminderDate).toLocaleString()}</span
					>
					<Button
						size="xs"
						color="light"
						onclick={() => onDeleteReminder(rem.id)}
						aria-label="Remove reminder">✕</Button
					>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-400 mb-3">No reminders.</p>
	{/if}
	<div class="flex gap-2">
		<Input type="datetime-local" bind:value={newReminderDate} class="flex-1" />
		<Button size="sm" onclick={submitReminder}>Add</Button>
	</div>
</Card>

<!-- Attachments -->
<Card class="mb-4">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Attachments</h2>
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
		<p class="text-sm text-gray-400 mb-3">No attachments.</p>
	{/if}
	<label
		class="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
	>
		Upload file
		<input type="file" onchange={onUpload} class="sr-only" />
	</label>
</Card>

<!-- Comments -->
<Card>
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Comments</h2>
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
							>{comment.author?.username ?? 'Unknown'}</span
						>
						<div class="flex items-center gap-2">
							<span class="text-xs text-gray-400"
								>{new Date(comment.createdAt).toLocaleString()}</span
							>
							{#if canDeleteComment(comment)}
								<Button
									size="xs"
									color="light"
									onclick={() => onDeleteComment(comment.id)}>Delete</Button
								>
							{/if}
						</div>
					</div>
					<p
						class="text-sm text-gray-700 dark:text-gray-300 m-0 whitespace-pre-wrap"
					>
						{comment.content}
					</p>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-400 mb-4">No comments yet.</p>
	{/if}
	<form onsubmit={submitComment} class="flex gap-2">
		<Input
			type="text"
			bind:value={newComment}
			placeholder="Add a comment…"
			class="flex-1"
		/>
		<Button type="submit" size="sm" disabled={addingComment}>Post</Button>
	</form>
</Card>
