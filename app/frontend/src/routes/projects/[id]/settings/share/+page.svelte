<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    const projectId = () => $page.params.id;
    const users = writable<any[]>([]);
    const teams = writable<any[]>([]);
    const allUsers = writable<any[]>([]);
    const allTeams = writable<any[]>([]);
    const loading = writable(true);
    const error = writable('');
    let newUserId = '';
    let newTeamId = '';
    let newPermission = 'read';

    async function load() {
        const [u, t, au, at] = await Promise.all([
            apiGetAuth<any[]>(`/projects/${projectId()}/users`),
            apiGetAuth<any[]>(`/projects/${projectId()}/teams`),
            apiGetAuth<any[]>('/users').catch(() => []),
            apiGetAuth<any[]>('/teams').catch(() => []),
        ]);
        users.set(u);
        teams.set(t);
        allUsers.set(au);
        allTeams.set(at);
    }

    async function addUser(e: Event) {
        e.preventDefault();
        try {
            await apiPostAuth(`/projects/${projectId()}/users`, {
                userId: Number(newUserId),
                permission: newPermission,
            });
            newUserId = '';
            await load();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    async function removeUser(userId: number) {
        try {
            await apiDeleteAuth(`/projects/${projectId()}/users/${userId}`);
            await load();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    async function addTeam(e: Event) {
        e.preventDefault();
        try {
            await apiPostAuth(`/projects/${projectId()}/teams`, {
                teamId: Number(newTeamId),
                permission: newPermission,
            });
            newTeamId = '';
            await load();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    async function removeTeam(teamId: number) {
        try {
            await apiDeleteAuth(`/projects/${projectId()}/teams/${teamId}`);
            await load();
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
            await load();
        } catch (e: any) {
            error.set(e.message);
        } finally {
            loading.set(false);
        }
    });
</script>

<div style="max-width:600px">
    <div
        style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"
    >
        <a
            href="/projects/{$page.params.id}/edit"
            style="color:#6b7280;text-decoration:none;font-size:1.2rem"
            >&#8592;</a
        >
        <h1 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0">
            Share Project
        </h1>
    </div>

    {#if $error}
        <div
            style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.875rem"
        >
            {$error}
        </div>
    {/if}

    {#if $loading}
        <p style="color:#64748b">Loading…</p>
    {:else}
        <div
            style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem;margin-bottom:1.25rem"
        >
            <h2
                style="font-size:0.95rem;font-weight:600;color:#374151;margin:0 0 1rem"
            >
                Users
            </h2>
            <form
                onsubmit={addUser}
                style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap"
            >
                {#if $allUsers.length}
                    <select
                        bind:value={newUserId}
                        required
                        style="flex:1;min-width:120px;padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;background:#fff"
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
                        bind:value={newUserId}
                        placeholder="User ID"
                        required
                        min="1"
                        style="width:120px;padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem"
                    />
                {/if}
                <select
                    bind:value={newPermission}
                    style="padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;background:#fff"
                >
                    <option value="read">Read</option>
                    <option value="write">Write</option>
                    <option value="admin">Admin</option>
                </select>
                <button
                    type="submit"
                    style="padding:0.55rem 1rem;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:0.9rem;cursor:pointer"
                    >Add User</button
                >
            </form>
            {#if $users.length}
                <div style="display:flex;flex-direction:column;gap:0.5rem">
                    {#each $users as u}
                        <div
                            style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px"
                        >
                            <span style="font-size:0.875rem;color:#374151"
                                >{u.user
                                    ? u.user.name ||
                                      u.user.username ||
                                      `User #${u.user.id}`
                                    : `User #${u.id}`}
                                <span style="color:#94a3b8"
                                    >&middot; {u.permission ?? '—'}</span
                                ></span
                            >
                            <button
                                onclick={() => removeUser(u.user?.id ?? u.id)}
                                style="padding:0.3rem 0.7rem;background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;border-radius:5px;cursor:pointer;font-size:0.8rem"
                                >Remove</button
                            >
                        </div>
                    {/each}
                </div>
            {:else}
                <p style="color:#94a3b8;font-size:0.875rem;margin:0">
                    No users added yet.
                </p>
            {/if}
        </div>

        <div
            style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem"
        >
            <h2
                style="font-size:0.95rem;font-weight:600;color:#374151;margin:0 0 1rem"
            >
                Teams
            </h2>
            <form
                onsubmit={addTeam}
                style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap"
            >
                {#if $allTeams.length}
                    <select
                        bind:value={newTeamId}
                        required
                        style="flex:1;min-width:120px;padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;background:#fff"
                    >
                        <option value="">Select team…</option>
                        {#each $allTeams as t}
                            <option value={String(t.id)}>{t.name}</option>
                        {/each}
                    </select>
                {:else}
                    <input
                        type="number"
                        bind:value={newTeamId}
                        placeholder="Team ID"
                        required
                        min="1"
                        style="width:120px;padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem"
                    />
                {/if}
                <select
                    bind:value={newPermission}
                    style="padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;background:#fff"
                >
                    <option value="read">Read</option>
                    <option value="write">Write</option>
                    <option value="admin">Admin</option>
                </select>
                <button
                    type="submit"
                    style="padding:0.55rem 1rem;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:0.9rem;cursor:pointer"
                    >Add Team</button
                >
            </form>
            {#if $teams.length}
                <div style="display:flex;flex-direction:column;gap:0.5rem">
                    {#each $teams as t}
                        <div
                            style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px"
                        >
                            <span style="font-size:0.875rem;color:#374151"
                                >{t.team
                                    ? (t.team.name ?? `Team #${t.team.id}`)
                                    : `Team #${t.id}`}
                                <span style="color:#94a3b8"
                                    >&middot; {t.permission ?? '—'}</span
                                ></span
                            >
                            <button
                                onclick={() => removeTeam(t.team?.id ?? t.id)}
                                style="padding:0.3rem 0.7rem;background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;border-radius:5px;cursor:pointer;font-size:0.8rem"
                                >Remove</button
                            >
                        </div>
                    {/each}
                </div>
            {:else}
                <p style="color:#94a3b8;font-size:0.875rem;margin:0">
                    No teams added yet.
                </p>
            {/if}
        </div>
    {/if}
</div>
