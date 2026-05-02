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

<div class="page-header">
    <a href="/projects/{$page.params.id}" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">Project Views</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}

<div class="card mb-4">
    <div class="card-header"><h2 class="card-title">Add View</h2></div>
    <div class="card-body">
        <form onsubmit={addView} class="inline-form">
            <div class="form-group" style="flex:1;min-width:150px">
                <label for="view-title" class="form-label">View Name</label>
                <input
                    id="view-title"
                    type="text"
                    bind:value={newViewTitle}
                    placeholder="e.g. My Board"
                    required
                    class="form-input"
                />
            </div>
            <div class="form-group">
                <label for="view-type" class="form-label">Type</label>
                <select
                    id="view-type"
                    bind:value={newViewType}
                    class="form-select"
                >
                    <option value="list">List</option>
                    <option value="kanban">Kanban</option>
                    <option value="gantt">Gantt</option>
                    <option value="table">Table</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Add</button>
        </form>
    </div>
</div>

{#if $loading}
    <p class="text-muted">Loading…</p>
{:else if $views.length}
    <div class="list card">
        {#each $views as view}
            <div class="list-item">
                <div class="list-item-body">
                    <a
                        href="/projects/{$page.params.id}/{view.id}"
                        class="font-medium">{view.title}</a
                    >
                    <span class="text-xs text-muted">{view.viewType}</span>
                </div>
                <button
                    onclick={() => deleteView(view.id)}
                    class="btn btn-sm btn-danger">Delete</button
                >
            </div>
        {/each}
    </div>
{:else}
    <div class="empty-state">
        <span class="icon">view_list</span>
        <p>No views yet. Add one above.</p>
    </div>
{/if}
