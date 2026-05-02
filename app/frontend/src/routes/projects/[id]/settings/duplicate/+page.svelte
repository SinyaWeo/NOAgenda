<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { apiGetAuth, apiPutAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { writable } from 'svelte/store';

    const project = writable<any>(null);
    const loading = writable(true);
    const saving = writable(false);
    const error = writable('');

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
            return;
        }
        try {
            project.set(await apiGetAuth<any>(`/projects/${$page.params.id}`));
        } catch (e: any) {
            error.set(e.message);
        } finally {
            loading.set(false);
        }
    });

    async function duplicate() {
        saving.set(true);
        error.set('');
        try {
            const newProject = await apiPutAuth<any>(
                `/projects/${$page.params.id}/duplicate`,
                {},
            );
            goto(`/projects/${newProject.id}`);
        } catch (e: any) {
            error.set(e.message);
            saving.set(false);
        }
    }
</script>

<div class="page-header">
    <a href="/projects/{$page.params.id}/edit" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">Duplicate Project</h1>
</div>
<p class="text-muted mb-4">
    Create a new project from this one without affecting the original.
</p>

{#if $loading}
    <p class="text-muted">Loading…</p>
{:else if $error}
    <div class="alert alert-error">{$error}</div>
{:else if $project}
    <div class="card">
        <div class="card-body">
            <p class="mb-2">Source project: <strong>{$project.name}</strong></p>
            <div class="alert alert-warning mb-4">
                The duplicate will use the same name with a "(copy)" suffix.
                Tasks are not duplicated.
            </div>
            <button
                onclick={duplicate}
                disabled={$saving}
                class="btn btn-primary"
                >{$saving ? 'Duplicating…' : 'Duplicate Project'}</button
            >
        </div>
    </div>
{/if}
