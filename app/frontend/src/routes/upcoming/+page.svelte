<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';

    const tasks = writable<any[]>([]);
    const loading = writable(true);
    const error = writable('');

    let showOverdue = $state(false);
    let daysAhead = $state(7);

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
    const PRIORITY_LABELS = ['—', 'Low', 'Medium', 'High', 'Urgent', 'Do Now'];
    const PRIORITY_COLORS = [
        '',
        '#6366f1',
        '#06b6d4',
        '#f59e0b',
        '#f97316',
        '#ef4444',
    ];

    async function loadTasks() {
        loading.set(true);
        try {
            const all = await apiGetAuth<any[]>('/tasks');
            const now = new Date();
            const cutoff = new Date(
                now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
            );

            const filtered = all
                .filter((t: any) => {
                    if (t.status === 'done') return false;
                    if (!t.dueDate) return false;
                    const due = new Date(t.dueDate);
                    if (showOverdue && due < now) return true;
                    return due <= cutoff;
                })
                .sort(
                    (a: any, b: any) =>
                        new Date(a.dueDate).getTime() -
                        new Date(b.dueDate).getTime(),
                );

            tasks.set(filtered);
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
</script>

<div
    style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem"
>
    <h1 style="margin:0">Upcoming Tasks</h1>
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
        <label
            style="display:flex;align-items:center;gap:0.4rem;font-size:0.9rem;color:#475569"
        >
            Show next
            <select
                bind:value={daysAhead}
                onchange={loadTasks}
                style="padding:0.3rem 0.5rem;border:1px solid #e2e8f0;border-radius:4px;background:#fff"
            >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
            </select>
        </label>
        <label
            style="display:flex;align-items:center;gap:0.4rem;font-size:0.9rem;color:#475569;cursor:pointer"
        >
            <input
                type="checkbox"
                bind:checked={showOverdue}
                onchange={loadTasks}
            />
            Include overdue
        </label>
    </div>
</div>

{#if $loading}
    <p>Loading…</p>
{:else if $error}
    <p style="color:red">{$error}</p>
{:else if $tasks.length === 0}
    <div style="text-align:center;padding:3rem;color:#64748b">
        <p style="margin:0;font-size:1.1rem">
            No upcoming tasks in this range.
        </p>
        <p style="margin:0.5rem 0 0;font-size:0.9rem">
            Try extending the date range or enabling overdue tasks.
        </p>
    </div>
{:else}
    <div style="display:flex;flex-direction:column;gap:0.5rem">
        {#each $tasks as task}
            {@const due = new Date(task.dueDate)}
            {@const isOverdue = due < new Date()}
            <div
                style="background:#fff;border:1px solid {isOverdue
                    ? '#fecaca'
                    : '#e2e8f0'};border-radius:8px;padding:0.875rem 1rem;display:flex;align-items:center;gap:0.75rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)"
            >
                <span
                    style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:{STATUS_COLORS[
                        task.status
                    ] ?? '#94a3b8'}"
                ></span>
                <div style="flex:1;min-width:0">
                    <a
                        href="/tasks/{task.id}"
                        style="font-weight:500;color:#1e293b;text-decoration:none;font-size:0.95rem"
                        >{task.title}</a
                    >
                    {#if task.project?.name}
                        <span
                            style="margin-left:0.5rem;font-size:0.78rem;color:#94a3b8"
                            >{task.project.name}</span
                        >
                    {/if}
                </div>
                <div
                    style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0"
                >
                    {#if task.priority && task.priority > 0}
                        <span
                            style="font-size:0.75rem;font-weight:500;color:{PRIORITY_COLORS[
                                task.priority
                            ]}">{PRIORITY_LABELS[task.priority]}</span
                        >
                    {/if}
                    <span
                        style="font-size:0.8rem;font-weight:500;color:{isOverdue
                            ? '#ef4444'
                            : '#64748b'}"
                    >
                        {isOverdue ? '⚠ ' : ''}{due.toLocaleDateString()}
                    </span>
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
{/if}
