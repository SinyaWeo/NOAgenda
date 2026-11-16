<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
  import { loadOnParamChange } from '$lib/param-loader.svelte';
  import { page } from '$app/state';
  import { Alert, Button, Card, Input, Select } from 'flowbite-svelte';
  import { CaretLeftSolid } from 'flowbite-svelte-icons';
  import UserPicker from '$lib/components/UserPicker.svelte';
  import { errMessage } from '$lib/errors';
  import { showToast } from '$lib/toast';
  import type { Permission, ProjectMember, Team, UserSummary } from '$lib/types';
  import type { ProjectTeamMember } from '$lib/types-misc';

  const projectId = () => page.params.id;
  const users = writable<ProjectMember[]>([]);
  const teams = writable<ProjectTeamMember[]>([]);
  const allTeams = writable<Team[]>([]);
  const loading = writable(true);
  const error = writable('');
  let newUser = $state<UserSummary | null>(null);
  let picker: ReturnType<typeof UserPicker> | undefined = $state();
  let newTeamId = $state('');
  let newPermission = $state<Permission>('read');

  const memberIds = $derived(
    $users.map((m) => m.user?.id).filter((id): id is number => id != null),
  );

  async function reload() {
    const [u, t] = await Promise.all([
      apiGetAuth<ProjectMember[]>(`/projects/${projectId()}/users`),
      apiGetAuth<ProjectTeamMember[]>(`/projects/${projectId()}/teams`),
    ]);
    users.set(u);
    teams.set(t);
  }

  async function load(id: string, isStale: () => boolean) {
    const [u, t, at] = await Promise.all([
      apiGetAuth<ProjectMember[]>(`/projects/${id}/users`),
      apiGetAuth<ProjectTeamMember[]>(`/projects/${id}/teams`),
      apiGetAuth<Team[]>('/teams').catch(() => [] as Team[]),
    ]);
    if (isStale()) return;
    users.set(u);
    teams.set(t);
    allTeams.set(at);
  }

  loadOnParamChange(() => page.params.id ?? '', load, loading, error);

  async function addUser(e: Event) {
    e.preventDefault();
    if (!newUser) return;
    try {
      await apiPostAuth(`/projects/${projectId()}/users`, {
        userId: newUser.id,
        permission: newPermission,
      });
      picker?.reset();
      await reload();
    } catch (e: unknown) {
      showToast(errMessage(e), 'error');
    }
  }
  async function removeUser(userId: number) {
    try {
      await apiDeleteAuth(`/projects/${projectId()}/users/${userId}`);
      await reload();
    } catch (e: unknown) {
      showToast(errMessage(e), 'error');
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
      await reload();
    } catch (e: unknown) {
      showToast(errMessage(e), 'error');
    }
  }
  async function removeTeam(teamId: number) {
    try {
      await apiDeleteAuth(`/projects/${projectId()}/teams/${teamId}`);
      await reload();
    } catch (e: unknown) {
      showToast(errMessage(e), 'error');
    }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a
    href="/projects/{page.params.id}/edit"
    class="text-gray-400 hover:text-gray-600"
    ><CaretLeftSolid class="w-4 h-4 inline mr-1" /> Back</a
  >
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
    Share Project
  </h1>
</div>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else}
  <Card class="mb-4">
    <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
      Users
    </h2>
    <form onsubmit={addUser} class="flex gap-2 mb-4 flex-wrap items-start">
      <UserPicker
        id="project-member-picker"
        label="Add a user"
        bind:selected={newUser}
        excludeIds={memberIds}
        bind:this={picker}
      />
      <Select bind:value={newPermission} class="w-auto self-start mt-6" aria-label="Permission">
        <option value="read">Read</option><option value="write">Write</option
        ><option value="admin">Admin</option>
      </Select>
      <Button type="submit" disabled={!newUser} class="self-start mt-6">Add User</Button>
    </form>
    {#if $users.length}
      {#each $users as u, i (u.id)}
        <div
          class="flex items-center gap-3 py-2 {i < $users.length - 1
            ? 'border-b border-gray-100 dark:border-gray-700'
            : ''}"
        >
          <span class="flex-1 font-medium text-gray-900 dark:text-white"
            >{u.user
              ? u.user.name || u.user.username || `User #${u.user.id}`
              : `User #${u.id}`}</span
          >
          <span class="text-xs text-gray-400">{u.permission ?? '—'}</span>
          <Button
            size="sm"
            color="red"
            onclick={() => removeUser(u.user?.id ?? u.id)}>Remove</Button
          >
        </div>
      {/each}
    {:else}<p class="text-sm text-gray-400 m-0">No users added yet.</p>{/if}
  </Card>

  <Card>
    <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
      Teams
    </h2>
    <form onsubmit={addTeam} class="flex gap-2 mb-4 flex-wrap">
      {#if $allTeams.length}
        <Select bind:value={newTeamId} required class="flex-1 min-w-36">
          <option value="">Select team…</option>
          {#each $allTeams as t (t.id)}<option value={String(t.id)}>{t.name}</option
            >{/each}
        </Select>
      {:else}
        <Input
          type="number"
          bind:value={newTeamId}
          placeholder="Team ID"
          required
          min="1"
          class="w-28"
        />
      {/if}
      <Select bind:value={newPermission} class="w-auto">
        <option value="read">Read</option><option value="write">Write</option
        ><option value="admin">Admin</option>
      </Select>
      <Button type="submit">Add Team</Button>
    </form>
    {#if $teams.length}
      {#each $teams as t, i (t.id)}
        <div
          class="flex items-center gap-3 py-2 {i < $teams.length - 1
            ? 'border-b border-gray-100 dark:border-gray-700'
            : ''}"
        >
          <span class="flex-1 font-medium text-gray-900 dark:text-white"
            >{t.team
              ? (t.team.name ?? `Team #${t.team.id}`)
              : `Team #${t.id}`}</span
          >
          <span class="text-xs text-gray-400">{t.permission ?? '—'}</span>
          <Button
            size="sm"
            color="red"
            onclick={() => removeTeam(t.team?.id ?? t.id)}>Remove</Button
          >
        </div>
      {/each}
    {:else}<p class="text-sm text-gray-400 m-0">No teams added yet.</p>{/if}
  </Card>
{/if}
