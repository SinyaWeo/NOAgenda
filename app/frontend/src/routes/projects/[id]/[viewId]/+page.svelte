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
    <p style="color:#64748b">Loading…</p>
{:else if $error}
    <div
        style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;padding:0.75rem 1rem;border-radius:6px;font-size:0.875rem"
    >
        {$error}
    </div>
{:else if $view}
    <!-- Header -->
    <div
        style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.5rem"
    >
        <div style="display:flex;align-items:center;gap:0.75rem">
            <a
                href="/projects/{$page.params.id}"
                style="color:#6b7280;text-decoration:none;font-size:1.2rem"
                >&#8592;</a
            >
            <h1
                style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0"
            >
                {$view.title}
            </h1>
            <span
                style="font-size:0.8rem;background:#e0e7ff;color:#4f46e5;border-radius:4px;padding:2px 8px;font-weight:500"
                >{$view.viewType}</span
            >
        </div>
        <a
            href="/projects/{$page.params.id}/settings/views"
            style="font-size:0.8rem;color:#94a3b8;text-decoration:none"
            >Manage views</a
        >
    </div>

    {#if $view.viewType === 'list'}
        <!-- List View -->
        {#if $tasks.length}
            <div
                style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden"
            >
                {#each $tasks as task, i}
                    <div
                        style="display:grid;grid-template-columns:1fr auto auto auto;gap:0.75rem;align-items:center;padding:0.75rem 1rem;{i >
                        0
                            ? 'border-top:1px solid #f1f5f9'
                            : ''}"
                    >
                        <a
                            href="/tasks/{task.id}"
                            style="font-size:0.9rem;font-weight:500;color:#1e293b;text-decoration:none"
                            >{task.title}</a
                        >
                        <span
                            style="font-size:0.78rem;background:{task.status ===
                            'done'
                                ? '#dcfce7'
                                : task.status === 'in_progress'
                                  ? '#dbeafe'
                                  : '#f1f5f9'};color:{task.status === 'done'
                                ? '#166534'
                                : task.status === 'in_progress'
                                  ? '#1d4ed8'
                                  : '#64748b'};border-radius:4px;padding:2px 7px;white-space:nowrap"
                            >{task.status ?? 'open'}</span
                        >
                        <span
                            style="font-size:0.78rem;color:{task.dueDate &&
                            new Date(task.dueDate) < new Date() &&
                            task.status !== 'done'
                                ? '#ef4444'
                                : '#94a3b8'}"
                        >
                            {task.dueDate
                                ? new Date(task.dueDate).toLocaleDateString()
                                : ''}
                        </span>
                        <span style="font-size:0.78rem;color:#94a3b8"
                            >{['', 'Low', 'Med', 'High', 'Urgent', 'Now'][
                                task.priority
                            ] ?? ''}</span
                        >
                    </div>
                {/each}
            </div>
        {:else}
            <div
                style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:2.5rem;text-align:center"
            >
                <p style="color:#94a3b8;margin:0">
                    No tasks in this project yet.
                </p>
            </div>
        {/if}
    {:else if $view.viewType === 'kanban'}
        <!-- Kanban View -->
        {#if $buckets.length}
            <div
                style="display:flex;gap:1rem;overflow-x:auto;padding-bottom:0.5rem"
            >
                {#each $buckets as bucket}
                    <div
                        style="min-width:260px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.9rem;flex-shrink:0"
                    >
                        <h3
                            style="font-size:0.9rem;font-weight:600;color:#374151;margin:0 0 0.75rem;text-transform:uppercase;letter-spacing:0.04em"
                        >
                            {bucket.title}
                        </h3>
                        {#each $tasks.filter((t: any) => t.bucketId === bucket.id) as task}
                            <div
                                style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:0.6rem 0.75rem;margin-bottom:0.5rem;box-shadow:0 1px 2px rgba(0,0,0,0.05)"
                            >
                                <a
                                    href="/tasks/{task.id}"
                                    style="display:block;font-size:0.875rem;font-weight:500;color:#1e293b;text-decoration:none"
                                >
                                    {task.title}
                                </a>
                                {#if task.dueDate}<div
                                        style="font-size:0.75rem;color:#94a3b8;margin-top:0.2rem"
                                    >
                                        {new Date(
                                            task.dueDate,
                                        ).toLocaleDateString()}
                                    </div>{/if}
                                <select
                                    value={task.bucketId}
                                    onchange={(e) =>
                                        moveTaskToBucket(
                                            task.id,
                                            Number(
                                                (e.target as HTMLSelectElement)
                                                    .value,
                                            ),
                                        )}
                                    style="margin-top:0.4rem;font-size:0.75rem;border:1px solid #e2e8f0;border-radius:4px;padding:1px 4px;color:#64748b;width:100%"
                                >
                                    {#each $buckets as b}
                                        <option value={b.id}>{b.title}</option>
                                    {/each}
                                </select>
                            </div>
                        {/each}
                        {#if !$tasks.filter((t: any) => t.bucketId === bucket.id).length}
                            <p
                                style="font-size:0.8rem;color:#94a3b8;margin:0;text-align:center;padding:0.5rem"
                            >
                                Empty
                            </p>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else}
            <div
                style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:2rem;text-align:center"
            >
                <p style="color:#94a3b8;margin:0">
                    No buckets configured for this kanban view.
                </p>
            </div>
        {/if}
    {:else if $view.viewType === 'table'}
        <!-- Table View -->
        {#if $tasks.length}
            <div
                style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:auto"
            >
                <table
                    style="width:100%;border-collapse:collapse;font-size:0.875rem"
                >
                    <thead>
                        <tr
                            style="background:#f8fafc;border-bottom:1px solid #e2e8f0"
                        >
                            <th
                                style="padding:0.65rem 1rem;text-align:left;font-weight:600;color:#374151;font-size:0.8rem"
                                >#</th
                            >
                            <th
                                style="padding:0.65rem 1rem;text-align:left;font-weight:600;color:#374151;font-size:0.8rem"
                                >Title</th
                            >
                            <th
                                style="padding:0.65rem 1rem;text-align:left;font-weight:600;color:#374151;font-size:0.8rem"
                                >Status</th
                            >
                            <th
                                style="padding:0.65rem 1rem;text-align:left;font-weight:600;color:#374151;font-size:0.8rem"
                                >Priority</th
                            >
                            <th
                                style="padding:0.65rem 1rem;text-align:left;font-weight:600;color:#374151;font-size:0.8rem"
                                >Due Date</th
                            >
                            <th
                                style="padding:0.65rem 1rem;text-align:left;font-weight:600;color:#374151;font-size:0.8rem"
                                >Created</th
                            >
                        </tr>
                    </thead>
                    <tbody>
                        {#each $tasks as task, i}
                            <tr
                                style="border-top:{i > 0
                                    ? '1px solid #f1f5f9'
                                    : 'none'}"
                            >
                                <td style="padding:0.6rem 1rem;color:#94a3b8"
                                    >{task.id}</td
                                >
                                <td style="padding:0.6rem 1rem"
                                    ><a
                                        href="/tasks/{task.id}"
                                        style="color:#1e293b;text-decoration:none;font-weight:500"
                                        >{task.title}</a
                                    ></td
                                >
                                <td style="padding:0.6rem 1rem;color:#64748b"
                                    >{task.status ?? '—'}</td
                                >
                                <td style="padding:0.6rem 1rem;color:#64748b"
                                    >{[
                                        '—',
                                        'Low',
                                        'Med',
                                        'High',
                                        'Urgent',
                                        'Now',
                                    ][task.priority] ?? '—'}</td
                                >
                                <td
                                    style="padding:0.6rem 1rem;color:{task.dueDate &&
                                    new Date(task.dueDate) < new Date() &&
                                    task.status !== 'done'
                                        ? '#ef4444'
                                        : '#64748b'}"
                                    >{task.dueDate
                                        ? new Date(
                                              task.dueDate,
                                          ).toLocaleDateString()
                                        : '—'}</td
                                >
                                <td style="padding:0.6rem 1rem;color:#94a3b8"
                                    >{task.createdAt
                                        ? new Date(
                                              task.createdAt,
                                          ).toLocaleDateString()
                                        : '—'}</td
                                >
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {:else}
            <div
                style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:2.5rem;text-align:center"
            >
                <p style="color:#94a3b8;margin:0">No tasks to display.</p>
            </div>
        {/if}
    {:else if $view.viewType === 'gantt'}
        <!-- Gantt View (timeline) -->
        {#if $tasks.filter((t: any) => t.dueDate).length}
            <div
                style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden"
            >
                {#each $tasks
                    .filter((t: any) => t.dueDate)
                    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) as task, i}
                    <div
                        style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;{i >
                        0
                            ? 'border-top:1px solid #f1f5f9'
                            : ''}"
                    >
                        <div
                            style="width:28px;height:28px;border-radius:50%;background:{new Date(
                                task.dueDate,
                            ) < new Date() && task.status !== 'done'
                                ? '#fef2f2'
                                : '#f0fdf4'};border:1px solid {new Date(
                                task.dueDate,
                            ) < new Date() && task.status !== 'done'
                                ? '#fca5a5'
                                : '#86efac'};flex-shrink:0"
                        ></div>
                        <a
                            href="/tasks/{task.id}"
                            style="flex:1;font-size:0.875rem;font-weight:500;color:#1e293b;text-decoration:none"
                            >{task.title}</a
                        >
                        <span
                            style="font-size:0.8rem;color:{new Date(
                                task.dueDate,
                            ) < new Date() && task.status !== 'done'
                                ? '#ef4444'
                                : '#64748b'};white-space:nowrap"
                            >{new Date(task.dueDate).toLocaleDateString()}</span
                        >
                        <span
                            style="font-size:0.78rem;background:{task.status ===
                            'done'
                                ? '#dcfce7'
                                : '#f1f5f9'};color:{task.status === 'done'
                                ? '#166534'
                                : '#64748b'};border-radius:4px;padding:2px 6px"
                            >{task.status ?? 'open'}</span
                        >
                    </div>
                {/each}
            </div>
        {:else}
            <div
                style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:2rem;text-align:center"
            >
                <p style="color:#94a3b8;margin:0">
                    No tasks with due dates to display on the timeline.
                </p>
            </div>
        {/if}
    {:else}
        <p style="color:#64748b">Unknown view type: {$view.viewType}</p>
    {/if}
{/if}
