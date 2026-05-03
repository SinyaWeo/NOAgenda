<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGetAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { Alert, Button, Card } from 'flowbite-svelte';
  import { UsersGroupOutline, PlusOutline } from 'flowbite-svelte-icons';

  const teams = writable<any[]>([]);
  const loading = writable(true);
  const error = writable('');

  onMount(async () => {
    const me = await getCurrentUser(); if (!me) { goto('/user/login'); return; }
    try { teams.set(await apiGetAuth<any[]>('/teams')); }
    catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  });
</script>

<div class="flex items-center justify-between mb-4">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Teams</h1>
  <Button href="/teams/new"><PlusOutline class="w-4 h-4 mr-1" />New Team</Button>
</div>

{#if $loading}
  <p class="text-gray-400">Loading teams...</p>
{:else if $error}
  <Alert color="red">{$error}</Alert>
{:else if $teams.length}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each $teams as team}
      <Card>
        <div class="flex flex-col gap-3 h-full">
          <div>
            <a href="/teams/{team.id}" class="font-bold text-gray-900 dark:text-white hover:underline">{team.name}</a>
            {#if team.description}<p class="text-sm text-gray-500 mt-1 mb-0">{team.description}</p>{/if}
          </div>
          {#if team.members?.length != null}
            <span class="text-xs text-gray-400">{team.members.length} member{team.members.length === 1 ? '' : 's'}</span>
          {/if}
          <div class="flex gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
            <Button href="/teams/{team.id}" color="light" size="sm">View</Button>
            <Button href="/teams/{team.id}/edit" color="light" size="sm">Edit</Button>
          </div>
        </div>
      </Card>
    {/each}
  </div>
{:else}
  <div class="text-center py-12 text-gray-400">
    <UsersGroupOutline class="w-12 h-12 mx-auto mb-3" />
    <p>No teams yet. <a href="/teams/new" class="text-primary-600 hover:underline">Create a team.</a></p>
  </div>
{/if}
