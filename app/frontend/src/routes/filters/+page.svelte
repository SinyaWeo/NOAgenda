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
    import { goto } from '$app/navigation';

    interface Filter {
        id: number;
        name: string;
        description: string;
        filters: any;
    }

    const filters = writable<Filter[]>([]);
    const loading = writable(true);
    const error = writable('');

    let editingId = $state<number | null>(null);
    let newName = $state('');
    let newDescription = $state('');
    let editName = $state('');
    let editDescription = $state('');

    async function load() {
        filters.set(await apiGetAuth<Filter[]>('/filters'));
    }

    async function create(e: Event) {
        e.preventDefault();
        try {
            await apiPostAuth('/filters', {
                name: newName,
                description: newDescription,
            });
            newName = '';
            newDescription = '';
            await load();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    function startEdit(f: Filter) {
        editingId = f.id;
        editName = f.name;
        editDescription = f.description;
    }

    async function saveEdit(id: number) {
        try {
            await apiPutAuth(`/filters/${id}`, {
                name: editName,
                description: editDescription,
            });
            editingId = null;
            await load();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    async function deleteFilter(id: number) {
        if (!confirm('Delete this filter?')) return;
        try {
            await apiDeleteAuth(`/filters/${id}`);
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
    <h1 class="page-title">Saved Filters</h1>
</div>
{#if $error}<div class="alert alert-error">{$error}</div>{/if}

<form onsubmit={create} class="card mb-4">
    <div class="card-body inline-form">
        <input
            type="text"
            bind:value={newName}
            placeholder="Filter name"
            required
            class="form-input"
        />
        <input
            type="text"
            bind:value={newDescription}
            placeholder="Description (optional)"
            class="form-input"
        />
        <button type="submit" class="btn btn-primary">+ Save Filter</button>
    </div>
</form>

{#if $loading}
    <p>Loading…</p>
{:else if $filters.length === 0}
    <div class="empty-state">
        <span class="icon">filter_list</span>
        <p>No saved filters yet. Create one above.</p>
    </div>
{:else}
    <div class="list card">
        {#each $filters as filter}
            <div class="list-item">
                {#if editingId === filter.id}
                    <form
                        onsubmit={(e) => {
                            e.preventDefault();
                            saveEdit(filter.id);
                        }}
                        class="inline-form"
                        style="width:100%"
                    >
                        <input
                            type="text"
                            bind:value={editName}
                            required
                            class="form-input"
                        />
                        <input
                            type="text"
                            bind:value={editDescription}
                            class="form-input"
                        />
                        <button type="submit" class="btn btn-primary btn-sm"
                            >Save</button
                        >
                        <button
                            type="button"
                            onclick={() => (editingId = null)}
                            class="btn btn-secondary btn-sm">Cancel</button
                        >
                    </form>
                {:else}
                    <div class="list-item-body">
                        <strong>{filter.name}</strong>
                        {#if filter.description}<p
                                class="text-sm text-muted mb-0"
                            >
                                {filter.description}
                            </p>{/if}
                    </div>
                    <div class="list-item-actions">
                        <button
                            onclick={() => startEdit(filter)}
                            class="btn btn-secondary btn-sm">Edit</button
                        >
                        <button
                            onclick={() => deleteFilter(filter.id)}
                            class="btn btn-danger btn-sm">Delete</button
                        >
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}
