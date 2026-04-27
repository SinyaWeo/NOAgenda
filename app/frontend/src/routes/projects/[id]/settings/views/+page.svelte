<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    const views = writable<any[]>([]);
    const loading = writable(true);
    const error = writable('');
    let newViewTitle = '';
    let newViewType = 'list';

    async function load() {
        views.set(
            await apiGetAuth<any[]>(`/projects/${$page.params.id}/views`),
        );
    }

    async function addView(e: Event) {
        e.preventDefault();
        try {
            await apiPostAuth(`/projects/${$page.params.id}/views`, {
                title: newViewTitle,
                viewType: newViewType,
            });
            newViewTitle = '';
            await load();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    async function deleteView(viewId: number) {
        try {
            await apiDeleteAuth(`/projects/${$page.params.id}/views/${viewId}`);
            await load();
        } catch (e: any) {
            error.set(e.message);
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

<div style="max-width:560px">
    <div
        style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"
    >
        <a
            href="/projects/{$page.params.id}"
            style="color:#6b7280;text-decoration:none;font-size:1.2rem"
            >&#8592;</a
        >
        <h1 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0">
            Project Views
        </h1>
    </div>

    {#if $error}
        <div
            style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.875rem"
        >
            {$error}
        </div>
    {/if}

    <div
        style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem;margin-bottom:1.25rem"
    >
        <h2
            style="font-size:0.95rem;font-weight:600;color:#374151;margin:0 0 1rem"
        >
            Add View
        </h2>
        <form
            onsubmit={addView}
            style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end"
        >
            <div style="flex:1;min-width:150px">
                <label
                    for="view-title"
                    style="display:block;font-size:0.8rem;font-weight:500;color:#374151;margin-bottom:0.25rem"
                    >View Name</label
                >
                <input
                    id="view-title"
                    type="text"
                    bind:value={newViewTitle}
                    placeholder="e.g. My Board"
                    required
                    style="width:100%;padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;box-sizing:border-box"
                />
            </div>
            <div>
                <label
                    for="view-type"
                    style="display:block;font-size:0.8rem;font-weight:500;color:#374151;margin-bottom:0.25rem"
                    >Type</label
                >
                <select
                    id="view-type"
                    bind:value={newViewType}
                    style="padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;background:#fff"
                >
                    <option value="list">List</option>
                    <option value="kanban">Kanban</option>
                    <option value="gantt">Gantt</option>
                    <option value="table">Table</option>
                </select>
            </div>
            <button
                type="submit"
                style="padding:0.55rem 1rem;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:0.9rem;cursor:pointer"
                >Add</button
            >
        </form>
    </div>

    {#if $loading}
        <p style="color:#64748b">Loading…</p>
    {:else if $views.length}
        <div style="display:flex;flex-direction:column;gap:0.6rem">
            {#each $views as view}
                <div
                    style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem 1rem;display:flex;justify-content:space-between;align-items:center"
                >
                    <a
                        href="/projects/{$page.params.id}/{view.id}"
                        style="font-size:0.9rem;font-weight:500;color:#1e293b;text-decoration:none"
                    >
                        {view.title}
                        <span
                            style="font-size:0.8rem;color:#94a3b8;font-weight:400"
                            >{view.viewType}</span
                        >
                    </a>
                    <button
                        onclick={() => deleteView(view.id)}
                        style="padding:0.3rem 0.7rem;background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;border-radius:5px;cursor:pointer;font-size:0.8rem"
                        >Delete</button
                    >
                </div>
            {/each}
        </div>
    {:else}
        <div
            style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:2rem;text-align:center"
        >
            <p style="color:#94a3b8;margin:0">No views yet. Add one above.</p>
        </div>
    {/if}
</div>
