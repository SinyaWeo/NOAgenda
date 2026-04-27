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

<div
	style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem"
>
	<h1 style="margin:0">Tasks</h1>
	<a
		href="/tasks/create"
		style="background:#6366f1;color:#fff;padding:0.4rem 1rem;border-radius:4px;text-decoration:none"
		>+ Create Task</a
	>
</div>

<!-- Sort bar -->
<div
	style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center"
>
	<span style="color:#64748b;font-size:0.9rem">Sort:</span>
	{#each [['createdAt', 'Created'], ['dueDate', 'Due Date'], ['priority', 'Priority'], ['title', 'Title'], ['status', 'Status']] as [field, label]}
		<button
			onclick={() => changeSort(field)}
			style="padding:0.3rem 0.75rem;border-radius:4px;border:1px solid #e2e8f0;cursor:pointer;background:{$sort ===
			field
				? '#6366f1'
				: '#fff'};color:{$sort === field
				? '#fff'
				: '#475569'};font-size:0.85rem"
			>{label}{$sort === field
				? $order === 'ASC'
					? ' ↑'
					: ' ↓'
				: ''}</button
		>
	{/each}
</div>

{#if $loading}
	<p>Loading tasks...</p>
{:else if $error}
	<p style="color: red">{$error}</p>
{:else if $tasks.length}
	<div style="display:flex;flex-direction:column;gap:0.4rem">
		{#each $tasks as task}
			{@const isOverdue =
				task.dueDate &&
				new Date(task.dueDate) < new Date() &&
				task.status !== 'done'}
			<div
				style="background:#fff;border:1px solid {isOverdue
					? '#fecaca'
					: '#e2e8f0'};border-radius:8px;padding:0.75rem 1rem;display:flex;align-items:center;gap:0.75rem;box-shadow:0 1px 2px rgba(0,0,0,0.03)"
			>
				<span
					style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:{STATUS_COLORS[
						task.status
					] ?? '#94a3b8'}"
				></span>
				<a
					href="/tasks/{task.id}"
					style="flex:1;font-weight:500;color:{task.status === 'done'
						? '#94a3b8'
						: '#1e293b'};text-decoration:{task.status === 'done'
						? 'line-through'
						: 'none'};font-size:0.95rem">{task.title}</a
				>
				<div
					style="display:flex;gap:0.5rem;align-items:center;flex-shrink:0"
				>
					{#if task.priority && task.priority > 0}
						<span
							style="font-size:0.75rem;font-weight:500;color:{PRIORITY_COLORS[
								task.priority
							]}">{PRIORITY_LABELS[task.priority]}</span
						>
					{/if}
					{#if task.dueDate}
						<span
							style="font-size:0.78rem;color:{isOverdue
								? '#ef4444'
								: '#64748b'}"
							>{isOverdue ? '⚠ ' : ''}{new Date(
								task.dueDate,
							).toLocaleDateString()}</span
						>
					{/if}
					<span
						style="font-size:0.75rem;background:{STATUS_COLORS[
							task.status
						] ?? '#94a3b8'}22;color:{STATUS_COLORS[task.status] ??
							'#64748b'};padding:2px 8px;border-radius:12px"
						>{STATUS_LABELS[task.status] ?? task.status}</span
					>
				</div>
			</div>
		{/each}
	</div>
	<!-- Pagination -->
	<div style="display:flex;gap:0.5rem;margin-top:1rem;align-items:center">
		<button
			onclick={prevPage}
			disabled={$page === 1}
			style="padding:0.3rem 0.75rem;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:#fff"
			>← Prev</button
		>
		<span style="color:#64748b;font-size:0.9rem">Page {$page}</span>
		<button
			onclick={nextPage}
			disabled={!$hasMore}
			style="padding:0.3rem 0.75rem;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:#fff"
			>Next →</button
		>
	</div>
{:else}
	<div style="text-align:center;padding:3rem;color:#64748b">
		<p style="margin:0;font-size:1.1rem">No tasks found.</p>
		<a
			href="/tasks/create"
			style="display:inline-block;margin-top:0.75rem;background:#6366f1;color:#fff;padding:0.4rem 1rem;border-radius:6px;text-decoration:none;font-size:0.9rem"
			>Create a task</a
		>
	</div>
{/if}
