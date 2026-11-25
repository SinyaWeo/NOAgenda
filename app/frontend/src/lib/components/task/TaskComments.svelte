<script lang="ts">
	import { t, fmt } from '$lib/i18n';
	import type { Comment } from '$lib/types';
	import { Button, Card, Input } from 'flowbite-svelte';

	let {
		taskId,
		comments,
		currentUserId,
		onPostComment,
		onDeleteComment
	}: {
		taskId: number;
		comments: Comment[];
		currentUserId: number | undefined;
		onPostComment: (content: string) => Promise<boolean>;
		onDeleteComment: (id: number) => void;
	} = $props();

	let newComment = $state('');
	let addingComment = $state(false);

	// Per-task input must not leak from the task we just left.
	$effect(() => {
		void taskId;
		newComment = '';
	});

	/** The API only lets a comment's author delete it. */
	function canDeleteComment(comment: Comment): boolean {
		return currentUserId != null && comment.author?.id === currentUserId;
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
