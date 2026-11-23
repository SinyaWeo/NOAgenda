<script lang="ts">
	import { t, type MessageKey } from '$lib/i18n';
	import type { Task, TaskRelation } from '$lib/types';
	import { relationLabel, relationKindKey, RELATION_KINDS } from '$lib/types-task';
	import { Button, Card, Input, Select } from 'flowbite-svelte';

	let {
		taskId,
		subtasks,
		relations,
		onAddSubtask,
		onAddRelation,
		onDeleteRelation
	}: {
		taskId: number;
		subtasks: Task[];
		relations: TaskRelation[];
		onAddSubtask: (title: string) => Promise<boolean>;
		onAddRelation: (relatedTaskId: number, kind: string) => Promise<boolean>;
		onDeleteRelation: (kind: string, relatedTaskId: number) => void;
	} = $props();

	let newSubtaskTitle = $state('');
	let newRelatedTaskId = $state('');
	let newRelationKind = $state('related');

	// Per-task input must not leak from the task we just left.
	$effect(() => {
		void taskId;
		newSubtaskTitle = '';
		newRelatedTaskId = '';
		newRelationKind = 'related';
	});

	/** A row can point either way; show the other end. */
	const rows = $derived(
		relations.flatMap((rel) => {
			const incoming = rel.node?.id !== taskId;
			const other = incoming ? rel.node : rel.relatedNode;
			if (!other) return [];
			return [{ rel, incoming, other }];
		})
	);

	async function submitSubtask(e: SubmitEvent) {
		e.preventDefault();
		if (!newSubtaskTitle.trim()) return;
		if (await onAddSubtask(newSubtaskTitle)) newSubtaskTitle = '';
	}
	async function submitRelation() {
		if (!newRelatedTaskId) return;
		if (await onAddRelation(Number(newRelatedTaskId), newRelationKind)) newRelatedTaskId = '';
	}
</script>

<!-- Subtasks -->
<Card class="mb-4">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">{$t('tasks.subtasks.title')}</h2>
	{#if subtasks.length}
		<div class="mb-3">
			{#each subtasks as sub, i (sub.id)}
				<div
					class="flex items-center gap-3 py-2 {i < subtasks.length - 1
						? 'border-b border-gray-100 dark:border-gray-700'
						: ''}"
				>
					<a
						href="/tasks/{sub.id}"
						class="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 hover:underline"
					>
						{sub.title}
					</a>
					<span
						class="inline-flex items-center text-xs font-semibold shrink-0"
						data-status={sub.status ?? 'open'}
					>
						{$t(`common.status.${sub.status ?? 'open'}` as MessageKey)}
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{$t('tasks.subtasks.empty')}</p>
	{/if}
	<form onsubmit={submitSubtask} class="flex gap-2">
		<Input
			type="text"
			bind:value={newSubtaskTitle}
			placeholder={$t('tasks.subtasks.placeholder')}
			class="flex-1"
		/>
		<Button type="submit" size="sm">{$t('common.add')}</Button>
	</form>
</Card>

<!-- Related Tasks -->
<Card class="mb-4">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
		{$t('tasks.relations.title')}
	</h2>
	{#if rows.length}
		<div class="mb-3">
			{#each rows as row, i (row.rel.id)}
				<div
					class="flex items-center gap-3 py-2 {i < rows.length - 1
						? 'border-b border-gray-100 dark:border-gray-700'
						: ''}"
				>
					<span
						class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 shrink-0"
					>
						{$t(relationLabel(row.rel.kind, row.incoming))}
					</span>
					<a
						href="/tasks/{row.other.id}"
						class="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 hover:underline"
					>
						{row.other.title ?? row.other.name ?? $t('tasks.relations.taskFallback', { id: row.other.id })}
					</a>
					{#if !row.incoming}
						<Button
							size="xs"
							color="light"
							onclick={() => onDeleteRelation(row.rel.kind, row.other.id)}
							aria-label={$t('tasks.relations.remove')}
						>
							✕
						</Button>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{$t('tasks.relations.empty')}</p>
	{/if}
	<div class="flex gap-2 flex-wrap">
		<Input
			type="number"
			bind:value={newRelatedTaskId}
			placeholder={$t('tasks.relations.idPlaceholder')}
			class="w-28"
		/>
		<Select placeholder="" bind:value={newRelationKind} class="w-auto">
			{#each RELATION_KINDS as k (k)}<option value={k}>{$t(relationKindKey(k))}</option>{/each}
		</Select>
		<Button size="sm" onclick={submitRelation}>{$t('common.add')}</Button>
	</div>
</Card>
