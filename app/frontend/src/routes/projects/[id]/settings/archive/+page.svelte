<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { apiGetAuth, apiPatchAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { writable } from 'svelte/store';

    const project = writable<any>(null);
    const loading = writable(true);
    const saving = writable(false);
    const error = writable('');
    const success = writable('');

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

    async function toggleArchive() {
        const p = $project;
        if (!p) return;
        saving.set(true);
        error.set('');
        success.set('');
        try {
            const endpoint = p.isArchived
                ? `/projects/${p.id}/unarchive`
                : `/projects/${p.id}/archive`;
            const updated = await apiPatchAuth<any>(endpoint, {});
            project.set(updated);
            success.set(
                updated.isArchived ? 'Project archived.' : 'Project restored.',
            );
        } catch (e: any) {
            error.set(e.message);
        } finally {
            saving.set(false);
        }
    }
</script>

<div class="page-header">
    <a href="/projects/{$page.params.id}/edit" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">Archive Project</h1>
</div>
<p class="text-muted mb-4">
    Manage whether this project appears in your active project list.
</p>

{#if $loading}
    <p class="text-muted">Loading…</p>
{:else if $error}
    <div class="alert alert-error">{$error}</div>
{:else if $project}
    <div class="card">
        <div class="card-body">
            {#if $success}<div class="alert alert-success mb-4">
                    {$success}
                </div>{/if}
            <p class="mb-2">Project: <strong>{$project.name}</strong></p>
            <p class="mb-4">
                Status: <strong
                    class={$project.isArchived ? 'text-danger' : 'text-success'}
                    >{$project.isArchived ? 'Archived' : 'Active'}</strong
                >
            </p>
            {#if $project.isArchived}
                <p class="text-muted mb-4">
                    This project is hidden from the main list and can be
                    restored at any time.
                </p>
                <button
                    onclick={toggleArchive}
                    disabled={$saving}
                    class="btn btn-primary"
                    >{$saving ? 'Restoring…' : 'Restore Project'}</button
                >
            {:else}
                <p class="text-muted mb-4">
                    Archiving will hide this project from active listings while
                    preserving its data.
                </p>
                <button
                    onclick={toggleArchive}
                    disabled={$saving}
                    class="btn btn-secondary"
                    >{$saving ? 'Archiving…' : 'Archive Project'}</button
                >
            {/if}
        </div>
    </div>
{/if}
