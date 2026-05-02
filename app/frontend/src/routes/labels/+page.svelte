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

    const labels = writable<any[]>([]);
    const loading = writable(true);
    const error = writable('');

    // Create form
    let newTitle = $state('');
    let newColor = $state('#6366f1');
    let creating = $state(false);

    // Edit state
    let editId = $state<number | null>(null);
    let editTitle = $state('');
    let editColor = $state('');

    async function loadLabels() {
        const all = await apiGetAuth<any[]>('/labels');
        labels.set(all);
    }

    async function createLabel() {
        if (!newTitle.trim()) return;
        creating = true;
        try {
            await apiPostAuth('/labels', { title: newTitle, color: newColor });
            newTitle = '';
            await loadLabels();
        } catch (e: any) {
            error.set(e.message);
        } finally {
            creating = false;
        }
    }

    async function saveEdit(id: number) {
        try {
            await apiPutAuth(`/labels/${id}`, {
                title: editTitle,
                color: editColor,
            });
            editId = null;
            await loadLabels();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    async function deleteLabel(id: number) {
        if (!confirm('Delete this label?')) return;
        try {
            await apiDeleteAuth(`/labels/${id}`);
            await loadLabels();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    function startEdit(label: any) {
        editId = label.id;
        editTitle = label.title;
        editColor = label.color ?? '#6366f1';
    }

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
            return;
        }
        await loadLabels();
        loading.set(false);
    });
</script>

<h1 style="margin-bottom:1.25rem">Labels</h1>
{#if $error}<p style="color:red">{$error}</p>{/if}

<form
    onsubmit={(e) => {
        e.preventDefault();
        createLabel();
    }}
    style="display:flex;gap:0.5rem;margin-bottom:1.5rem;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:0.875rem 1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)"
>
    <input
        type="text"
        bind:value={newTitle}
        placeholder="New label name"
        required
        style="flex:1;padding:0.4rem 0.75rem;border:1px solid #e2e8f0;border-radius:4px"
    />
    <input
        type="color"
        bind:value={newColor}
        style="width:2.5rem;height:2.25rem;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;padding:0"
    />
    <button
        type="submit"
        disabled={creating}
        style="background:#6366f1;color:#fff;border:none;padding:0.4rem 1rem;border-radius:4px;cursor:pointer"
        >{creating ? 'Adding…' : '+ Add Label'}</button
    >
</form>

{#if $loading}
    <p>Loading…</p>
{:else if $labels.length === 0}
    <div style="text-align:center;padding:3rem;color:#64748b">
        <p style="margin:0">No labels yet. Create one above.</p>
    </div>
{:else}
    <div style="display:flex;flex-direction:column;gap:0.4rem">
        {#each $labels as label}
            <div
                style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem 1rem;display:flex;align-items:center;gap:0.75rem;box-shadow:0 1px 2px rgba(0,0,0,0.03)"
            >
                {#if editId === label.id}
                    <input
                        type="text"
                        bind:value={editTitle}
                        style="flex:1;padding:0.3rem 0.6rem;border:1px solid #e2e8f0;border-radius:4px"
                    />
                    <input
                        type="color"
                        bind:value={editColor}
                        style="width:2.25rem;height:2rem;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;padding:0"
                    />
                    <button
                        onclick={() => saveEdit(label.id)}
                        style="background:#6366f1;color:#fff;border:none;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer"
                        >Save</button
                    >
                    <button
                        onclick={() => (editId = null)}
                        style="background:#f1f5f9;border:none;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer;color:#475569"
                        >Cancel</button
                    >
                {:else}
                    <span
                        style="display:inline-block;width:16px;height:16px;border-radius:50%;background:{label.color ??
                            '#6366f1'};flex-shrink:0"
                    ></span>
                    <span style="flex:1;font-weight:500;color:#1e293b"
                        >{label.title}</span
                    >
                    <button
                        onclick={() => startEdit(label)}
                        style="background:#f1f5f9;border:none;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer;color:#475569;font-size:0.85rem"
                        >Edit</button
                    >
                    <button
                        onclick={() => deleteLabel(label.id)}
                        style="background:none;border:1px solid #fecaca;color:#ef4444;padding:0.3rem 0.75rem;border-radius:4px;cursor:pointer;font-size:0.85rem"
                        >Delete</button
                    >
                {/if}
            </div>
        {/each}
    </div>
{/if}
