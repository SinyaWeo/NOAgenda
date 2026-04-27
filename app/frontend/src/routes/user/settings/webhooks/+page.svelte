<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { writable } from 'svelte/store';

    const webhooks = writable<any[]>([]);
    const loading = writable(true);
    const error = writable('');
    const success = writable('');
    const saving = writable(false);

    let newUrl = '';
    let newEvent = 'task.created';
    let newSecret = '';

    const EVENT_OPTIONS = [
        'task.created',
        'task.updated',
        'task.deleted',
        'project.created',
        'project.updated',
        'project.deleted',
        'comment.created',
    ];

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
            return;
        }
        await load();
    });

    async function load() {
        loading.set(true);
        try {
            webhooks.set(await apiGetAuth<any[]>('/webhooks'));
        } catch (e: any) {
            error.set(e.message);
        } finally {
            loading.set(false);
        }
    }

    async function create() {
        if (!newUrl.trim()) return;
        saving.set(true);
        error.set('');
        success.set('');
        try {
            await apiPostAuth('/webhooks', {
                url: newUrl,
                event: newEvent,
                secret: newSecret || undefined,
                active: true,
            });
            newUrl = '';
            newSecret = '';
            success.set('Webhook created.');
            await load();
        } catch (e: any) {
            error.set(e.message);
        } finally {
            saving.set(false);
        }
    }

    function onCreateSubmit(e: SubmitEvent) {
        e.preventDefault();
        create();
    }

    async function remove(id: number) {
        if (!confirm('Delete this webhook?')) return;
        try {
            await apiDeleteAuth(`/webhooks/${id}`);
            await load();
        } catch (e: any) {
            error.set(e.message);
        }
    }
</script>

<div style="max-width:920px">
    <h1 style="margin-bottom:0.4rem">Webhooks</h1>
    <p style="color:#64748b;margin:0 0 1.25rem">
        Receive HTTP POST callbacks when selected events happen.
    </p>

    {#if $error}
        <p
            style="color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:0.6rem 1rem"
        >
            {$error}
        </p>
    {/if}
    {#if $success}
        <p
            style="color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:0.6rem 1rem"
        >
            {$success}
        </p>
    {/if}

    <section
        style="border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04)"
    >
        <h2 style="margin:0 0 1rem">Add Webhook</h2>
        <form
            onsubmit={onCreateSubmit}
            style="display:flex;flex-direction:column;gap:0.75rem;max-width:560px"
        >
            <label
                for="webhook-url"
                style="font-size:0.85rem;font-weight:500;color:#475569"
                >URL <span style="color:#ef4444">*</span></label
            >
            <input
                id="webhook-url"
                type="url"
                bind:value={newUrl}
                placeholder="https://example.com/hook"
                required
                style="width:100%;padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px"
            />

            <label
                for="webhook-event"
                style="font-size:0.85rem;font-weight:500;color:#475569"
                >Event</label
            >
            <select
                id="webhook-event"
                bind:value={newEvent}
                style="width:100%;padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px"
            >
                {#each EVENT_OPTIONS as ev}<option value={ev}>{ev}</option
                    >{/each}
            </select>

            <label
                for="webhook-secret"
                style="font-size:0.85rem;font-weight:500;color:#475569"
                >Secret (optional)</label
            >
            <input
                id="webhook-secret"
                type="text"
                bind:value={newSecret}
                placeholder="HMAC signing secret"
                style="width:100%;padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px"
            />

            <button
                type="submit"
                disabled={$saving || !newUrl.trim()}
                style="background:#6366f1;color:#fff;border:none;padding:0.55rem 1.25rem;border-radius:6px;cursor:pointer;align-self:flex-start"
            >
                {$saving ? 'Creating…' : 'Create Webhook'}
            </button>
        </form>
    </section>

    {#if $loading}
        <p>Loading…</p>
    {:else if $webhooks.length === 0}
        <p style="color:#64748b">No webhooks configured yet.</p>
    {:else}
        <div style="display:flex;flex-direction:column;gap:0.75rem">
            {#each $webhooks as wh}
                <article
                    style="border:1px solid #e2e8f0;border-radius:8px;padding:1rem;background:#fff;display:flex;justify-content:space-between;align-items:flex-start;gap:1rem"
                >
                    <div>
                        <p
                            style="margin:0;font-weight:500;word-break:break-all"
                        >
                            {wh.url}
                        </p>
                        <p
                            style="margin:0.25rem 0 0;font-size:0.85rem;color:#64748b"
                        >
                            Event: <strong>{wh.event}</strong> · {wh.active
                                ? 'Active'
                                : 'Inactive'}
                        </p>
                    </div>
                    <button
                        onclick={() => remove(wh.id)}
                        style="color:#ef4444;background:#fff;border:1px solid #fecaca;border-radius:6px;padding:0.4rem 0.75rem;cursor:pointer;flex-shrink:0"
                    >
                        Delete
                    </button>
                </article>
            {/each}
        </div>
    {/if}

    <p style="margin-top:1.5rem">
        <a href="/user/settings">← Back to settings</a>
    </p>
</div>
