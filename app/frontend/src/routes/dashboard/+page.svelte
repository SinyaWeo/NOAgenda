<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { apiGetAuth, apiPostAuth } from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { goto } from '$app/navigation';

	const user = writable<any>(null);
	const projects = writable<any[]>([]);
	const upcomingTasks = writable<any[]>([]);
	const overdueTasks = writable<any[]>([]);
	const loading = writable(true);

	let quickTitle = $state('');
	let quickProjectId = $state('');
	let addingTask = $state(false);

	const PRIORITY_LABELS = ['—', 'Low', 'Medium', 'High', 'Urgent', 'Do Now'];
	const STATUS_COLORS: Record<string, string> = {
		open: '#6366f1',
		in_progress: '#f59e0b',
		done: '#22c55e',
	};

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/login');
			return;
		}
		user.set(me);
		await refresh();
	});

	async function refresh() {
		try {
			const [p, t] = await Promise.all([
				apiGetAuth<any[]>('/projects'),
				apiGetAuth<any[]>('/tasks'),
			]);
			projects.set(p.slice(0, 5));
			const now = new Date();
			const pending = t.filter((task: any) => task.status !== 'done');
			overdueTasks.set(
				pending
					.filter(
						(task: any) =>
							task.dueDate && new Date(task.dueDate) < now,
					)
					.sort(
						(a: any, b: any) =>
							new Date(a.dueDate).getTime() -
							new Date(b.dueDate).getTime(),
					)
					.slice(0, 5),
			);
			upcomingTasks.set(
				pending
					.filter(
						(task: any) =>
							!task.dueDate || new Date(task.dueDate) >= now,
					)
					.sort((a: any, b: any) => {
						if (!a.dueDate) return 1;
						if (!b.dueDate) return -1;
						return (
							new Date(a.dueDate).getTime() -
							new Date(b.dueDate).getTime()
						);
					})
					.slice(0, 8),
			);
		} catch (_) {
			// non-critical
		} finally {
			loading.set(false);
		}
	}

	async function quickAddTask() {
		if (!quickTitle.trim() || !quickProjectId) return;
		addingTask = true;
		try {
			await apiPostAuth('/tasks', {
				title: quickTitle,
				project: { id: Number(quickProjectId) },
			});
			quickTitle = '';
			await refresh();
		} catch (_) {
			// non-critical
		} finally {
			addingTask = false;
		}
	}
</script>

{#if $loading}
	<p>Loading…</p>
{:else}
	<h1 style="margin-bottom:0.25rem">
		Welcome{$user?.name
			? `, ${$user.name}`
			: $user?.username
				? `, ${$user.username}`
				: ''}!
	</h1>
	<p class="text-muted" style="margin-top:0;margin-bottom:1.5rem">
		{new Date().toLocaleDateString(undefined, {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		})}
	</p>

	<!-- Stat cards -->
	<div class="stat-grid">
		<div class="stat-card">
			<p class="stat-label">Projects</p>
			<p class="stat-value">{$projects.length}</p>
			<a href="/projects" class="stat-link">View all →</a>
		</div>
		<div class="stat-card">
			<p class="stat-label">Upcoming</p>
			<p class="stat-value">{$upcomingTasks.length}</p>
			<a href="/upcoming" class="stat-link">View all →</a>
		</div>
		{#if $overdueTasks.length > 0}
			<div class="stat-card stat-card-danger">
				<p class="stat-label stat-label-danger">Overdue</p>
				<p class="stat-value stat-value-danger">
					{$overdueTasks.length}
				</p>
				<a href="/upcoming" class="stat-link stat-link-danger"
					>Review →</a
				>
			</div>
		{/if}
	</div>

	<!-- Quick-add task -->
	{#if $projects.length > 0}
		<div class="card mb-4">
			<div class="card-header">
				<h2 class="card-title">Quick Add Task</h2>
			</div>
			<div class="card-body">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						quickAddTask();
					}}
					class="inline-form"
				>
					<input
						type="text"
						bind:value={quickTitle}
						placeholder="Task title…"
						class="form-input"
					/>
					<select bind:value={quickProjectId} class="form-select">
						<option value="">Select project…</option>
						{#each $projects as p}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
					<button
						type="submit"
						disabled={addingTask ||
							!quickTitle.trim() ||
							!quickProjectId}
						class="btn btn-primary"
					>
						{addingTask ? 'Adding…' : '+ Add'}
					</button>
				</form>
			</div>
		</div>
	{/if}

	<div class="dashboard-grid">
		<!-- Overdue tasks -->
		{#if $overdueTasks.length > 0}
			<div class="card" style="border-color:var(--na-danger-border)">
				<div class="card-header">
					<h2 class="card-title text-danger">
						<span class="icon icon-sm">warning</span> Overdue
					</h2>
				</div>
				<div class="card-body">
					{#each $overdueTasks as task}
						<div class="task-row">
							<a href="/tasks/{task.id}" class="truncate"
								>{task.title}</a
							>
							<span class="text-xs text-danger"
								>{new Date(
									task.dueDate,
								).toLocaleDateString()}</span
							>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Upcoming tasks -->
		<div
			class="card"
			class:dashboard-grid-full={$overdueTasks.length === 0}
		>
			<div class="card-header">
				<h2 class="card-title">Upcoming Tasks</h2>
				<a href="/upcoming" class="text-sm">View all →</a>
			</div>
			<div class="card-body">
				{#if $upcomingTasks.length === 0}
					<p class="text-muted mb-0">No pending tasks.</p>
				{:else}
					{#each $upcomingTasks as task}
						<div class="task-row">
							<span class="status-dot" data-status={task.status}
							></span>
							<a href="/tasks/{task.id}" class="truncate"
								>{task.title}</a
							>
							{#if task.dueDate}
								<span class="text-xs text-muted"
									>{new Date(
										task.dueDate,
									).toLocaleDateString()}</span
								>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Recent projects -->
		<div class="card dashboard-grid-full">
			<div class="card-header">
				<h2 class="card-title">Recent Projects</h2>
				<a href="/projects" class="text-sm">View all →</a>
			</div>
			<div class="card-body">
				{#if $projects.length === 0}
					<p class="text-muted mb-0">
						No projects yet. <a href="/projects/new">Create one</a>.
					</p>
				{:else}
					<div class="project-grid">
						{#each $projects as project}
							<a
								href="/projects/{project.id}"
								class="project-card">{project.name}</a
							>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
