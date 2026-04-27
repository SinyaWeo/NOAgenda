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

<div style="max-width:520px">
    <div
        style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"
    >
        <a
            href="/user/settings"
            style="color:#6b7280;text-decoration:none;font-size:1.2rem"
            >&#8592;</a
        >
        <h1 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0">
            Account Deletion
        </h1>
    </div>

    {#if $error}
        <div
            style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.875rem"
        >
            {$error}
        </div>
    {/if}
    {#if $success}
        <div
            style="background:#f0fdf4;border:1px solid #86efac;color:#166534;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.875rem"
        >
            {$success}
        </div>
    {/if}

    <div
        style="background:#fff;border:2px solid #fca5a5;border-radius:10px;padding:1.5rem"
    >
        <div style="display:flex;gap:1rem;margin-bottom:1.25rem">
            <div style="font-size:1.5rem">&#9888;&#65039;</div>
            <div>
                <p style="margin:0 0 0.4rem;font-weight:600;color:#b91c1c">
                    This will permanently delete your account
                </p>
                <p style="margin:0;font-size:0.875rem;color:#6b7280">
                    All your data including projects, tasks, and settings will
                    be permanently removed. There is a grace period during which
                    you can cancel.
                </p>
            </div>
        </div>
        <div style="display:flex;gap:0.75rem">
            <button
                onclick={requestDeletion}
                disabled={$loading}
                style="background:#ef4444;color:#fff;padding:0.6rem 1.25rem;border:none;border-radius:6px;font-size:0.9rem;font-weight:500;cursor:{$loading
                    ? 'not-allowed'
                    : 'pointer'};opacity:{$loading ? 0.7 : 1}"
            >
                {$loading ? 'Processing…' : 'Request Account Deletion'}
            </button>
            <button
                onclick={cancelDeletion}
                disabled={$loading}
                style="background:#fff;color:#374151;padding:0.6rem 1.25rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;cursor:{$loading
                    ? 'not-allowed'
                    : 'pointer'};opacity:{$loading ? 0.7 : 1}"
            >
                Cancel Deletion Request
            </button>
        </div>
    </div>
</div>
