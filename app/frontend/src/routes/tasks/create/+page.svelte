<script lang="ts">
import { goto } from '$app/navigation';
import { apiFetch } from '$lib/api';
import { writable } from 'svelte/store';

const title = writable('');
const description = writable('');
const error = writable('');
const loading = writable(false);

async function handleCreate(event: Event) {
  event.preventDefault();
  loading.set(true);
  error.set('');
  try {
    const response = await apiFetch('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: $title, description: $description })
    });
    if (!response.ok) throw new Error('Failed to create task');
    const task = await response.json();
    goto(`/tasks/${task.id}`);
  } catch (e) {
    if (e instanceof Error) {
      error.set(e.message);
    } else {
      error.set('Unknown error');
    }
  } finally {
    loading.set(false);
  }
}
</script>

<h1>Create Task</h1>
<form onsubmit={handleCreate}>
	{#if $error}
		<p style="color: red">{$error}</p>
	{/if}
	<label>
		Title
		<input type="text" bind:value={$title} required />
	</label>
	<label>
		Description
		<textarea bind:value={$description}></textarea>
	</label>
	<button type="submit" disabled={$loading}>{$loading ? 'Creating...' : 'Create Task'}</button>
</form>
