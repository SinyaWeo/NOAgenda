<script lang="ts">
  import { page } from '$app/state';
  import { apiGetAuth } from '$lib/api';
  import { loadOnParamChange } from '$lib/param-loader.svelte';
  import { writable } from 'svelte/store';
  import type { Team, TeamMember } from '$lib/types';
  import { Alert, Button, Card } from 'flowbite-svelte';
  import { CaretLeftSolid } from 'flowbite-svelte-icons';

  const team = writable<Team | null>(null);
  const members = writable<TeamMember[]>([]);
  const loading = writable(true);
  const error = writable('');

  async function loadTeam(id: string, isStale: () => boolean) {
    const [t, m] = await Promise.all([
      apiGetAuth<Team>(`/teams/${id}`),
      apiGetAuth<TeamMember[]>(`/team-members?teamId=${id}`),
    ]);
    if (isStale()) return;
    team.set(t);
    members.set(m);
  }

  loadOnParamChange(() => page.params.id ?? '', loadTeam, loading, error);
</script>

{#if $loading}
  <p class="text-gray-400">Loading...</p>
{:else if $error}
  <Alert color="red">{$error}</Alert>
{:else if $team}
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-3">
      <a href="/teams" class="text-gray-400 hover:text-gray-600"
        ><CaretLeftSolid class="w-4 h-4 inline mr-1" /> Back</a
      >
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
        {$team.name}
      </h1>
    </div>
    <Button href="/teams/{$team.id}/edit" color="light" size="sm"
      >Edit Team</Button
    >
  </div>
  {#if $team.description}<p class="text-gray-500 mb-4">
      {$team.description}
    </p>{/if}

  <Card>
    <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
      Members
    </h2>
    {#if $members.length}
      {#each $members as member, i (member.id)}
        <div
          class="flex items-center gap-3 py-2 {i < $members.length - 1
            ? 'border-b border-gray-100 dark:border-gray-700'
            : ''}"
        >
          <div
            class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 shrink-0"
          >
            {(member.user?.name ??
              member.user?.username ??
              'U')[0].toUpperCase()}
          </div>
          <span class="text-sm text-gray-800 dark:text-gray-200"
            >{member.user?.name ||
              member.user?.username ||
              `User #${member.user?.id ?? member.id}`}</span
          >
        </div>
      {/each}
    {:else}
      <p class="text-sm text-gray-400">No members yet.</p>
    {/if}
  </Card>
{:else}
  <p class="text-gray-400">Team not found.</p>
{/if}
