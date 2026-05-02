<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import {
        apiGetAuth,
        apiPostAuth,
        apiPutAuth,
        apiDeleteAuth,
    } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    const view = writable<any>(null);
    const tasks = writable<any[]>([]);
    const buckets = writable<any[]>([]);
    const loading = writable(true);
    const error = writable('');

    async function moveTaskToBucket(taskId: number, bucketId: number) {
        try {
            const updated = await apiPutAuth<any>(`/tasks/${taskId}`, {
                bucketId,
            });
            tasks.update((list) =>
                list.map((t) => (t.id === taskId ? updated : t)),
            );
        } catch (e: any) {
            // non-critical — silently ignore
        }
    }

    async function load() {
        const { id, viewId } = $page.params;
        const [v, t] = await Promise.all([
            apiGetAuth<any>(`/projects/${id}/views/${viewId}`),
            apiGetAuth<any[]>(`/tasks?projectId=${id}`),
        ]);
        view.set(v);
        tasks.set(t);
        if (v.viewType === 'kanban') {
            buckets.set(
                await apiGetAuth<any[]>(
                    `/projects/${id}/views/${viewId}/buckets`,
                ),
            );
        }
    }

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
            return;
        }
        try {
            await load();
        } catch (e: any) {
            error.set(e.message);
        } finally {
            loading.set(false);
        }
    });
</script>

{#if $loading}
	<p class="text-muted">Loading…</p>
{:else if $error}
	<div class="alert alert-error">{$error}</div>
{:else if $view}
	<div class="page-header">
		<a href="/projects/{$page.params.id}" class="back-link"><span class="icon icon-sm">arrow_back</span></a>
		<div>
			<h1 class="page-title">{$view.title} <span class="tag" style="font-size:0.8rem">{$view.viewType}</span></h1>
		</div>
		<div class="page-actions">
			<a href="/projects/{$page.params.id}/settings/views" class="btn btn-ghost btn-sm">Manage views</a>
		</div>
	</div>

	{#if $view.viewType === 'list'}
		{#if $tasks.length}
			<div class="list card">
				{#each $tasks as task}
					<div class="list-item">
						<div class="list-item-body">
							<a href="/tasks/{task.id}" class="font-medium">{task.title}</a>
						</div>
						<span class="status-badge" data-status={task.status}>{task.status ?? 'open'}</span>
						{#if task.dueDate}
							<span class="text-xs {new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-danger' : 'text-muted'}">{new Date(task.dueDate).toLocaleDateString()}</span>
						{/if}
						<span class="priority-badge" data-priority={task.priority ?? 0}>{['', 'Low', 'Med', 'High', 'Urgent', 'Now'][task.priority] ?? ''}</span>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state"><span class="icon">task_alt</span><p>No tasks in this project yet.</p></div>
		{/if}

	{:else if $view.viewType === 'kanban'}
		{#if $buckets.length}
			<div class="flex-center gap-3" style="align-items:flex-start;overflow-x:auto;padding-bottom:0.5rem">
				{#each $buckets as bucket}
					<div class="card" style="min-width:260px;flex-shrink:0">
						<div class="card-header"><h3 class="card-title" style="text-transform:uppercase;font-size:0.85rem;letter-spacing:0.04em">{bucket.title}</h3></div>
						<div class="card-body">
							{#each $tasks.filter((t: any) => t.bucketId === bucket.id) as task}
								<div class="card mb-2">
									<div class="card-body" style="padding:0.6rem 0.75rem">
										<a href="/tasks/{task.id}" class="font-medium text-sm" style="display:block">{task.title}</a>
										{#if task.dueDate}<div class="text-xs text-muted">{new Date(task.dueDate).toLocaleDateString()}</div>{/if}
										<select value={task.bucketId} onchange={(e) => moveTaskToBucket(task.id, Number((e.target as HTMLSelectElement).value))} class="form-select" style="margin-top:0.4rem;font-size:0.75rem;padding:2px 4px">
											{#each $buckets as b}<option value={b.id}>{b.title}</option>{/each}
										</select>
									</div>
								</div>
							{/each}
							{#if !$tasks.filter((t: any) => t.bucketId === bucket.id).length}
								<p class="text-xs text-muted text-center mb-0">Empty</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state"><span class="icon">view_kanban</span><p>No buckets configured for this kanban view.</p></div>
		{/if}

	{:else if $view.viewType === 'table'}
		{#if $tasks.length}
			<div class="card" style="overflow:auto">
				<table style="width:100%;border-collapse:collapse;font-size:0.875rem">
					<thead>
						<tr style="background:var(--na-surface-alt,#f8fafc);border-bottom:1px solid var(--na-border,#e2e8f0)">
							<th style="padding:0.65rem 1rem;text-align:left;font-weight:600;font-size:0.8rem">#</th>
							<th style="padding:0.65rem 1rem;text-align:left;font-weight:600;font-size:0.8rem">Title</th>
							<th style="padding:0.65rem 1rem;text-align:left;font-weight:600;font-size:0.8rem">Status</th>
							<th style="padding:0.65rem 1rem;text-align:left;font-weight:600;font-size:0.8rem">Priority</th>
							<th style="padding:0.65rem 1rem;text-align:left;font-weight:600;font-size:0.8rem">Due Date</th>
							<th style="padding:0.65rem 1rem;text-align:left;font-weight:600;font-size:0.8rem">Created</th>
						</tr>
					</thead>
					<tbody>
						{#each $tasks as task, i}
							<tr style="border-top:{i > 0 ? '1px solid var(--na-border,#f1f5f9)' : 'none'}">
								<td style="padding:0.6rem 1rem" class="text-muted">{task.id}</td>
								<td style="padding:0.6rem 1rem"><a href="/tasks/{task.id}" class="font-medium" style="text-decoration:none;color:inherit">{task.title}</a></td>
								<td style="padding:0.6rem 1rem"><span class="status-badge" data-status={task.status}>{task.status ?? '—'}</span></td>
								<td style="padding:0.6rem 1rem" class="text-muted">{['—', 'Low', 'Med', 'High', 'Urgent', 'Now'][task.priority] ?? '—'}</td>
								<td style="padding:0.6rem 1rem" class="{task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-danger' : 'text-muted'}">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</td>
								<td style="padding:0.6rem 1rem" class="text-muted">{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="empty-state"><span class="icon">table_chart</span><p>No tasks to display.</p></div>
		{/if}

	{:else if $view.viewType === 'gantt'}
		{#if $tasks.filter((t: any) => t.dueDate).length}
			<div class="list card">
				{#each $tasks.filter((t: any) => t.dueDate).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) as task}
					<div class="list-item">
						<span class="status-dot" data-status={new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'overdue' : task.status}></span>
						<div class="list-item-body">
							<a href="/tasks/{task.id}" class="font-medium">{task.title}</a>
						</div>
						<span class="text-sm {new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-danger' : 'text-muted'}" style="white-space:nowrap">{new Date(task.dueDate).toLocaleDateString()}</span>
						<span class="status-badge" data-status={task.status}>{task.status ?? 'open'}</span>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state"><span class="icon">calendar_month</span><p>No tasks with due dates to display on the timeline.</p></div>
		{/if}

	{:else}
		<p class="text-muted">Unknown view type: {$view.viewType}</p>
	{/if}
{/if}
