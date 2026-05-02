<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { Alert, Button, Card, Input } from 'flowbite-svelte';
    import { LinkOutline } from 'flowbite-svelte-icons';

    const webhooks = writable<any[]>([]);
    const loading = writable(true);
    const error = writable('');
    let newUrl = $state('');

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

<div class="flex items-center gap-3 mb-6">
    <a
        href="/projects/{$page.params.id}/edit"
        class="text-gray-400 hover:text-gray-600">← Back</a
    >
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
        Webhooks
    </h1>
</div>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="mb-4">
    <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
        Add Webhook
    </h2>
    <form onsubmit={addWebhook} class="flex gap-2">
        <Input
            type="url"
            bind:value={newUrl}
            placeholder="https://your-url.example.com/hook"
            required
            class="flex-1"
        />
        <Button type="submit">Add</Button>
    </form>
</Card>

{#if $loading}
    <p class="text-gray-400">Loading…</p>
{:else if $webhooks.length}
    <Card class="p-0 overflow-hidden">
        {#each $webhooks as wh, i}
            <div
                class="flex items-center gap-3 p-4 {i < $webhooks.length - 1
                    ? 'border-b border-gray-100 dark:border-gray-700'
                    : ''}"
            >
                <span
                    class="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate"
                    >{wh.url}</span
                >
                <Button
                    size="sm"
                    color="red"
                    onclick={() => deleteWebhook(wh.id)}>Delete</Button
                >
            </div>
        {/each}
    </Card>
{:else}
    <div class="text-center py-10 text-gray-400">
        <LinkOutline class="w-10 h-10 mx-auto mb-2" />
        <p>No webhooks configured yet.</p>
    </div>
{/if}
