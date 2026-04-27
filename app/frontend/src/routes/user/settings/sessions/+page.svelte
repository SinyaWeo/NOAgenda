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

<div style="max-width:700px">
    <div
        style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"
    >
        <a
            href="/user/settings"
            style="color:#6b7280;text-decoration:none;font-size:1.2rem"
            >&#8592;</a
        >
        <h1 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0">
            Active Sessions
        </h1>
    </div>

    {#if $error}
        <div
            style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.875rem"
        >
            {$error}
        </div>
    {/if}

    {#if $loading}
        <p style="color:#64748b">Loading…</p>
    {:else if $sessions.length}
        <div style="display:flex;flex-direction:column;gap:0.75rem">
            {#each $sessions as session}
                <div
                    style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1rem;display:flex;justify-content:space-between;align-items:flex-start;gap:1rem"
                >
                    <div style="min-width:0">
                        <div
                            style="font-size:0.875rem;font-weight:500;color:#1e293b;margin-bottom:0.2rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                        >
                            {session.userAgent ?? 'Unknown client'}
                        </div>
                        <div style="font-size:0.8rem;color:#64748b">
                            {#if session.ipAddress}<span
                                    style="margin-right:0.75rem"
                                    >IP: {session.ipAddress}</span
                                >{/if}
                            Expires: {session.expiresAt
                                ? new Date(session.expiresAt).toLocaleString()
                                : 'Never'}
                        </div>
                    </div>
                    <button
                        onclick={() => deleteSession(session.id)}
                        style="flex-shrink:0;padding:0.35rem 0.75rem;background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;border-radius:5px;cursor:pointer;font-size:0.8rem;font-weight:500"
                        >Revoke</button
                    >
                </div>
            {/each}
        </div>
    {:else}
        <div
            style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:2rem;text-align:center"
        >
            <p style="color:#94a3b8;margin:0">No active sessions.</p>
        </div>
    {/if}
</div>
