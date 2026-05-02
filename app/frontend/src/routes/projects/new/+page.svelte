<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiPostAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Alert, Button, Card, Input, Label, Textarea } from 'flowbite-svelte';

  const name = writable('');
  const description = writable('');
  const error = writable('');
  const loading = writable(false);

  onMount(async () => { const me = await getCurrentUser(); if (!me) goto('/login'); });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading.set(true);
    error.set('');
    try {
      const project = await apiPostAuth<any>('/projects', { name: $name, description: $description });
      goto(`/projects/${project.id}`);
    } catch (err: any) { error.set(err.message ?? 'Failed to create project'); } finally { loading.set(false); }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/projects" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">← Back</a>
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">New Project</h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="max-w-xl">
  <form onsubmit={handleSubmit} class="flex flex-col gap-4">
    <div>
      <Label for="proj-name" class="mb-1">Name <span class="text-red-500">*</span></Label>
      <Input id="proj-name" type="text" bind:value={$name} required />
    </div>
    <div>
      <Label for="proj-desc" class="mb-1">Description</Label>
      <Textarea id="proj-desc" bind:value={$description} rows={4} />
    </div>
    <div class="flex gap-2">
      <Button type="submit" disabled={$loading}>{$loading ? 'Creating…' : 'Create Project'}</Button>
      <Button href="/projects" color="light">Cancel</Button>
    </div>
  </form>
</Card>
