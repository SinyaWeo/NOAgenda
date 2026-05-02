<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, apiPutAuth, apiDeleteAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    const project = writable<any>(null);
    const name = writable('');
    const description = writable('');
    const error = writable('');
    const loading = writable(true);
    const saving = writable(false);

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
            return;
        }
        const id = $page.params.id;
        try {
            const p = await apiGetAuth<any>(`/projects/${id}`);
            project.set(p);
            name.set(p.name ?? '');
            description.set(p.description ?? '');
        } catch (e: any) {
            error.set(e.message);
        } finally {
            loading.set(false);
        }
    });

    async function handleSave(e: SubmitEvent) {
        e.preventDefault();
        saving.set(true);
        error.set('');
        try {
            await apiPutAuth(`/projects/${$page.params.id}`, {
                name: $name,
                description: $description,
            });
            goto(`/projects/${$page.params.id}`);
        } catch (e: any) {
            error.set(e.message);
        } finally {
            saving.set(false);
        }
    }

    async function handleDelete() {
        if (
            !confirm(
                'Delete this project and all its tasks? This cannot be undone.',
            )
        )
            return;
        try {
            await apiDeleteAuth(`/projects/${$page.params.id}`);
            goto('/projects');
        } catch (e: any) {
            error.set(e.message);
        }
    }

    async function handleDuplicate() {
        try {
            const copy = await apiPutAuth<any>(
                `/projects/${$page.params.id}/duplicate`,
                {},
            );
            goto(`/projects/${copy.id}`);
        } catch (e: any) {
            error.set(e.message);
        }
    }
</script>

{#if $loading}
    <p class="text-muted">Loading…</p>
{:else}
    <div class="page-header">
        <a href="/projects/{$page.params.id}" class="back-link"
            ><span class="icon icon-sm">arrow_back</span></a
        >
        <h1 class="page-title">Edit Project</h1>
    </div>

    {#if $error}<div class="alert alert-error">{$error}</div>{/if}

    <div class="card mb-4">
        <div class="card-body">
            <form onsubmit={handleSave}>
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
                    <label for="proj-desc" class="form-label">Description</label
                    >
                    <textarea
                        id="proj-desc"
                        bind:value={$description}
                        rows={4}
                        class="form-textarea"
                    ></textarea>
                </div>
                <div class="page-actions">
                    <button
                        type="submit"
                        disabled={$saving}
                        class="btn btn-primary"
                        >{$saving ? 'Saving…' : 'Save Changes'}</button
                    >
                    <a
                        href="/projects/{$page.params.id}"
                        class="btn btn-secondary">Cancel</a
                    >
                </div>
            </form>
        </div>
    </div>

    <div class="danger-zone">
        <h2 class="danger-zone-title">Danger Zone</h2>
        <div class="list">
            <div class="list-item">
                <div class="list-item-body">
                    <div class="font-medium">Archive / Restore</div>
                    <div class="text-sm text-muted">
                        Toggle archive status of this project
                    </div>
                </div>
                <a
                    href="/projects/{$page.params.id}/settings/archive"
                    class="btn btn-sm btn-secondary">Archive</a
                >
            </div>
            <div class="list-item">
                <div class="list-item-body">
                    <div class="font-medium">Duplicate Project</div>
                    <div class="text-sm text-muted">
                        Create a copy of this project
                    </div>
                </div>
                <a
                    href="/projects/{$page.params.id}/settings/duplicate"
                    class="btn btn-sm btn-secondary">Duplicate</a
                >
            </div>
            <div class="list-item">
                <div class="list-item-body">
                    <div class="font-medium text-danger">Delete Project</div>
                    <div class="text-sm text-muted">
                        Permanently deletes project and all tasks
                    </div>
                </div>
                <button onclick={handleDelete} class="btn btn-sm btn-danger"
                    >Delete</button
                >
            </div>
        </div>
    </div>
{/if}
