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

<div style="max-width:760px">
    <h1 style="margin-bottom:0.4rem">Archive Project</h1>
    <p style="margin:0 0 1.25rem;color:#64748b">
        Manage whether this project appears in your active project list.
    </p>

    {#if $loading}
        <p>Loading…</p>
    {:else if $error}
        <p
            style="color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:0.6rem 1rem"
        >
            {$error}
        </p>
    {:else if $project}
        <section
            style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)"
        >
            {#if $success}
                <p
                    style="margin:0 0 1rem;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:0.55rem 0.8rem"
                >
                    {$success}
                </p>
            {/if}

            <p style="margin:0 0 0.8rem">
                Project: <strong>{$project.name}</strong>
            </p>
            <p style="margin:0 0 1rem;color:#64748b">
                Status:
                <strong
                    style="color:{$project.isArchived ? '#b45309' : '#15803d'}"
                >
                    {$project.isArchived ? 'Archived' : 'Active'}
                </strong>
            </p>

            {#if $project.isArchived}
                <p style="margin:0 0 1rem;color:#64748b">
                    This project is hidden from the main list and can be
                    restored at any time.
                </p>
                <button
                    onclick={toggleArchive}
                    disabled={$saving}
                    style="background:#6366f1;color:#fff;border:none;padding:0.55rem 1.25rem;border-radius:6px;cursor:pointer"
                >
                    {$saving ? 'Restoring…' : 'Restore Project'}
                </button>
            {:else}
                <p style="margin:0 0 1rem;color:#64748b">
                    Archiving will hide this project from active listings while
                    preserving its data.
                </p>
                <button
                    onclick={toggleArchive}
                    disabled={$saving}
                    style="background:#f59e0b;color:#fff;border:none;padding:0.55rem 1.25rem;border-radius:6px;cursor:pointer"
                >
                    {$saving ? 'Archiving…' : 'Archive Project'}
                </button>
            {/if}
        </section>

        <p style="margin-top:1rem">
            <a href="/projects/{$project.id}/edit">← Back to project settings</a
            >
        </p>
    {/if}
</div>
