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
	<p>Loading...</p>
{:else if $error}
	<p style="color: red">{$error}</p>
{:else if $project}
	<!-- Header -->
	<div
		style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem"
	>
		<div>
			<h1 style="margin:0">{$project.name ?? $project.title}</h1>
			{#if $project.description}<p
					style="color:#64748b;margin:0.25rem 0 0"
				>
					{$project.description}
				</p>{/if}
		</div>
		<a
			href="/projects/{$project.id}/edit"
			style="font-size:0.85rem;color:#6366f1;white-space:nowrap"
			>⚙ Settings</a
		>
	</div>

	<!-- Views nav -->
	{#if $views.length}
		<nav style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">
			{#each $views as v}
				<a
					href="/projects/{$project.id}/{v.id}"
					style="padding:0.25rem 0.75rem;border:1px solid #e2e8f0;border-radius:16px;font-size:0.85rem;text-decoration:none;color:#475569"
					>{v.title}</a
				>
			{/each}
		</nav>
	{/if}

	<hr style="border:none;border-top:1px solid #e2e8f0;margin:0.75rem 0" />

	<!-- Quick-add task -->
	<form
		onsubmit={quickAdd}
		style="display:flex;gap:0.5rem;margin-bottom:1.25rem"
	>
		<input
			type="text"
			bind:value={newTaskTitle}
			placeholder="Add a task…"
			style="flex:1;padding:0.4rem 0.75rem;border:1px solid #e2e8f0;border-radius:4px"
		/>
		<button
			type="submit"
			disabled={addingTask || !newTaskTitle.trim()}
			style="background:#6366f1;color:#fff;border:none;padding:0.4rem 1rem;border-radius:4px;cursor:pointer"
			>{addingTask ? 'Adding…' : '+ Add Task'}</button
		>
	</form>

	<!-- Filters -->
	<div
		style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center"
	>
		<select
			bind:value={$filterStatus}
			style="padding:0.3rem 0.6rem;border:1px solid #e2e8f0;border-radius:4px;font-size:0.85rem;color:#374151"
		>
			<option value="">All statuses</option>
			<option value="open">Open</option>
			<option value="in_progress">In Progress</option>
			<option value="done">Done</option>
		</select>
		<select
			bind:value={$filterPriority}
			style="padding:0.3rem 0.6rem;border:1px solid #e2e8f0;border-radius:4px;font-size:0.85rem;color:#374151"
		>
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
				style="font-size:0.8rem;color:#6b7280;background:none;border:none;cursor:pointer;padding:0"
				>✕ Clear filters</button
			>
		{/if}
		<span style="font-size:0.8rem;color:#94a3b8;margin-left:auto"
			>{$filteredTasks.length} / {$tasks.length} tasks</span
		>
	</div>

	<!-- Task list -->
	{#if $tasks.length === 0}
		<p style="color:#64748b">
			No tasks yet. Add one above or <a
				href="/tasks/create?projectId={$project.id}"
				>create with more options</a
			>.
		</p>
	{:else if $filteredTasks.length === 0}
		<p style="color:#94a3b8">No tasks match the current filters.</p>
	{:else}
		<div style="display:flex;flex-direction:column;gap:0.5rem">
			{#each $filteredTasks as task}
				<div
					style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;background:#fff"
				>
					<!-- Status toggle button -->
					<button
						onclick={() => toggleStatus(task.id, task.status)}
						style="width:18px;height:18px;border-radius:50%;border:2px solid {STATUS_COLORS[
							task.status
						] ?? '#94a3b8'};background:{task.status === 'done'
							? STATUS_COLORS.done
							: 'transparent'};cursor:pointer;flex-shrink:0"
						title="Cycle status: {task.status}"
					></button>
					<!-- Title -->
					<a
						href="/tasks/{task.id}"
						style="flex:1;font-weight:500;color:{task.status ===
						'done'
							? '#94a3b8'
							: '#1e293b'};text-decoration:{task.status === 'done'
							? 'line-through'
							: 'none'}">{task.title}</a
					>
					<!-- Priority badge -->
					{#if task.priority}
						<span
							style="font-size:0.75rem;padding:1px 7px;border-radius:10px;background:#f1f5f9;color:#475569"
							>{PRIORITY_LABELS[task.priority] ??
								task.priority}</span
						>
					{/if}
					<!-- Due date -->
					{#if task.dueDate}
						<span
							style="font-size:0.75rem;color:{new Date(
								task.dueDate,
							) < new Date() && task.status !== 'done'
								? '#ef4444'
								: '#64748b'}"
							>{new Date(task.dueDate).toLocaleDateString()}</span
						>
					{/if}
					<!-- Status pill -->
					<span
						style="font-size:0.72rem;padding:1px 8px;border-radius:10px;background:{STATUS_COLORS[
							task.status
						] ?? '#e2e8f0'}22;color:{STATUS_COLORS[task.status] ??
							'#64748b'};border:1px solid {STATUS_COLORS[
							task.status
						] ?? '#e2e8f0'}44"
						>{task.status?.replace('_', ' ') ?? 'open'}</span
					>
				</div>
			{/each}
		</div>
	{/if}
{:else}
	<p>Project not found.</p>
{/if}
