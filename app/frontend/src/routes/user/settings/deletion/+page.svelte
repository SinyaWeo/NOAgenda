<script lang="ts">
    import { writable } from 'svelte/store';
    import { apiPostAuth, clearToken } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    const error = writable('');
    const success = writable('');
    const loading = writable(false);

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
        }
    });

    async function requestDeletion() {
        if (
            !confirm(
                'Are you sure you want to request account deletion? This cannot be undone.',
            )
        )
            return;
        loading.set(true);
        error.set('');
        success.set('');
        try {
            await apiPostAuth('/user/deletion/request', {});
            success.set(
                'Deletion requested. Your account will be deleted after a grace period.',
            );
        } catch (e: any) {
            error.set(e.message);
        } finally {
            loading.set(false);
        }
    }

    async function cancelDeletion() {
        loading.set(true);
        error.set('');
        try {
            await apiPostAuth('/user/deletion/cancel', {});
            success.set('Deletion request cancelled.');
        } catch (e: any) {
            error.set(e.message);
        } finally {
            loading.set(false);
        }
    }
</script>

<div class="page-header">
    <a href="/user/settings" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">Account Deletion</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}
{#if $success}<div class="alert alert-success">{$success}</div>{/if}

<div class="danger-zone">
    <div class="flex-center gap-3 mb-4">
        <span class="icon text-danger">warning</span>
        <div>
            <p class="font-bold text-danger mb-0">
                This will permanently delete your account
            </p>
            <p class="text-sm text-muted mb-0">
                All your data including projects, tasks, and settings will be
                permanently removed. There is a grace period during which you
                can cancel.
            </p>
        </div>
    </div>
    <div class="page-actions">
        <button
            onclick={requestDeletion}
            disabled={$loading}
            class="btn btn-danger"
        >
            {$loading ? 'Processing…' : 'Request Account Deletion'}
        </button>
        <button
            onclick={cancelDeletion}
            disabled={$loading}
            class="btn btn-secondary"
        >
            Cancel Deletion Request
        </button>
    </div>
</div>
