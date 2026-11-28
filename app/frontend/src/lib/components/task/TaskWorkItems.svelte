<script lang="ts">
	import { onMount } from 'svelte';
	import { apiGetAuth, MAX_PAGE_SIZE } from '#lib/api.js';
	import { t, type MessageKey } from '#lib/i18n/index.js';
	import { groupByProject } from '#lib/project-groups.js';
	import { loadProjectNames } from '#lib/project-names.js';
	import type { Task, TaskRelation } from '#lib/types.js';
	import { relationLabel, relationKindKey, RELATION_KINDS } from '#lib/types-task.js';
	import { Button, Input, Select } from 'flowbite-svelte';

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
	let newRelatedTaskId = $state<number | ''>('');
	let newRelationKind = $state('related');

	// Tasks the user can link to, grouped like the Tasks view: personal first, then by project.
	let allTasks = $state<Task[]>([]);
	let projectNames = $state<Record<number, string>>({});
	onMount(async () => {
		const [list, names] = await Promise.all([
			apiGetAuth<Task[]>(`/tasks?sort=title&order=asc&limit=${MAX_PAGE_SIZE}`).catch((): Task[] => []),
			loadProjectNames()
		]);
		allTasks = list;
		projectNames = names;
	});

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

	/** Not this task, and not one it already points to with the chosen kind. */
	const candidateGroups = $derived.by(() => {
		const linked = new Set(
			rows.filter((r) => !r.incoming && r.rel.kind === newRelationKind).map((r) => r.other.id)
		);
		return groupByProject(
			allTasks.filter((x) => x.id !== taskId && !linked.has(x.id)),
			projectNames
		);
	});
	const canAddRelation = $derived(
		newRelatedTaskId !== '' && candidateGroups.some((g) => g.tasks.some((x) => x.id === newRelatedTaskId))
	);

	const LABEL = 'block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1';
	const SECTION = 'mt-4 pt-4 border-t border-gray-100 dark:border-gray-700';

	async function submitSubtask(e: SubmitEvent) {
		e.preventDefault();
		if (!newSubtaskTitle.trim()) return;
		if (await onAddSubtask(newSubtaskTitle)) newSubtaskTitle = '';
	}
	async function submitRelation() {
		if (!canAddRelation || newRelatedTaskId === '') return;
		if (await onAddRelation(newRelatedTaskId, newRelationKind)) newRelatedTaskId = '';
	}
</script>

<section class={SECTION}>
	<h2 class={LABEL}>{t('tasks.subtasks.title')}</h2>
	{#if subtasks.length}
		<div class="mb-2">
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
						{t(`common.status.${sub.status ?? 'open'}` as MessageKey)}
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('tasks.subtasks.empty')}</p>
	{/if}
	<form onsubmit={submitSubtask} class="flex items-center gap-2">
		<Input
			type="text"
			size="sm"
			bind:value={newSubtaskTitle}
			placeholder={t('tasks.subtasks.placeholder')}
			class="flex-1"
		/>
		<Button type="submit" size="xs">{t('common.add')}</Button>
	</form>
</section>

<section class={SECTION}>
	<h2 class={LABEL}>{t('tasks.relations.title')}</h2>
	{#if rows.length}
		<div class="mb-2">
			{#each rows as row, i (row.rel.id)}
				<div
					class="flex items-center gap-3 py-2 {i < rows.length - 1
						? 'border-b border-gray-100 dark:border-gray-700'
						: ''}"
				>
					<span
						class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 shrink-0"
					>
						{t(relationLabel(row.rel.kind, row.incoming))}
					</span>
					<a
						href="/tasks/{row.other.id}"
						class="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 hover:underline"
					>
						{row.other.title ?? row.other.name ?? t('tasks.relations.taskFallback', { id: row.other.id })}
					</a>
					{#if !row.incoming}
						<Button
							size="xs"
							color="light"
							onclick={() => onDeleteRelation(row.rel.kind, row.other.id)}
							aria-label={t('tasks.relations.remove')}
						>
							✕
						</Button>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('tasks.relations.empty')}</p>
	{/if}
	<div class="flex items-center gap-2 flex-wrap">
		<Select
			size="sm"
			bind:value={newRelatedTaskId}
			placeholder={t('tasks.relations.selectPlaceholder')}
			aria-label={t('tasks.relations.selectPlaceholder')}
			class="flex-1 min-w-48"
		>
			{#each candidateGroups as group (group.projectId)}
				<optgroup label={group.projectId != null ? group.name : t('views.tasks.noProject')}>
					{#each group.tasks as task (task.id)}
						<option value={task.id}>{task.title} (#{task.id})</option>
					{/each}
				</optgroup>
			{/each}
		</Select>
		<Select placeholder="" size="sm" bind:value={newRelationKind} class="w-auto">
			{#each RELATION_KINDS as k (k)}<option value={k}>{t(relationKindKey(k))}</option>{/each}
		</Select>
		<Button size="xs" onclick={submitRelation} disabled={!canAddRelation}>{t('common.add')}</Button>
	</div>
</section>
