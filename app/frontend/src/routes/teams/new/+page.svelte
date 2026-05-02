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
            const team = await apiPostAuth<any>('/teams', {
                name: $name,
                description: $description,
            });
            goto(`/teams/${team.id}`);
        } catch (err: any) {
            error.set(err.message ?? 'Failed to create team');
        } finally {
            loading.set(false);
        }
    }
</script>

<div class="page-header">
    <a href="/teams" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">New Team</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}

<div class="card">
    <div class="card-body">
        <form onsubmit={handleSubmit}>
            <div class="form-group">
                <label for="team-name" class="form-label"
                    >Name <span class="text-danger">*</span></label
                >
                <input
                    id="team-name"
                    type="text"
                    bind:value={$name}
                    required
                    class="form-input"
                />
            </div>
            <div class="form-group">
                <label for="team-desc" class="form-label">Description</label>
                <textarea
                    id="team-desc"
                    bind:value={$description}
                    rows={3}
                    class="form-textarea"
                ></textarea>
            </div>
            <div
                class="page-actions"
                style="border-top:1px solid var(--na-border);padding-top:0.75rem"
            >
                <button
                    type="submit"
                    disabled={$loading}
                    class="btn btn-primary"
                >
                    {$loading ? 'Creating…' : 'Create Team'}
                </button>
                <a href="/teams" class="btn btn-secondary">Cancel</a>
            </div>
        </form>
    </div>
</div>
