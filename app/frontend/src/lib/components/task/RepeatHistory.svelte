<script lang="ts">
	import { t, fmt } from '$lib/i18n';
	import { apiGetAuth } from '$lib/api';
	import type { CompletionHistory } from '$lib/types';

	/** `version` changes whenever the task does (e.g. its updatedAt), which is when a new completion may exist. */
	let { taskId, version }: { taskId: number; version?: string } = $props();

	let history = $state<CompletionHistory | null>(null);
	let failed = $state(false);

	$effect(() => {
		void version;
		const id = taskId;
		let current = true;
		apiGetAuth<CompletionHistory>(`/tasks/${id}/completions`)
			.then((h) => {
				if (current) {
					history = h;
					failed = false;
				}
			})
			.catch(() => {
				if (current) failed = true;
			});
		return () => {
			current = false;
		};
	});

	const onTime = (c: CompletionHistory['items'][number]) =>
		!c.dueDate || new Date(c.completedAt).getTime() <= new Date(c.dueDate).getTime() + 12 * 3600_000;
</script>

{#if failed}
	<p class="text-xs text-red-500 m-0">{$t('tasks.repeat.history.loadFailed')}</p>
{:else if history && history.total > 0}
	<div>
		<div class="flex items-baseline gap-3 flex-wrap mb-2">
			<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide m-0">
				{$t('tasks.repeat.history.title')}
			</p>
			<span class="text-xs text-gray-500 dark:text-gray-400">
				{$t('tasks.repeat.history.total', { count: history.total })}
			</span>
			{#if history.streak > 1}
				<span class="text-xs text-green-600">
					{$t('tasks.repeat.history.streak', { count: history.streak })}
				</span>
			{/if}
		</div>
		<ul class="list-none p-0 m-0 flex flex-col gap-1 max-h-48 overflow-auto">
			{#each history.items as c (c.id)}
				<li class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
					<span>{$fmt.dateTime(c.completedAt)}</span>
					{#if c.dueDate}<span class="text-xs text-gray-500 dark:text-gray-400">
							({$t('tasks.repeat.history.dueFor', { date: $fmt.date(c.dueDate) })})
						</span>{/if}
					<span class="text-xs {onTime(c) ? 'text-green-600' : 'text-red-500'}">
						{onTime(c) ? $t('tasks.repeat.history.onTime') : $t('tasks.repeat.history.late')}
					</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}
