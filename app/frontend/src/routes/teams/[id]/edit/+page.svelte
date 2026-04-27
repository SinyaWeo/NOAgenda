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
    <p style="color:#64748b">Loading…</p>
{:else}
    <div style="max-width:560px">
        <div
            style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"
        >
            <a
                href="/teams/{$page.params.id}"
                style="color:#6b7280;text-decoration:none;font-size:1.2rem"
                >&#8592;</a
            >
            <h1
                style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0"
            >
                Edit Team
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
                        for="team-name"
                        style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
                        >Name <span style="color:#ef4444">*</span></label
                    >
                    <input
                        id="team-name"
                        type="text"
                        bind:value={$name}
                        required
                        style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box"
                    />
                </div>
                <div>
                    <label
                        for="team-desc"
                        style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
                        >Description</label
                    >
                    <textarea
                        id="team-desc"
                        bind:value={$description}
                        rows={3}
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
                        href="/teams/{$page.params.id}"
                        style="padding:0.6rem 1.25rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;color:#374151;text-decoration:none;background:#fff"
                        >Cancel</a
                    >
                </div>
            </form>
        </div>

        <div
            style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem;margin-bottom:1.5rem"
        >
            <h2
                style="font-size:1rem;font-weight:600;color:#1e293b;margin:0 0 1rem"
            >
                Members
            </h2>
            <form
                onsubmit={(e) => {
                    e.preventDefault();
                    addMember();
                }}
                style="display:flex;gap:0.5rem;margin-bottom:1rem"
            >
                {#if $allUsers.length}
                    <select
                        bind:value={newMemberUserId}
                        style="flex:1;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem"
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
                        style="flex:1;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem"
                    />
                {/if}
                <button
                    type="submit"
                    style="padding:0.6rem 1rem;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:0.9rem;cursor:pointer"
                    >Add</button
                >
            </form>
            {#if $members.length}
                <ul
                    style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.5rem"
                >
                    {#each $members as member}
                        <li
                            style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px"
                        >
                            <span style="font-size:0.9rem;color:#374151"
                                >{member.user
                                    ? member.user.name ||
                                      member.user.username ||
                                      `User #${member.user.id}`
                                    : `Member #${member.id}`}</span
                            >
                            <button
                                onclick={() => removeMember(member.id)}
                                style="padding:0.3rem 0.7rem;background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;border-radius:5px;cursor:pointer;font-size:0.8rem"
                                >Remove</button
                            >
                        </li>
                    {/each}
                </ul>
            {:else}
                <p style="color:#94a3b8;font-size:0.9rem;margin:0">
                    No members yet.
                </p>
            {/if}
        </div>

        <div
            style="background:#fff;border:1px solid #fca5a5;border-radius:10px;padding:1.5rem"
        >
            <h2
                style="font-size:1rem;font-weight:600;color:#b91c1c;margin:0 0 0.75rem"
            >
                Danger Zone
            </h2>
            <div
                style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2"
            >
                <div>
                    <div
                        style="font-size:0.875rem;font-weight:500;color:#b91c1c"
                    >
                        Delete Team
                    </div>
                    <div style="font-size:0.8rem;color:#f87171">
                        Permanently removes this team and all its members
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
{/if}
