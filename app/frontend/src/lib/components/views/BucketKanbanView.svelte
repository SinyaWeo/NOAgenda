<script lang="ts">
	import { confirmDialog } from '#lib/confirm.svelte.js';
	import type { KanbanBucket, NodeStatus, Task } from '#lib/types.js';
	import { BUCKET_STATUSES, effectiveBucketId, isLastOfStatus } from '#lib/kanban.js';
	import type { BucketMoveHandler } from '#lib/types-views.js';
	import { Button, Input, Select } from 'flowbite-svelte';
	import { t, fmt, type MessageKey } from '#lib/i18n/index.js';

	interface Props {
		tasks: Task[];
		buckets: KanbanBucket[];
		onMove: BucketMoveHandler;
		/** Bucket management: omit all of these for a read-only board. */
		onCreate?: (title: string, status: NodeStatus) => void | Promise<void>;
		onUpdate?: (
			id: number,
			data: { title?: string; limit?: number | null; status?: NodeStatus }
		) => void | Promise<void>;
		onDelete?: (id: number) => void | Promise<void>;
		/** Move a bucket one place left (-1) or right (+1). */
		onReorder?: (id: number, direction: -1 | 1) => void | Promise<void>;
	}
	let { tasks, buckets, onMove, onCreate, onUpdate, onDelete, onReorder }: Props = $props();

	const manage = $derived(!!(onCreate || onUpdate || onDelete || onReorder));

	// Every task shows in a column: the bucket it was placed in, or the first one of its status.
	const columnOf = $derived(new Map(tasks.map((t) => [t.id, effectiveBucketId(t, buckets)])));
	const statusLabel = (s: NodeStatus) => t(`common.status.${s}` as MessageKey);

	let newTitle = $state('');
	let newStatus = $state<NodeStatus>('open');
	let editingId = $state<number | null>(null);
	let editTitle = $state('');
	let editLimit = $state('');
	let editStatus = $state<NodeStatus>('open');
	let busy = $state(false);
	let draggingId = $state<number | null>(null);
	let overBucket = $state<number | null>(null);

	function onDragStart(e: DragEvent, task: Task) {
		if (!e.dataTransfer) return;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', String(task.id));
		draggingId = task.id;
	}

	function onDragEnd() {
		draggingId = null;
		overBucket = null;
	}

	function onDragOver(e: DragEvent, bucketId: number) {
		if (draggingId == null) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		overBucket = bucketId;
	}

	function onDrop(e: DragEvent, bucketId: number) {
		e.preventDefault();
		const task = tasks.find((x) => x.id === draggingId);
		onDragEnd();
		if (task && columnOf.get(task.id) !== bucketId) onMove(task.id, bucketId);
	}

	async function run(fn: () => void | Promise<void>) {
		busy = true;
		try {
			await fn();
		} finally {
			busy = false;
		}
	}

	async function add(e: Event) {
		e.preventDefault();
		const title = newTitle.trim();
		if (!title || !onCreate) return;
		await run(() => onCreate(title, newStatus));
		newTitle = '';
	}

	function startEdit(b: KanbanBucket) {
		editingId = b.id;
		editTitle = b.title;
		editLimit = b.limit != null ? String(b.limit) : '';
		editStatus = b.status;
	}

	async function saveEdit(e: Event) {
		e.preventDefault();
		const id = editingId;
		const title = editTitle.trim();
		if (id == null || !title || !onUpdate) return;
		const raw = editLimit.trim();
		const limit = raw === '' ? null : Number(raw);
		if (limit !== null && (!Number.isInteger(limit) || limit < 0)) return;
		await run(() => onUpdate(id, { title, limit, status: editStatus }));
		editingId = null;
	}

	async function remove(b: KanbanBucket) {
		if (!onDelete || !(await confirmDialog(t('views.kanban.confirmDelete', { title: b.title })))) return;
		await run(() => onDelete(b.id));
	}
</script>

{#snippet card(task: Task)}
	<div
		class="board-card mb-2"
		class:board-card-dragging={draggingId === task.id}
		role="listitem"
		draggable="true"
		ondragstart={(e) => onDragStart(e, task)}
		ondragend={onDragEnd}
	>
		<a href="/tasks/{task.id}" class="font-medium text-sm text-gray-800 dark:text-gray-200 hover:underline">
			{task.title}
		</a>
		{#if task.dueDate}<div class="text-xs text-gray-500 dark:text-gray-400">
				{fmt.date(task.dueDate)}
			</div>{/if}
		<Select
			placeholder=""
			value={columnOf.get(task.id) ?? ''}
			onchange={(e) => onMove(task.id, Number((e.target as HTMLSelectElement).value))}
			class="mt-2 text-xs"
			aria-label={t('views.kanban.moveTo')}
		>
			{#each buckets as b (b.id)}<option value={b.id}>{b.title}</option>{/each}
		</Select>
	</div>
{/snippet}

{#if buckets.length}
	<div class="board-cols">
		{#each buckets as bucket, i (bucket.id)}
			{@const bucketTasks = tasks.filter((t) => columnOf.get(t.id) === bucket.id)}
			{@const lastOfStatus = isLastOfStatus(bucket, buckets)}
			{@const overLimit = bucket.limit != null && bucketTasks.length > bucket.limit}
			<div
				class="board-col"
				class:board-col-over={overBucket === bucket.id}
				role="group"
				aria-label={bucket.title}
				ondragover={(e) => onDragOver(e, bucket.id)}
				ondragleave={(e) => {
					if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) overBucket = null;
				}}
				ondrop={(e) => onDrop(e, bucket.id)}
			>
				<div class="board-col-header">
					{#if editingId === bucket.id}
						<form onsubmit={saveEdit} class="flex flex-col gap-2 w-full">
							<Input
								size="sm"
								bind:value={editTitle}
								maxlength={255}
								required
								aria-label={t('views.kanban.bucketName')}
							/>
							<Input
								size="sm"
								type="number"
								min="0"
								bind:value={editLimit}
								placeholder={t('views.kanban.limitPlaceholder')}
								aria-label={t('views.kanban.limit')}
							/>
							<Select
								size="sm"
								placeholder=""
								bind:value={editStatus}
								disabled={lastOfStatus}
								title={lastOfStatus ? t('views.kanban.lastOfStatus') : undefined}
								aria-label={t('views.kanban.status')}
							>
								{#each BUCKET_STATUSES as s (s)}<option value={s}>{statusLabel(s)}</option>{/each}
							</Select>
							<div class="flex gap-2">
								<Button type="submit" size="xs" disabled={busy}>{t('common.save')}</Button>
								<Button type="button" size="xs" color="light" onclick={() => (editingId = null)}>
									{t('common.cancel')}
								</Button>
							</div>
						</form>
					{:else}
						<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 m-0 flex-1">
							{bucket.title}
							<span
								class="font-normal text-xs {overLimit
									? 'text-red-600 dark:text-red-400'
									: 'text-gray-500 dark:text-gray-400'}"
								title={overLimit ? t('views.kanban.overLimit') : undefined}
							>
								({bucketTasks.length}{bucket.limit != null ? ` / ${bucket.limit}` : ''})
							</span>
							<span class="block text-xs font-medium" data-status={bucket.status}>
								{statusLabel(bucket.status)}
							</span>
						</h3>
						{#if manage}
							<div class="flex items-center gap-1 text-xs shrink-0">
								{#if onReorder}
									<button
										type="button"
										class="px-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 disabled:opacity-30"
										disabled={busy || i === 0}
										aria-label={t('views.kanban.moveLeft')}
										onclick={() => run(() => onReorder(bucket.id, -1))}
									>
										←
									</button>
									<button
										type="button"
										class="px-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 disabled:opacity-30"
										disabled={busy || i === buckets.length - 1}
										aria-label={t('views.kanban.moveRight')}
										onclick={() => run(() => onReorder(bucket.id, 1))}
									>
										→
									</button>
								{/if}
								{#if onUpdate}
									<button
										type="button"
										class="px-1 text-primary-600 hover:underline"
										onclick={() => startEdit(bucket)}
									>
										{t('common.edit')}
									</button>
								{/if}
								{#if onDelete}
									<button
										type="button"
										class="px-1 text-red-600 hover:underline disabled:opacity-30 disabled:no-underline"
										disabled={busy || lastOfStatus}
										title={lastOfStatus ? t('views.kanban.lastOfStatus') : undefined}
										onclick={() => remove(bucket)}
									>
										{t('common.delete')}
									</button>
								{/if}
							</div>
						{/if}
					{/if}
				</div>
				<div class="board-col-body">
					{#each bucketTasks as task (task.id)}{@render card(task)}{/each}
					{#if !bucketTasks.length}
						<p class="text-xs text-gray-500 dark:text-gray-400 text-center m-0">{t('views.column.empty')}</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="text-center py-10 text-gray-500 dark:text-gray-400">
		<p>{t('views.kanban.noBuckets')}</p>
	</div>
{/if}

{#if onCreate}
	<form onsubmit={add} class="flex gap-2 mt-4 max-w-xl">
		<Input
			bind:value={newTitle}
			maxlength={255}
			placeholder={t('views.kanban.newBucketPlaceholder')}
			aria-label={t('views.kanban.newBucketPlaceholder')}
			required
		/>
		<Select placeholder="" bind:value={newStatus} class="w-auto" aria-label={t('views.kanban.status')}>
			{#each BUCKET_STATUSES as s (s)}<option value={s}>{statusLabel(s)}</option>{/each}
		</Select>
		<Button type="submit" disabled={busy || !newTitle.trim()}>{t('views.kanban.addBucket')}</Button>
	</form>
{/if}
