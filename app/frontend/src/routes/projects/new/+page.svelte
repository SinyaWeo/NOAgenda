<script lang="ts">
    import { writable } from 'svelte/store';
    import { apiPostAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    const name = writable('');
    const description = writable('');
    const error = writable('');
    const loading = writable(false);

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
        }
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        loading.set(true);
        error.set('');
        try {
            const project = await apiPostAuth<any>('/projects', {
                name: $name,
                description: $description,
            });
            goto(`/projects/${project.id}`);
        } catch (err: any) {
            error.set(err.message ?? 'Failed to create project');
        } finally {
            loading.set(false);
        }
    }
</script>

<div style="max-width:560px">
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
        <a
            href="/projects"
            style="color:#64748b;text-decoration:none;font-size:1.25rem">←</a
        >
        <h1 style="margin:0">New Project</h1>
    </div>

    {#if $error}<p
            style="color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:0.6rem 1rem;margin-bottom:1rem"
        >
            {$error}
        </p>{/if}

    <form
        onsubmit={handleSubmit}
        style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,0.04);display:flex;flex-direction:column;gap:1rem"
    >
        <div style="display:flex;flex-direction:column;gap:0.3rem">
            <label
                for="proj-name"
                style="font-size:0.85rem;font-weight:500;color:#475569"
                >Name <span style="color:#ef4444">*</span></label
            >
            <input
                id="proj-name"
                type="text"
                bind:value={$name}
                required
                style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem"
            />
        </div>
        <div style="display:flex;flex-direction:column;gap:0.3rem">
            <label
                for="proj-desc"
                style="font-size:0.85rem;font-weight:500;color:#475569"
                >Description</label
            >
            <textarea
                id="proj-desc"
                bind:value={$description}
                rows={4}
                style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem;resize:vertical"
            ></textarea>
        </div>
        <div
            style="display:flex;gap:0.75rem;justify-content:flex-end;padding-top:0.5rem;border-top:1px solid #f1f5f9"
        >
            <a
                href="/projects"
                style="padding:0.5rem 1rem;border:1px solid #e2e8f0;border-radius:6px;text-decoration:none;color:#475569;font-size:0.9rem"
                >Cancel</a
            >
            <button
                type="submit"
                disabled={$loading}
                style="background:#6366f1;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:6px;cursor:pointer;font-size:0.9rem"
                >{$loading ? 'Creating…' : 'Create Project'}</button
            >
        </div>
    </form>
</div>
