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

<div class="page-header">
    <a href="/user/settings" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">Webhooks</h1>
</div>
<p class="text-muted mb-4">
    Receive HTTP POST callbacks when selected events happen.
</p>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}
{#if $success}<div class="alert alert-success">{$success}</div>{/if}

<div class="card mb-4">
    <div class="card-header"><h2 class="card-title">Add Webhook</h2></div>
    <div class="card-body">
        <form onsubmit={onCreateSubmit}>
            <div class="form-group">
                <label for="webhook-url" class="form-label"
                    >URL <span class="text-danger">*</span></label
                >
                <input
                    id="webhook-url"
                    type="url"
                    bind:value={newUrl}
                    placeholder="https://example.com/hook"
                    required
                    class="form-input"
                />
            </div>
            <div class="form-group">
                <label for="webhook-event" class="form-label">Event</label>
                <select
                    id="webhook-event"
                    bind:value={newEvent}
                    class="form-select"
                >
                    {#each EVENT_OPTIONS as ev}<option value={ev}>{ev}</option
                        >{/each}
                </select>
            </div>
            <div class="form-group">
                <label for="webhook-secret" class="form-label"
                    >Secret <span class="text-xs text-muted">(optional)</span
                    ></label
                >
                <input
                    id="webhook-secret"
                    type="text"
                    bind:value={newSecret}
                    placeholder="HMAC signing secret"
                    class="form-input"
                />
            </div>
            <button
                type="submit"
                disabled={$saving || !newUrl.trim()}
                class="btn btn-primary"
            >
                {$saving ? 'Creating…' : 'Create Webhook'}
            </button>
        </form>
    </div>
</div>

{#if $loading}
    <p>Loading…</p>
{:else if $webhooks.length === 0}
    <div class="empty-state">
        <span class="icon">webhook</span>
        <p>No webhooks configured yet.</p>
    </div>
{:else}
    <div class="list card">
        {#each $webhooks as wh}
            <div class="list-item">
                <div class="list-item-body">
                    <p class="font-medium mb-0" style="word-break:break-all">
                        {wh.url}
                    </p>
                    <p class="text-sm text-muted mb-0">
                        Event: <strong>{wh.event}</strong> · {wh.active
                            ? 'Active'
                            : 'Inactive'}
                    </p>
                </div>
                <button
                    onclick={() => remove(wh.id)}
                    class="btn btn-sm btn-danger">Delete</button
                >
            </div>
        {/each}
    </div>
{/if}
