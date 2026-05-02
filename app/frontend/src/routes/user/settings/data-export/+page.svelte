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

<div class="page-header">
    <a href="/user/settings" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">Data Export</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}
{#if $success}<div class="alert alert-success">{$success}</div>{/if}

<div class="card">
    <div class="card-body">
        <p class="text-sm text-muted mb-4">
            Request a complete copy of all your data. You'll receive an email
            with a download link when the export is ready.
        </p>
        <button
            onclick={requestExport}
            disabled={$loading}
            class="btn btn-primary"
        >
            {$loading ? 'Requesting…' : 'Request Data Export'}
        </button>
    </div>
</div>
