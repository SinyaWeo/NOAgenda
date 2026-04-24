<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { apiFetch } from '$lib/api';
	import { writable } from 'svelte/store';

	interface Task {
		id: string | number;
		title: string;
		description: string;
		// Add more fields as needed
	}

	const taskId = writable<string | undefined>('');
	const task = writable<Task | null>(null);
	const error = writable('');
	const loading = writable(true);

	onMount(async () => {
		const id = page.params.id;
		if (!id) {
			error.set('Task ID not found');
			loading.set(false);
			return;
		}
		taskId.set(id);
		try {
			const response = await apiFetch(`/tasks/${id}`);
			if (!response.ok) throw new Error('Failed to load task');
			task.set(await response.json());
		} catch (e) {
			if (e instanceof Error) {
				error.set(e.message);
			} else {
				error.set('Unknown error');
			}
		} finally {
			loading.set(false);
		}
	});
</script>

{#if $loading}
	<p>Loading...</p>
{:else if $error}
	<p style="color: red">{$error}</p>
{:else if $task}
	<h1>Task: {$task.title}</h1>
	<p>{$task.description}</p>
	<!-- Add more task details and actions here -->
{:else}
	<p>Task not found.</p>
{/if}
