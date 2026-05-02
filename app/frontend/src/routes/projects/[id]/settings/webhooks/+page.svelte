<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    const webhooks = writable<any[]>([]);
    const loading = writable(true);
    const error = writable('');
    let newUrl = '';

    async function load() {
        webhooks.set(
            await apiGetAuth<any[]>(`/webhooks?projectId=${$page.params.id}`),
        );
    }

    async function addWebhook(e: Event) {
        e.preventDefault();
        try {
            await apiPostAuth('/webhooks', {
                url: newUrl,
                projectId: Number($page.params.id),
            });
            newUrl = '';
            await load();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    async function deleteWebhook(id: number) {
        try {
            await apiDeleteAuth(`/webhooks/${id}`);
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
    <a href="/projects/{$page.params.id}/edit" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">Webhooks</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}

<div class="card mb-4">
    <div class="card-header"><h2 class="card-title">Add Webhook</h2></div>
    <div class="card-body">
        <form onsubmit={addWebhook} class="inline-form">
            <input
                type="url"
                bind:value={newUrl}
                placeholder="https://your-url.example.com/hook"
                required
                class="form-input"
                style="flex:1"
            />
            <button type="submit" class="btn btn-primary">Add</button>
        </form>
    </div>
</div>

{#if $loading}
    <p class="text-muted">Loading…</p>
{:else if $webhooks.length}
    <div class="list card">
        {#each $webhooks as wh}
            <div class="list-item">
                <div class="list-item-body">
                    <span class="text-sm truncate">{wh.url}</span>
                </div>
                <button
                    onclick={() => deleteWebhook(wh.id)}
                    class="btn btn-sm btn-danger">Delete</button
                >
            </div>
        {/each}
    </div>
{:else}
    <div class="empty-state">
        <span class="icon">webhook</span>
        <p>No webhooks configured yet.</p>
    </div>
{/if}
