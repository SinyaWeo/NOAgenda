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
    <p style="color:#64748b">Loading…</p>
{:else}
    <div style="max-width:560px">
        <div
            style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"
        >
            <a
                href="/projects/{$page.params.id}"
                style="color:#6b7280;text-decoration:none;font-size:1.2rem"
                >&#8592;</a
            >
            <h1
                style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0"
            >
                Edit Project
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
            style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem;margin-bottom:1.5rem"
        >
            <form
                onsubmit={handleSave}
                style="display:flex;flex-direction:column;gap:1.1rem"
            >
                <div>
                    <label
                        for="proj-name"
                        style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
                        >Name <span style="color:#ef4444">*</span></label
                    >
                    <input
                        id="proj-name"
                        type="text"
                        bind:value={$name}
                        required
                        style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box"
                    />
                </div>
                <div>
                    <label
                        for="proj-desc"
                        style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
                        >Description</label
                    >
                    <textarea
                        id="proj-desc"
                        bind:value={$description}
                        rows={4}
                        style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box;resize:vertical"
                    ></textarea>
                </div>
                <div
                    style="display:flex;gap:0.75rem;padding-top:0.5rem;border-top:1px solid #f1f5f9"
                >
                    <button
                        type="submit"
                        disabled={$saving}
                        style="background:#6366f1;color:#fff;padding:0.6rem 1.25rem;border:none;border-radius:6px;font-size:0.9rem;font-weight:500;cursor:{$saving
                            ? 'not-allowed'
                            : 'pointer'};opacity:{$saving ? 0.7 : 1}"
                    >
                        {$saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <a
                        href="/projects/{$page.params.id}"
                        style="padding:0.6rem 1.25rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;color:#374151;text-decoration:none;background:#fff"
                        >Cancel</a
                    >
                </div>
            </form>
        </div>

        <div
            style="background:#fff;border:1px solid #fca5a5;border-radius:10px;padding:1.5rem"
        >
            <h2
                style="font-size:1rem;font-weight:600;color:#b91c1c;margin:0 0 1rem"
            >
                Danger Zone
            </h2>
            <div style="display:flex;flex-direction:column;gap:0.75rem">
                <div
                    style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;border:1px solid #e2e8f0;border-radius:6px"
                >
                    <div>
                        <div
                            style="font-size:0.875rem;font-weight:500;color:#374151"
                        >
                            Archive / Restore
                        </div>
                        <div style="font-size:0.8rem;color:#94a3b8">
                            Toggle archive status of this project
                        </div>
                    </div>
                    <a
                        href="/projects/{$page.params.id}/settings/archive"
                        style="padding:0.4rem 0.9rem;border:1px solid #f59e0b;border-radius:6px;color:#b45309;background:#fffbeb;text-decoration:none;font-size:0.85rem;font-weight:500"
                        >Archive</a
                    >
                </div>
                <div
                    style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;border:1px solid #e2e8f0;border-radius:6px"
                >
                    <div>
                        <div
                            style="font-size:0.875rem;font-weight:500;color:#374151"
                        >
                            Duplicate Project
                        </div>
                        <div style="font-size:0.8rem;color:#94a3b8">
                            Create a copy of this project
                        </div>
                    </div>
                    <a
                        href="/projects/{$page.params.id}/settings/duplicate"
                        style="padding:0.4rem 0.9rem;border:1px solid #a5b4fc;border-radius:6px;color:#4f46e5;background:#eef2ff;text-decoration:none;font-size:0.85rem;font-weight:500"
                        >Duplicate</a
                    >
                </div>
                <div
                    style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2"
                >
                    <div>
                        <div
                            style="font-size:0.875rem;font-weight:500;color:#b91c1c"
                        >
                            Delete Project
                        </div>
                        <div style="font-size:0.8rem;color:#f87171">
                            Permanently deletes project and all tasks
                        </div>
                    </div>
                    <button
                        onclick={handleDelete}
                        style="padding:0.4rem 0.9rem;border:1px solid #f87171;border-radius:6px;color:#fff;background:#ef4444;cursor:pointer;font-size:0.85rem;font-weight:500"
                        >Delete</button
                    >
                </div>
            </div>
        </div>
    </div>
{/if}
