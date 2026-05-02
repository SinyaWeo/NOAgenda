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

<div class="page-header">
    <h1 class="page-title">Labels</h1>
</div>
{#if $error}<div class="alert alert-error">{$error}</div>{/if}

<form
    onsubmit={(e) => {
        e.preventDefault();
        createLabel();
    }}
    class="card mb-4"
>
    <div class="card-body inline-form">
        <input
            type="text"
            bind:value={newTitle}
            placeholder="New label name"
            required
            class="form-input"
        />
        <input type="color" bind:value={newColor} class="label-color-preview" />
        <button type="submit" disabled={creating} class="btn btn-primary">
            {creating ? 'Adding…' : '+ Add Label'}
        </button>
    </div>
</form>

{#if $loading}
    <p>Loading…</p>
{:else if $labels.length === 0}
    <div class="empty-state">
        <span class="icon">label</span>
        <p>No labels yet. Create one above.</p>
    </div>
{:else}
    <div class="list card">
        {#each $labels as label}
            <div class="list-item">
                {#if editId === label.id}
                    <input
                        type="text"
                        bind:value={editTitle}
                        class="form-input"
                        style="flex:1"
                    />
                    <input
                        type="color"
                        bind:value={editColor}
                        class="label-color-preview"
                    />
                    <button
                        onclick={() => saveEdit(label.id)}
                        class="btn btn-primary btn-sm">Save</button
                    >
                    <button
                        onclick={() => (editId = null)}
                        class="btn btn-secondary btn-sm">Cancel</button
                    >
                {:else}
                    <span
                        class="color-dot"
                        style="--dot-color:{label.color ?? '#6366f1'}"
                    ></span>
                    <span class="list-item-body font-medium">{label.title}</span
                    >
                    <div class="list-item-actions">
                        <button
                            onclick={() => startEdit(label)}
                            class="btn btn-secondary btn-sm">Edit</button
                        >
                        <button
                            onclick={() => deleteLabel(label.id)}
                            class="btn btn-danger btn-sm">Delete</button
                        >
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}
