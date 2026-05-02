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

<div class="page-header">
	<a href="/projects/{$page.params.id}/edit" class="back-link"><span class="icon icon-sm">arrow_back</span></a>
	<h1 class="page-title">Share Project</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}

{#if $loading}
	<p class="text-muted">Loading…</p>
{:else}
	<div class="card mb-4">
		<div class="card-header"><h2 class="card-title">Users</h2></div>
		<div class="card-body">
			<form onsubmit={addUser} class="inline-form mb-4">
				{#if $allUsers.length}
					<select bind:value={newUserId} required class="form-select" style="flex:1;min-width:120px">
						<option value="">Select user…</option>
						{#each $allUsers as u}
							<option value={String(u.id)}>{u.name || u.username || `User #${u.id}`}</option>
						{/each}
					</select>
				{:else}
					<input type="number" bind:value={newUserId} placeholder="User ID" required min="1" class="form-input" style="width:120px" />
				{/if}
				<select bind:value={newPermission} class="form-select">
					<option value="read">Read</option>
					<option value="write">Write</option>
					<option value="admin">Admin</option>
				</select>
				<button type="submit" class="btn btn-primary">Add User</button>
			</form>
			{#if $users.length}
				<div class="list">
					{#each $users as u}
						<div class="list-item">
							<div class="list-item-body">
								<span class="font-medium">{u.user ? u.user.name || u.user.username || `User #${u.user.id}` : `User #${u.id}`}</span>
								<span class="text-xs text-muted">· {u.permission ?? '—'}</span>
							</div>
							<button onclick={() => removeUser(u.user?.id ?? u.id)} class="btn btn-sm btn-danger">Remove</button>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted text-sm mb-0">No users added yet.</p>
			{/if}
		</div>
	</div>

	<div class="card">
		<div class="card-header"><h2 class="card-title">Teams</h2></div>
		<div class="card-body">
			<form onsubmit={addTeam} class="inline-form mb-4">
				{#if $allTeams.length}
					<select bind:value={newTeamId} required class="form-select" style="flex:1;min-width:120px">
						<option value="">Select team…</option>
						{#each $allTeams as t}
							<option value={String(t.id)}>{t.name}</option>
						{/each}
					</select>
				{:else}
					<input type="number" bind:value={newTeamId} placeholder="Team ID" required min="1" class="form-input" style="width:120px" />
				{/if}
				<select bind:value={newPermission} class="form-select">
					<option value="read">Read</option>
					<option value="write">Write</option>
					<option value="admin">Admin</option>
				</select>
				<button type="submit" class="btn btn-primary">Add Team</button>
			</form>
			{#if $teams.length}
				<div class="list">
					{#each $teams as t}
						<div class="list-item">
							<div class="list-item-body">
								<span class="font-medium">{t.team ? (t.team.name ?? `Team #${t.team.id}`) : `Team #${t.id}`}</span>
								<span class="text-xs text-muted">· {t.permission ?? '—'}</span>
							</div>
							<button onclick={() => removeTeam(t.team?.id ?? t.id)} class="btn btn-sm btn-danger">Remove</button>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted text-sm mb-0">No teams added yet.</p>
			{/if}
		</div>
	</div>
{/if}
