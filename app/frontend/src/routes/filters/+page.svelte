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

<h1 style="margin-bottom:1.25rem">Saved Filters</h1>
{#if $error}<p style="color:red">{$error}</p>{/if}

<form
    onsubmit={create}
    style="display:flex;gap:0.5rem;margin-bottom:1.5rem;flex-wrap:wrap;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:0.875rem 1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)"
>
    <input
        type="text"
        bind:value={newName}
        placeholder="Filter name"
        required
        style="flex:1;min-width:200px;padding:0.4rem 0.75rem;border:1px solid #e2e8f0;border-radius:4px"
    />
    <input
        type="text"
        bind:value={newDescription}
        placeholder="Description (optional)"
        style="flex:2;min-width:200px;padding:0.4rem 0.75rem;border:1px solid #e2e8f0;border-radius:4px"
    />
    <button
        type="submit"
        style="background:#6366f1;color:#fff;border:none;padding:0.4rem 1rem;border-radius:4px;cursor:pointer"
        >+ Save Filter</button
    >
</form>

{#if $loading}
    <p>Loading…</p>
{:else if $filters.length === 0}
    <div style="text-align:center;padding:3rem;color:#64748b">
        <p style="margin:0">No saved filters yet. Create one above.</p>
    </div>
{:else}
    <div style="display:flex;flex-direction:column;gap:0.5rem">
        {#each $filters as filter}
            <div
                style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:0.875rem 1rem;box-shadow:0 1px 2px rgba(0,0,0,0.03)"
            >
                {#if editingId === filter.id}
                    <form
                        onsubmit={(e) => {
                            e.preventDefault();
                            saveEdit(filter.id);
                        }}
                        style="display:flex;gap:0.5rem;flex-wrap:wrap"
                    >
                        <input
                            type="text"
                            bind:value={editName}
                            required
                            style="flex:1;padding:0.3rem 0.6rem;border:1px solid #e2e8f0;border-radius:4px"
                        />
                        <input
                            type="text"
                            bind:value={editDescription}
                            style="flex:2;padding:0.3rem 0.6rem;border:1px solid #e2e8f0;border-radius:4px"
                        />
                        <button
                            type="submit"
                            style="background:#6366f1;color:#fff;border:none;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer"
                            >Save</button
                        >
                        <button
                            type="button"
                            onclick={() => (editingId = null)}
                            style="background:#f1f5f9;border:none;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer;color:#475569"
                            >Cancel</button
                        >
                    </form>
                {:else}
                    <div
                        style="display:flex;justify-content:space-between;align-items:center"
                    >
                        <div>
                            <strong style="color:#1e293b">{filter.name}</strong>
                            {#if filter.description}
                                <p
                                    style="margin:0.2rem 0 0;color:#64748b;font-size:0.85rem"
                                >
                                    {filter.description}
                                </p>
                            {/if}
                        </div>
                        <div style="display:flex;gap:0.5rem">
                            <button
                                onclick={() => startEdit(filter)}
                                style="background:#f1f5f9;border:none;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer;color:#475569;font-size:0.85rem"
                                >Edit</button
                            >
                            <button
                                onclick={() => deleteFilter(filter.id)}
                                style="background:none;border:1px solid #fecaca;color:#ef4444;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem"
                                >Delete</button
                            >
                        </div>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}
