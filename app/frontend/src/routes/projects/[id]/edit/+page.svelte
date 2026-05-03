<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { apiGetAuth, apiPutAuth, apiDeleteAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { Alert, Button, Card, Input, Label, Textarea } from 'flowbite-svelte';

  const project = writable<any>(null);
  const name = writable('');
  const description = writable('');
  const error = writable('');
  const loading = writable(true);
  const saving = writable(false);

  onMount(async () => {
    const me = await getCurrentUser(); if (!me) { goto('/login'); return; }
    try {
      const p = await apiGetAuth<any>(`/projects/${page.params.id}`);
      project.set(p); name.set(p.name ?? ''); description.set(p.description ?? '');
    } catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  });

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    saving.set(true); error.set('');
    try { await apiPutAuth(`/projects/${page.params.id}`, { name: $name, description: $description }); goto(`/projects/${page.params.id}`); }
    catch (e: any) { error.set(e.message); } finally { saving.set(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    try { await apiDeleteAuth(`/projects/${page.params.id}`); goto('/projects'); }
    catch (e: any) { error.set(e.message); }
  }
</script>

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else}
  <div class="flex items-center gap-3 mb-6">
    <a href="/projects/{page.params.id}" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">← Back</a>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Edit Project</h1>
  </div>

  {#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

  <Card class="max-w-xl mb-6">
    <form onsubmit={handleSave} class="flex flex-col gap-4">
      <div>
        <Label for="proj-name" class="mb-1">Name <span class="text-red-500">*</span></Label>
        <Input id="proj-name" type="text" bind:value={$name} required />
      </div>
      <div>
        <Label for="proj-desc" class="mb-1">Description</Label>
        <Textarea id="proj-desc" bind:value={$description} rows={4} />
      </div>
      <div class="flex gap-2">
        <Button type="submit" disabled={$saving}>{$saving ? 'Saving…' : 'Save Changes'}</Button>
        <Button href="/projects/{page.params.id}" color="light">Cancel</Button>
      </div>
    </form>
  </Card>

  <div class="border border-red-300 dark:border-red-700 rounded-lg p-4 max-w-xl">
    <h2 class="text-base font-semibold text-red-600 dark:text-red-400 mb-3">Danger Zone</h2>
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-gray-900 dark:text-white m-0">Archive / Restore</p>
          <p class="text-sm text-gray-500 m-0">Toggle archive status of this project</p>
        </div>
        <Button href="/projects/{page.params.id}/settings/archive" size="sm" color="light">Archive</Button>
      </div>
      <div class="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
        <div>
          <p class="font-medium text-gray-900 dark:text-white m-0">Duplicate Project</p>
          <p class="text-sm text-gray-500 m-0">Create a copy of this project</p>
        </div>
        <Button href="/projects/{page.params.id}/settings/duplicate" size="sm" color="light">Duplicate</Button>
      </div>
      <div class="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
        <div>
          <p class="font-medium text-red-600 dark:text-red-400 m-0">Delete Project</p>
          <p class="text-sm text-gray-500 m-0">Permanently deletes project and all tasks</p>
        </div>
        <Button size="sm" color="red" onclick={handleDelete}>Delete</Button>
      </div>
    </div>
  </div>
{/if}
