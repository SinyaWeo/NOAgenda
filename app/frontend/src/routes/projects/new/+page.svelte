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

<div class="page-header">
    <a href="/projects" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">New Project</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}

<div class="card">
    <div class="card-body">
        <form onsubmit={handleSubmit}>
            <div class="form-group">
                <label for="proj-name" class="form-label"
                    >Name <span class="text-danger">*</span></label
                >
                <input
                    id="proj-name"
                    type="text"
                    bind:value={$name}
                    required
                    class="form-input"
                />
            </div>
            <div class="form-group">
                <label for="proj-desc" class="form-label">Description</label>
                <textarea
                    id="proj-desc"
                    bind:value={$description}
                    rows={4}
                    class="form-textarea"
                ></textarea>
            </div>
            <div class="page-actions">
                <a href="/projects" class="btn btn-secondary">Cancel</a>
                <button
                    type="submit"
                    disabled={$loading}
                    class="btn btn-primary"
                    >{$loading ? 'Creating…' : 'Create Project'}</button
                >
            </div>
        </form>
    </div>
</div>
