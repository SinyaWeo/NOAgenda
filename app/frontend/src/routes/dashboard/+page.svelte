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

	let quickTitle = '';
	let quickProjectId = '';
	let addingTask = false;

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
	<p style="color:#64748b;margin-top:0;margin-bottom:1.5rem">
		{new Date().toLocaleDateString(undefined, {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		})}
	</p>

	<!-- Stat cards -->
	<div
		style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem;margin-bottom:1.75rem"
	>
		<div
			style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)"
		>
			<p
				style="margin:0;font-size:0.8rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em"
			>
				Projects
			</p>
			<p
				style="margin:0.25rem 0 0;font-size:1.75rem;font-weight:700;color:#1e293b"
			>
				{$projects.length}
			</p>
			<a href="/projects" style="font-size:0.8rem;color:#6366f1"
				>View all →</a
			>
		</div>
		<div
			style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)"
		>
			<p
				style="margin:0;font-size:0.8rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em"
			>
				Upcoming
			</p>
			<p
				style="margin:0.25rem 0 0;font-size:1.75rem;font-weight:700;color:#1e293b"
			>
				{$upcomingTasks.length}
			</p>
			<a href="/upcoming" style="font-size:0.8rem;color:#6366f1"
				>View all →</a
			>
		</div>
		{#if $overdueTasks.length > 0}
			<div
				style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)"
			>
				<p
					style="margin:0;font-size:0.8rem;color:#b91c1c;text-transform:uppercase;letter-spacing:0.05em"
				>
					Overdue
				</p>
				<p
					style="margin:0.25rem 0 0;font-size:1.75rem;font-weight:700;color:#b91c1c"
				>
					{$overdueTasks.length}
				</p>
				<a href="/upcoming" style="font-size:0.8rem;color:#dc2626"
					>Review →</a
				>
			</div>
		{/if}
	</div>

	<!-- Quick-add task -->
	{#if $projects.length > 0}
		<section
			style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem"
		>
			<h2 style="margin:0 0 0.75rem;font-size:1rem">Quick Add Task</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					quickAddTask();
				}}
				style="display:flex;gap:0.5rem;flex-wrap:wrap"
			>
				<input
					type="text"
					bind:value={quickTitle}
					placeholder="Task title…"
					style="flex:1;min-width:180px;padding:0.4rem 0.75rem;border:1px solid #e2e8f0;border-radius:4px"
				/>
				<select
					bind:value={quickProjectId}
					style="padding:0.4rem 0.75rem;border:1px solid #e2e8f0;border-radius:4px"
				>
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
					style="background:#6366f1;color:#fff;border:none;padding:0.4rem 1rem;border-radius:4px;cursor:pointer"
					>{addingTask ? 'Adding…' : '+ Add'}</button
				>
			</form>
		</section>
	{/if}

	<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
		<!-- Overdue tasks -->
		{#if $overdueTasks.length > 0}
			<section
				style="background:#fff;border:1px solid #fecaca;border-radius:8px;padding:1.25rem"
			>
				<h2 style="margin:0 0 0.75rem;font-size:1rem;color:#b91c1c">
					⚠ Overdue
				</h2>
				<div style="display:flex;flex-direction:column;gap:0.4rem">
					{#each $overdueTasks as task}
						<div
							style="display:flex;justify-content:space-between;align-items:center"
						>
							<a
								href="/tasks/{task.id}"
								style="color:#1e293b;font-size:0.9rem"
								>{task.title}</a
							>
							<span
								style="font-size:0.75rem;color:#ef4444;white-space:nowrap;margin-left:0.5rem"
								>{new Date(
									task.dueDate,
								).toLocaleDateString()}</span
							>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Upcoming tasks -->
		<section
			style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;{$overdueTasks.length >
			0
				? ''
				: 'grid-column:1/-1'}"
		>
			<div
				style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem"
			>
				<h2 style="margin:0;font-size:1rem">Upcoming Tasks</h2>
				<a href="/upcoming" style="font-size:0.8rem;color:#6366f1"
					>View all →</a
				>
			</div>
			{#if $upcomingTasks.length === 0}
				<p style="color:#64748b;margin:0">No pending tasks.</p>
			{:else}
				<div style="display:flex;flex-direction:column;gap:0.4rem">
					{#each $upcomingTasks as task}
						<div
							style="display:flex;justify-content:space-between;align-items:center;padding:0.35rem 0;border-bottom:1px solid #f1f5f9"
						>
							<div
								style="display:flex;align-items:center;gap:0.5rem;min-width:0"
							>
								<span
									style="width:8px;height:8px;border-radius:50%;background:{STATUS_COLORS[
										task.status
									] ?? '#94a3b8'};flex-shrink:0"
								></span>
								<a
									href="/tasks/{task.id}"
									style="color:#1e293b;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
									>{task.title}</a
								>
							</div>
							{#if task.dueDate}
								<span
									style="font-size:0.75rem;color:#64748b;white-space:nowrap;margin-left:0.5rem"
									>{new Date(
										task.dueDate,
									).toLocaleDateString()}</span
								>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Recent projects -->
		<section
			style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;grid-column:1/-1"
		>
			<div
				style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem"
			>
				<h2 style="margin:0;font-size:1rem">Recent Projects</h2>
				<a href="/projects" style="font-size:0.8rem;color:#6366f1"
					>View all →</a
				>
			</div>
			{#if $projects.length === 0}
				<p style="color:#64748b;margin:0">
					No projects yet. <a href="/projects/new">Create one</a>.
				</p>
			{:else}
				<div
					style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem"
				>
					{#each $projects as project}
						<a
							href="/projects/{project.id}"
							style="display:block;padding:0.75rem;border:1px solid #e2e8f0;border-radius:6px;text-decoration:none;color:#1e293b;font-weight:500;background:#f8fafc"
						>
							{project.name}
						</a>
					{/each}
				</div>
			{/if}
		</section>
	</div>
{/if}
