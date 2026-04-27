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

<div style="max-width:600px">
    <div
        style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"
    >
        <a
            href="/projects/{$page.params.id}/edit"
            style="color:#6b7280;text-decoration:none;font-size:1.2rem"
            >&#8592;</a
        >
        <h1 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0">
            Webhooks
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
            Add Webhook
        </h2>
        <form onsubmit={addWebhook} style="display:flex;gap:0.5rem">
            <input
                type="url"
                bind:value={newUrl}
                placeholder="https://your-url.example.com/hook"
                required
                style="flex:1;padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem"
            />
            <button
                type="submit"
                style="padding:0.55rem 1rem;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:0.9rem;cursor:pointer"
                >Add</button
            >
        </form>
    </div>

    {#if $loading}
        <p style="color:#64748b">Loading…</p>
    {:else if $webhooks.length}
        <div style="display:flex;flex-direction:column;gap:0.6rem">
            {#each $webhooks as wh}
                <div
                    style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem 1rem;display:flex;justify-content:space-between;align-items:center;gap:1rem"
                >
                    <span
                        style="font-size:0.875rem;color:#374151;word-break:break-all"
                        >{wh.url}</span
                    >
                    <button
                        onclick={() => deleteWebhook(wh.id)}
                        style="flex-shrink:0;padding:0.3rem 0.7rem;background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;border-radius:5px;cursor:pointer;font-size:0.8rem"
                        >Delete</button
                    >
                </div>
            {/each}
        </div>
    {:else}
        <div
            style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:2rem;text-align:center"
        >
            <p style="color:#94a3b8;margin:0">No webhooks configured yet.</p>
        </div>
    {/if}
</div>
