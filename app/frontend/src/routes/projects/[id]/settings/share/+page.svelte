<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Alert, Button, Card, Input, Select } from 'flowbite-svelte';

  const projectId = () => page.params.id;
  const users = writable<any[]>([]);
  const teams = writable<any[]>([]);
  const allUsers = writable<any[]>([]);
  const allTeams = writable<any[]>([]);
  const loading = writable(true);
  const error = writable('');
  let newUserId = $state('');
  let newTeamId = $state('');
  let newPermission = $state('read');

  async function load() {
    const [u, t, au, at] = await Promise.all([apiGetAuth<any[]>(`/projects/${projectId()}/users`), apiGetAuth<any[]>(`/projects/${projectId()}/teams`), apiGetAuth<any[]>('/users').catch(() => []), apiGetAuth<any[]>('/teams').catch(() => [])]);
    users.set(u); teams.set(t); allUsers.set(au); allTeams.set(at);
  }

  async function addUser(e: Event) {
    e.preventDefault();
    try { await apiPostAuth(`/projects/${projectId()}/users`, { userId: Number(newUserId), permission: newPermission }); newUserId = ''; await load(); }
    catch (e: any) { error.set(e.message); }
  }
  async function removeUser(userId: number) {
    try { await apiDeleteAuth(`/projects/${projectId()}/users/${userId}`); await load(); }
    catch (e: any) { error.set(e.message); }
  }
  async function addTeam(e: Event) {
    e.preventDefault();
    try { await apiPostAuth(`/projects/${projectId()}/teams`, { teamId: Number(newTeamId), permission: newPermission }); newTeamId = ''; await load(); }
    catch (e: any) { error.set(e.message); }
  }
  async function removeTeam(teamId: number) {
    try { await apiDeleteAuth(`/projects/${projectId()}/teams/${teamId}`); await load(); }
    catch (e: any) { error.set(e.message); }
  }

  onMount(async () => {
    const me = await getCurrentUser(); if (!me) { goto('/user/login'); return; }
    try { await load(); } catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  });
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/projects/{page.params.id}/edit" class="text-gray-400 hover:text-gray-600">← Back</a>
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Share Project</h1>
</div>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else}
  <Card class="mb-4">
    <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Users</h2>
    <form onsubmit={addUser} class="flex gap-2 mb-4 flex-wrap">
      {#if $allUsers.length}
        <Select bind:value={newUserId} required class="flex-1 min-w-36">
          <option value="">Select user…</option>
          {#each $allUsers as u}<option value={String(u.id)}>{u.name || u.username || `User #${u.id}`}</option>{/each}
        </Select>
      {:else}
        <Input type="number" bind:value={newUserId} placeholder="User ID" required min="1" class="w-28" />
      {/if}
      <Select bind:value={newPermission} class="w-auto">
        <option value="read">Read</option><option value="write">Write</option><option value="admin">Admin</option>
      </Select>
      <Button type="submit">Add User</Button>
    </form>
    {#if $users.length}
      {#each $users as u, i}
        <div class="flex items-center gap-3 py-2 {i < $users.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}">
          <span class="flex-1 font-medium text-gray-900 dark:text-white">{u.user ? u.user.name || u.user.username || `User #${u.user.id}` : `User #${u.id}`}</span>
          <span class="text-xs text-gray-400">{u.permission ?? '—'}</span>
          <Button size="sm" color="red" onclick={() => removeUser(u.user?.id ?? u.id)}>Remove</Button>
        </div>
      {/each}
    {:else}<p class="text-sm text-gray-400 m-0">No users added yet.</p>{/if}
  </Card>

  <Card>
    <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Teams</h2>
    <form onsubmit={addTeam} class="flex gap-2 mb-4 flex-wrap">
      {#if $allTeams.length}
        <Select bind:value={newTeamId} required class="flex-1 min-w-36">
          <option value="">Select team…</option>
          {#each $allTeams as t}<option value={String(t.id)}>{t.name}</option>{/each}
        </Select>
      {:else}
        <Input type="number" bind:value={newTeamId} placeholder="Team ID" required min="1" class="w-28" />
      {/if}
      <Select bind:value={newPermission} class="w-auto">
        <option value="read">Read</option><option value="write">Write</option><option value="admin">Admin</option>
      </Select>
      <Button type="submit">Add Team</Button>
    </form>
    {#if $teams.length}
      {#each $teams as t, i}
        <div class="flex items-center gap-3 py-2 {i < $teams.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}">
          <span class="flex-1 font-medium text-gray-900 dark:text-white">{t.team ? (t.team.name ?? `Team #${t.team.id}`) : `Team #${t.id}`}</span>
          <span class="text-xs text-gray-400">{t.permission ?? '—'}</span>
          <Button size="sm" color="red" onclick={() => removeTeam(t.team?.id ?? t.id)}>Remove</Button>
        </div>
      {/each}
    {:else}<p class="text-sm text-gray-400 m-0">No teams added yet.</p>{/if}
  </Card>
{/if}
