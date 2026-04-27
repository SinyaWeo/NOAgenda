<script lang="ts">
    import { writable } from 'svelte/store';
    import { apiDeleteAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    const error = writable('');
    const loading = writable(false);

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
        }
    });

    async function handleDelete() {
        if (!confirm('Permanently delete this project and all its tasks?'))
            return;
        loading.set(true);
        try {
            await apiDeleteAuth(`/projects/${$page.params.id}`);
            goto('/projects');
        } catch (e: any) {
            error.set(e.message);
            loading.set(false);
        }
    }
</script>

<div style="max-width:520px">
    <div
        style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"
    >
        <a
            href="/projects/{$page.params.id}/edit"
            style="color:#6b7280;text-decoration:none;font-size:1.2rem"
            >&#8592;</a
        >
        <h1 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0">
            Delete Project
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
        style="background:#fff;border:2px solid #fca5a5;border-radius:10px;padding:1.5rem"
    >
        <div style="display:flex;gap:1rem;margin-bottom:1.25rem">
            <div style="font-size:1.5rem">&#9888;&#65039;</div>
            <div>
                <p style="margin:0 0 0.4rem;font-weight:600;color:#b91c1c">
                    This action cannot be undone
                </p>
                <p style="margin:0;font-size:0.875rem;color:#6b7280">
                    Permanently deletes the project and <strong
                        >all its tasks</strong
                    >. Once deleted, there is no way to recover this data.
                </p>
            </div>
        </div>
        <div style="display:flex;gap:0.75rem">
            <button
                onclick={handleDelete}
                disabled={$loading}
                style="background:#ef4444;color:#fff;padding:0.6rem 1.25rem;border:none;border-radius:6px;font-size:0.9rem;font-weight:500;cursor:{$loading
                    ? 'not-allowed'
                    : 'pointer'};opacity:{$loading ? 0.7 : 1}"
            >
                {$loading ? 'Deleting…' : 'Delete Project'}
            </button>
            <a
                href="/projects/{$page.params.id}/edit"
                style="padding:0.6rem 1.25rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;color:#374151;text-decoration:none;background:#fff"
                >Cancel</a
            >
        </div>
    </div>
</div>
