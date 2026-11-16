<script lang="ts">
  import { errMessage } from '$lib/errors';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, apiDeleteAuth } from '$lib/api';
    import type { SessionRow } from '$lib/types-misc';
    import { Alert, Button, Card } from 'flowbite-svelte';
    import { DesktopPcOutline, CaretLeftSolid } from 'flowbite-svelte-icons';

    const sessions = writable<SessionRow[]>([]);
    const loading = writable(true);
    const error = writable('');

    async function loadSessions() {
        sessions.set(await apiGetAuth<SessionRow[]>('/user/sessions'));
    }

    onMount(async () => {
        try {
            await loadSessions();
        } catch (e: unknown) {
            error.set(errMessage(e));
        } finally {
            loading.set(false);
        }
    });

    async function deleteSession(id: number) {
        try {
            await apiDeleteAuth(`/user/sessions/${id}`);
            await loadSessions();
        } catch (e: unknown) {
            error.set(errMessage(e));
        }
    }
</script>

<div class="flex items-center gap-3 mb-6">
    <a href="/user/settings" class="text-gray-400 hover:text-gray-600"
        ><CaretLeftSolid class="w-4 h-4 inline mr-1" /> Back</a
    >
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
        Active Sessions
    </h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

{#if $loading}
    <p class="text-gray-400">Loading…</p>
{:else if $sessions.length}
    <Card class="p-0 overflow-hidden">
        {#each $sessions as session, i (session.id)}
            <div
                class="flex items-center gap-3 px-4 py-3 {i <
                $sessions.length - 1
                    ? 'border-b border-gray-100 dark:border-gray-700'
                    : ''}"
            >
                <div class="flex-1 min-w-0">
                    <p
                        class="font-medium text-sm text-gray-900 dark:text-white m-0 truncate"
                    >
                        {session.userAgent ?? 'Unknown client'}
                        {#if session.current}<span class="ml-2 text-xs font-normal text-primary-600 dark:text-primary-400">This device</span>{/if}
                    </p>
                    <p class="text-xs text-gray-400 m-0">
                        {#if session.ipAddress}IP: {session.ipAddress} ·
                        {/if}Expires: {session.expiresAt
                            ? new Date(session.expiresAt).toLocaleString()
                            : 'Never'}
                    </p>
                </div>
                <Button
                    size="xs"
                    color="red"
                    onclick={() => deleteSession(session.id)}>Revoke</Button
                >
            </div>
        {/each}
    </Card>
{:else}
    <div class="text-center py-10 text-gray-400">
        <DesktopPcOutline class="w-10 h-10 mx-auto mb-2" />
        <p>No active sessions.</p>
    </div>
{/if}
