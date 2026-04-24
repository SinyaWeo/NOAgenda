<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { apiFetch } from '$lib/api';
	import { get } from 'svelte/store';

	import { writable } from 'svelte/store';

	const taskId = writable('');
	const title = writable('');
	const description = writable('');
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
			const response = await apiFetch(`/tasks/${get(taskId)}`);
			if (!response.ok) throw new Error('Failed to load task');
			const task = await response.json();
			title.set(task.title);
			description.set(task.description);
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

	async function handleEdit(event: Event) {
		event.preventDefault();
		loading.set(true);
		error.set('');
		try {
			const response = await apiFetch(`/tasks/${get(taskId)}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: get(title),
					description: get(description),
				}),
			});
			if (!response.ok) throw new Error('Failed to update task');
			goto(`/tasks/${get(taskId)}`);
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

<h1>Edit Task</h1>
{#if $loading}
	<p>Loading...</p>
{:else}
	<form onsubmit={handleEdit}>
		<label>
			Title:
			<input type="text" bind:value={$title} required />
		</label>
		<br />
		<label>
			Description:
			<textarea bind:value={$description}></textarea>
		</label>
		<br />
		{#if $error}
			<p style="color: red">{$error}</p>
		{/if}
		<button type="submit" disabled={$loading}>Save</button>
	</form>
{/if}
