<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, apiDeleteAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';

    const sessions = writable<any[]>([]);
    const loading = writable(true);
    const error = writable('');

    async function loadSessions() {
        sessions.set(await apiGetAuth<any[]>('/user/sessions'));
    }

    async function deleteSession(id: number) {
        try {
            await apiDeleteAuth(`/user/sessions/${id}`);
            await loadSessions();
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
            await loadSessions();
        } catch (e: any) {
            error.set(e.message);
        } finally {
            loading.set(false);
        }
    });
</script>

<div class="page-header">
    <a href="/user/settings" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">Active Sessions</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}

{#if $loading}
    <p class="text-muted">Loading…</p>
{:else if $sessions.length}
    <div class="list card">
        {#each $sessions as session}
            <div class="list-item">
                <div class="list-item-body">
                    <div class="font-medium truncate">
                        {session.userAgent ?? 'Unknown client'}
                    </div>
                    <div class="text-xs text-muted">
                        {#if session.ipAddress}<span class="mr-2"
                                >IP: {session.ipAddress}</span
                            >{/if}
                        Expires: {session.expiresAt
                            ? new Date(session.expiresAt).toLocaleString()
                            : 'Never'}
                    </div>
                </div>
                <button
                    onclick={() => deleteSession(session.id)}
                    class="btn btn-sm btn-danger">Revoke</button
                >
            </div>
        {/each}
    </div>
{:else}
    <div class="empty-state">
        <span class="icon">devices</span>
        <p>No active sessions.</p>
    </div>
{/if}
