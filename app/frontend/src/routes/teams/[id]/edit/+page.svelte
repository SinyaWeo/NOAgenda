<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import {
        apiGetAuth,
        apiPutAuth,
        apiPostAuth,
        apiDeleteAuth,
    } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    const team = writable<any>(null);
    const members = writable<any[]>([]);
    const allUsers = writable<any[]>([]);
    const name = writable('');
    const description = writable('');
    const loading = writable(true);
    const error = writable('');
    const saving = writable(false);

    let newMemberUserId = '';

    async function loadTeam() {
        const id = $page.params.id;
        const [t, m, users] = await Promise.all([
            apiGetAuth<any>(`/teams/${id}`),
            apiGetAuth<any[]>(`/team-members?teamId=${id}`),
            apiGetAuth<any[]>('/users').catch(() => []),
        ]);
        team.set(t);
        name.set(t.name ?? '');
        description.set(t.description ?? '');
        members.set(m);
        allUsers.set(users);
    }

    async function handleSave(e: Event) {
        e.preventDefault();
        saving.set(true);
        try {
            await apiPutAuth(`/teams/${$page.params.id}`, {
                name: $name,
                description: $description,
            });
            goto(`/teams/${$page.params.id}`);
        } catch (e: any) {
            error.set(e.message);
        } finally {
            saving.set(false);
        }
    }

    async function addMember() {
        if (!newMemberUserId.trim()) return;
        try {
            await apiPostAuth('/team-members', {
                teamId: Number($page.params.id),
                userId: Number(newMemberUserId),
            });
            newMemberUserId = '';
            await loadTeam();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    async function removeMember(memberId: number) {
        try {
            await apiDeleteAuth(`/team-members/${memberId}`);
            await loadTeam();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    async function handleDelete() {
        if (!confirm('Delete this team?')) return;
        try {
            await apiDeleteAuth(`/teams/${$page.params.id}`);
            goto('/teams');
        } catch (e: any) {
            error.set(e.message);
        }
    }

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
            return;
        }
        try {
            await loadTeam();
        } catch (e: any) {
            error.set(e.message);
        } finally {
            loading.set(false);
        }
    });
</script>

{#if $loading}
    <p class="text-muted">Loading…</p>
{:else}
    <div class="page">
        <div class="page-header">
            <a href="/teams/{$page.params.id}" class="back-link">
                <span class="icon icon-sm">arrow_back</span>
            </a>
            <h1 class="page-title">Edit Team</h1>
        </div>

        {#if $error}
            <div class="alert alert-error">{$error}</div>
        {/if}

        <div class="card mb-6">
            <div class="card-body">
                <form onsubmit={handleSave}>
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
                        <label for="team-desc" class="form-label"
                            >Description</label
                        >
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
                            disabled={$saving}
                            class="btn btn-primary"
                        >
                            {$saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <a
                            href="/teams/{$page.params.id}"
                            class="btn btn-secondary">Cancel</a
                        >
                    </div>
                </form>
            </div>
        </div>

        <div class="card mb-6">
            <div class="card-header">
                <h2 class="card-title">Members</h2>
            </div>
            <div class="card-body">
                <form
                    onsubmit={(e) => {
                        e.preventDefault();
                        addMember();
                    }}
                    class="inline-form mb-4"
                >
                    {#if $allUsers.length}
                        <select
                            bind:value={newMemberUserId}
                            class="form-select"
                        >
                            <option value="">Select user…</option>
                            {#each $allUsers as u}
                                <option value={String(u.id)}
                                    >{u.name ||
                                        u.username ||
                                        `User #${u.id}`}</option
                                >
                            {/each}
                        </select>
                    {:else}
                        <input
                            type="number"
                            bind:value={newMemberUserId}
                            placeholder="User ID"
                            min="1"
                            class="form-input"
                        />
                    {/if}
                    <button type="submit" class="btn btn-primary">Add</button>
                </form>
                {#if $members.length}
                    <ul class="list">
                        {#each $members as member}
                            <li class="list-item">
                                <span class="list-item-body text-sm">
                                    {member.user
                                        ? member.user.name ||
                                          member.user.username ||
                                          `User #${member.user.id}`
                                        : `Member #${member.id}`}
                                </span>
                                <div class="list-item-actions">
                                    <button
                                        onclick={() => removeMember(member.id)}
                                        class="btn btn-sm btn-danger"
                                        >Remove</button
                                    >
                                </div>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="text-muted text-sm mb-0">No members yet.</p>
                {/if}
            </div>
        </div>

        <div class="danger-zone">
            <h2 class="danger-zone-title">
                <span class="icon icon-sm">warning</span> Danger Zone
            </h2>
            <div
                class="list-item"
                style="border:1px solid var(--na-danger-border);border-radius:var(--na-radius);background:var(--na-danger-bg)"
            >
                <div class="list-item-body">
                    <div class="text-sm font-bold text-danger">Delete Team</div>
                    <div class="text-xs text-danger">
                        Permanently removes this team and all its members
                    </div>
                </div>
                <button onclick={handleDelete} class="btn btn-sm btn-danger"
                    >Delete</button
                >
            </div>
        </div>
    </div>
{/if}
