<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { apiGetAuth, apiPostAuth, apiPutAuth } from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { writable, derived } from 'svelte/store';
	import { goto } from '$app/navigation';

	const project = writable<any>(null);
	const tasks = writable<any[]>([]);
	const views = writable<any[]>([]);
	const loading = writable(true);
	const error = writable('');

	let newTaskTitle = '';
	let addingTask = false;
	const filterStatus = writable('');
	const filterPriority = writable('');

	const PRIORITY_LABELS = ['—', 'Low', 'Medium', 'High', 'Urgent', 'Do Now'];
	const STATUS_COLORS: Record<string, string> = {
		open: '#6366f1',
		in_progress: '#f59e0b',
		done: '#22c55e',
	};

	const filteredTasks = derived(
		[tasks, filterStatus, filterPriority],
		([$tasks, $status, $priority]) => {
			return $tasks.filter((t: any) => {
				if ($status && t.status !== $status) return false;
				if ($priority && String(t.priority ?? 0) !== $priority)
					return false;
				return true;
			});
		},
	);

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/login');
			return;
		}
		const id = $page.params.id;
		try {
			const [p, t, v] = await Promise.all([
				apiGetAuth<any>(`/projects/${id}`),
				apiGetAuth<any[]>(`/tasks?projectId=${id}`),
				apiGetAuth<any[]>(`/projects/${id}/views`).catch(() => []),
			]);
			project.set(p);
			tasks.set(t);
			views.set(v);
		} catch (e: any) {
			error.set(e.message);
		} finally {
			loading.set(false);
		}
	});

	async function quickAdd(e: SubmitEvent) {
		e.preventDefault();
		if (!newTaskTitle.trim() || addingTask) return;
		addingTask = true;
		const id = $page.params.id;
		try {
			await apiPostAuth('/tasks', {
				title: newTaskTitle,
				project: { id: Number(id) },
			});
			newTaskTitle = '';
			tasks.set(await apiGetAuth<any[]>(`/tasks?projectId=${id}`));
		} catch (e: any) {
			error.set(e.message);
		} finally {
			addingTask = false;
		}
	}

	async function toggleStatus(taskId: number, current: string) {
		const next =
			current === 'open'
				? 'in_progress'
				: current === 'in_progress'
					? 'done'
					: 'open';
		try {
			const updated = await apiPutAuth<any>(`/tasks/${taskId}`, {
				status: next,
			});
			tasks.update((list) =>
				list.map((t) => (t.id === taskId ? updated : t)),
			);
		} catch (e: any) {
			error.set(e.message);
		}
	}
</script>

{#if $loading}
	<p class="text-muted">Loading...</p>
{:else if $error}
	<div class="alert alert-error">{$error}</div>
{:else if $project}
	<div class="page-header">
		<div>
			<h1 class="page-title">{$project.name ?? $project.title}</h1>
			{#if $project.description}<p class="text-muted mb-0">
					{$project.description}
				</p>{/if}
		</div>
		<div class="page-actions">
			<a href="/projects/{$project.id}/edit" class="btn btn-secondary"
				><span class="icon icon-sm">settings</span> Settings</a
			>
		</div>
	</div>

	{#if $views.length}
		<nav class="flex-center gap-2 mb-4" style="flex-wrap:wrap">
			{#each $views as v}
				<a href="/projects/{$project.id}/{v.id}" class="tag"
					>{v.title}</a
				>
			{/each}
		</nav>
	{/if}

	<form onsubmit={quickAdd} class="inline-form mb-4">
		<input
			type="text"
			bind:value={newTaskTitle}
			placeholder="Add a task…"
			class="form-input"
		/>
		<button
			type="submit"
			disabled={addingTask || !newTaskTitle.trim()}
			class="btn btn-primary"
			>{addingTask ? 'Adding…' : 'Add Task'}</button
		>
	</form>

	<div class="filter-controls mb-4">
		<select bind:value={$filterStatus} class="form-select">
			<option value="">All statuses</option>
			<option value="open">Open</option>
			<option value="in_progress">In Progress</option>
			<option value="done">Done</option>
		</select>
		<select bind:value={$filterPriority} class="form-select">
			<option value="">All priorities</option>
			<option value="1">Low</option>
			<option value="2">Medium</option>
			<option value="3">High</option>
			<option value="4">Urgent</option>
			<option value="5">Do Now</option>
		</select>
		{#if $filterStatus || $filterPriority}
			<button
				onclick={() => {
					filterStatus.set('');
					filterPriority.set('');
				}}
				class="btn btn-ghost btn-sm"
			>
				<span class="icon icon-sm">close</span> Clear
			</button>
		{/if}
		<span class="text-xs text-muted" style="margin-left:auto"
			>{$filteredTasks.length} / {$tasks.length} tasks</span
		>
	</div>

	{#if $tasks.length === 0}
		<div class="empty-state">
			<span class="icon">task_alt</span>
			<p>
				No tasks yet. Add one above or <a
					href="/tasks/create?projectId={$project.id}"
					>create with more options</a
				>.
			</p>
		</div>
	{:else if $filteredTasks.length === 0}
		<p class="text-muted">No tasks match the current filters.</p>
	{:else}
		<div class="list">
			{#each $filteredTasks as task}
				<div class="task-row">
					<button
						onclick={() => toggleStatus(task.id, task.status)}
						class="btn btn-ghost btn-icon"
						title="Cycle status: {task.status}"
					>
						<span class="status-dot" data-status={task.status}
						></span>
					</button>
					<a
						href="/tasks/{task.id}"
						class="truncate font-medium"
						style="flex:1;text-decoration:{task.status === 'done'
							? 'line-through'
							: 'none'}">{task.title}</a
					>
					{#if task.priority}
						<span
							class="priority-badge"
							data-priority={task.priority}
							>{PRIORITY_LABELS[task.priority] ??
								task.priority}</span
						>
					{/if}
					{#if task.dueDate}
						<span
							class="text-xs {new Date(task.dueDate) <
								new Date() && task.status !== 'done'
								? 'text-danger'
								: 'text-muted'}"
							>{new Date(task.dueDate).toLocaleDateString()}</span
						>
					{/if}
					<span class="status-badge" data-status={task.status}
						>{task.status?.replace('_', ' ') ?? 'open'}</span
					>
				</div>
			{/each}
		</div>
	{/if}
{:else}
	<p>Project not found.</p>
{/if}
