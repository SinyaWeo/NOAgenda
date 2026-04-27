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

<div style="max-width:760px">
    <h1 style="margin-bottom:0.4rem">Duplicate Project</h1>
    <p style="margin:0 0 1.25rem;color:#64748b">
        Create a new project from this one without affecting the original.
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
            <p style="margin:0 0 0.9rem">
                Source project: <strong>{$project.name}</strong>
            </p>
            <p
                style="margin:0 0 1rem;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:0.55rem 0.8rem"
            >
                The duplicate will use the same name with a "(copy)" suffix.
                Tasks are not duplicated.
            </p>
            <button
                onclick={duplicate}
                disabled={$saving}
                style="background:#6366f1;color:#fff;border:none;padding:0.55rem 1.25rem;border-radius:6px;cursor:pointer"
            >
                {$saving ? 'Duplicating…' : 'Duplicate Project'}
            </button>
        </section>

        <p style="margin-top:1rem">
            <a href="/projects/{$project.id}/edit">← Back to project settings</a
            >
        </p>
    {/if}
</div>
