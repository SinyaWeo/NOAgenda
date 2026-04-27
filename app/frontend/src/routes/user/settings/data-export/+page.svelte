<script lang="ts">
    import { writable } from 'svelte/store';
    import { apiPostAuth } from '$lib/api';
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

    async function requestExport() {
        loading.set(true);
        error.set('');
        success.set('');
        try {
            await apiPostAuth('/user/export/request', {});
            success.set(
                'Export requested. You will receive an email with your data.',
            );
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
            Data Export
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
        style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem"
    >
        <p style="margin:0 0 1.25rem;font-size:0.875rem;color:#64748b">
            Request a complete copy of all your data. You'll receive an email
            with a download link when the export is ready.
        </p>
        <button
            onclick={requestExport}
            disabled={$loading}
            style="background:#6366f1;color:#fff;padding:0.6rem 1.25rem;border:none;border-radius:6px;font-size:0.9rem;font-weight:500;cursor:{$loading
                ? 'not-allowed'
                : 'pointer'};opacity:{$loading ? 0.7 : 1}"
        >
            {$loading ? 'Requesting…' : 'Request Data Export'}
        </button>
    </div>
</div>
