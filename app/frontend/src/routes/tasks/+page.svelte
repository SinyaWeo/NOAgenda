<script lang="ts">
	import { onMount } from 'svelte';
	import { apiGetAuth } from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';

	const tasks = writable<any[]>([]);
	const loading = writable(true);
	const error = writable('');
	const sort = writable('createdAt');
	const order = writable<'ASC' | 'DESC'>('DESC');
	const page = writable(1);
	const limit = 20;
	const hasMore = writable(false);

	async function loadTasks() {
		loading.set(true);
		error.set('');
		try {
			const list = await apiGetAuth<any[]>(
				`/tasks?sort=${$sort}&order=${$order}&page=${$page}&limit=${limit + 1}`,
			);
			hasMore.set(list.length > limit);
			tasks.set(list.slice(0, limit));
		} catch (e: any) {
			error.set(e.message);
		} finally {
			loading.set(false);
		}
	}

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/login');
			return;
		}
		await loadTasks();
	});

	async function changeSort(field: string) {
		if ($sort === field) {
			order.update((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
		} else {
			sort.set(field);
			order.set('ASC');
		}
		page.set(1);
		await loadTasks();
	}

	async function prevPage() {
		if ($page > 1) {
			page.update((p) => p - 1);
			await loadTasks();
		}
	}
	async function nextPage() {
		if ($hasMore) {
			page.update((p) => p + 1);
			await loadTasks();
		}
	}

	const PRIORITY_LABELS = ['—', 'Low', 'Medium', 'High', 'Urgent', 'Do Now'];
	const PRIORITY_COLORS = [
		'',
		'#6366f1',
		'#06b6d4',
		'#f59e0b',
		'#f97316',
		'#ef4444',
	];
	const STATUS_COLORS: Record<string, string> = {
		open: '#6366f1',
		in_progress: '#f59e0b',
		done: '#22c55e',
	};
	const STATUS_LABELS: Record<string, string> = {
		open: 'Open',
		in_progress: 'In Progress',
		done: 'Done',
	};
</script>

<div class="page-header">
	<h1 class="page-title">Tasks</h1>
	<div class="page-actions">
		<a href="/tasks/create" class="btn btn-primary"
			><span class="icon icon-sm">add</span> Create Task</a
		>
	</div>
</div>

<div class="filter-controls mb-4">
	<span class="filter-label">Sort:</span>
	{#each [['createdAt', 'Created'], ['dueDate', 'Due Date'], ['priority', 'Priority'], ['title', 'Title'], ['status', 'Status']] as [field, label]}
		<button
			onclick={() => changeSort(field)}
			class="btn btn-sm {$sort === field
				? 'btn-primary'
				: 'btn-secondary'}"
		>
			{label}{$sort === field ? ($order === 'ASC' ? ' ↑' : ' ↓') : ''}
		</button>
	{/each}
</div>

{#if $loading}
	<p class="text-muted">Loading tasks...</p>
{:else if $error}
	<div class="alert alert-error">{$error}</div>
{:else if $tasks.length}
	<div class="list">
		{#each $tasks as task}
			{@const isOverdue =
				task.dueDate &&
				new Date(task.dueDate) < new Date() &&
				task.status !== 'done'}
			<div class="task-row {isOverdue ? 'upcoming-item-overdue' : ''}">
				<span class="status-dot" data-status={task.status}></span>
				<a
					href="/tasks/{task.id}"
					class="truncate font-medium"
					style="flex:1;text-decoration:{task.status === 'done'
						? 'line-through'
						: 'none'}">{task.title}</a
				>
				<div class="flex-center gap-2">
					{#if task.priority && task.priority > 0}
						<span
							class="priority-text"
							data-priority={task.priority}
							>{PRIORITY_LABELS[task.priority]}</span
						>
					{/if}
					{#if task.dueDate}
						<span
							class="text-xs {isOverdue
								? 'text-danger'
								: 'text-muted'}"
							>{new Date(task.dueDate).toLocaleDateString()}</span
						>
					{/if}
					<span class="status-badge" data-status={task.status}
						>{STATUS_LABELS[task.status] ?? task.status}</span
					>
				</div>
			</div>
		{/each}
	</div>
	<div class="flex-center gap-2 mt-4">
		<button
			onclick={prevPage}
			disabled={$page === 1}
			class="btn btn-secondary btn-sm"
			><span class="icon icon-sm">arrow_back</span> Prev</button
		>
		<span class="text-muted text-sm">Page {$page}</span>
		<button
			onclick={nextPage}
			disabled={!$hasMore}
			class="btn btn-secondary btn-sm"
			>Next <span class="icon icon-sm">arrow_forward</span></button
		>
	</div>
{:else}
	<div class="empty-state">
		<span class="icon">task_alt</span>
		<p>No tasks found. <a href="/tasks/create">Create a task.</a></p>
	</div>
{/if}
