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

<div class="page-header">
    <h1 class="page-title">Upcoming Tasks</h1>
    <div class="filter-controls">
        <label class="filter-label">
            Show next
            <select
                bind:value={daysAhead}
                onchange={loadTasks}
                class="form-select"
                style="width:auto"
            >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
            </select>
        </label>
        <label class="filter-label">
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
    <div class="alert alert-error">{$error}</div>
{:else if $tasks.length === 0}
    <div class="empty-state">
        <span class="icon">event</span>
        <p>No upcoming tasks in this range.</p>
        <p class="text-sm">
            Try extending the date range or enabling overdue tasks.
        </p>
    </div>
{:else}
    <div class="list" style="gap:0.5rem">
        {#each $tasks as task}
            {@const due = new Date(task.dueDate)}
            {@const isOverdue = due < new Date()}
            <div class="upcoming-item" class:upcoming-item-overdue={isOverdue}>
                <span class="status-dot" data-status={task.status}></span>
                <div style="flex:1;min-width:0">
                    <a href="/tasks/{task.id}" class="font-medium"
                        >{task.title}</a
                    >
                    {#if task.project?.name}
                        <span class="text-xs text-muted"
                            >{task.project.name}</span
                        >
                    {/if}
                </div>
                <div class="flex-center gap-2">
                    {#if task.priority && task.priority > 0}
                        <span
                            class="priority-text"
                            data-priority={task.priority}
                            >{PRIORITY_LABELS[task.priority]}</span
                        >
                    {/if}
                    <span class="text-sm" class:text-danger={isOverdue}>
                        {isOverdue ? '⚠ ' : ''}{due.toLocaleDateString()}
                    </span>
                    <span class="status-badge" data-status={task.status}
                        >{STATUS_LABELS[task.status] ?? task.status}</span
                    >
                </div>
            </div>
        {/each}
    </div>
{/if}
