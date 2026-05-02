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

<div class="page-header">
    <a href="/projects/{$page.params.id}/edit" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">Delete Project</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}

<div class="danger-zone">
    <div class="flex-center gap-3 mb-4">
        <span class="icon text-danger">warning</span>
        <div>
            <p class="font-bold text-danger mb-0">
                This action cannot be undone
            </p>
            <p class="text-sm text-muted mb-0">
                Permanently deletes the project and <strong
                    >all its tasks</strong
                >. Once deleted, there is no way to recover this data.
            </p>
        </div>
    </div>
    <div class="flex-center gap-2">
        <button
            onclick={handleDelete}
            disabled={$loading}
            class="btn btn-danger"
            >{$loading ? 'Deleting…' : 'Delete Project'}</button
        >
        <a href="/projects/{$page.params.id}/edit" class="btn btn-secondary"
            >Cancel</a
        >
    </div>
</div>
