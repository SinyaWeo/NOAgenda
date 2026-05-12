<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiPostAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Alert, Button, Card, Input, Label, Textarea } from 'flowbite-svelte';
  import { CaretLeftSolid } from 'flowbite-svelte-icons';

  const name = writable('');
  const description = writable('');
  const error = writable('');
  const loading = writable(false);

  onMount(async () => {
    const me = await getCurrentUser();
    if (!me) goto('/user/login');
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

<div class="flex items-center gap-3 mb-6">
  <a href="/teams" class="text-gray-400 hover:text-gray-600"
    ><CaretLeftSolid class="w-4 h-4 inline mr-1" /> Back</a
  >
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">New Team</h1>
</div>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="max-w-xl">
  <form onsubmit={handleSubmit} class="flex flex-col gap-4">
    <div>
      <Label for="team-name" class="mb-1"
        >Name <span class="text-red-500">*</span></Label
      >
      <Input id="team-name" type="text" bind:value={$name} required />
    </div>
    <div>
      <Label for="team-desc" class="mb-1">Description</Label>
      <Textarea id="team-desc" bind:value={$description} rows={3} />
    </div>
    <div class="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
      <Button type="submit" disabled={$loading}
        >{$loading ? 'Creating…' : 'Create Team'}</Button
      >
      <Button href="/teams" color="light">Cancel</Button>
    </div>
  </form>
</Card>
