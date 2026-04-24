<script lang="ts">
	import { onMount } from 'svelte';
	import { apiFetch } from '$lib/api';
	import { writable } from 'svelte/store';

	interface Task {
		id: number;
		title: string;
	}

	const tasks = writable<Task[]>([]);
	const loading = writable(true);
	const error = writable('');

	onMount(async () => {
		try {
			const response = await apiFetch('/tasks');
			if (!response.ok) throw new Error('Failed to load tasks');
			tasks.set(await response.json());
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

<h1>Tasks</h1>
<a href="/tasks/create" class="is-pulled-right">Create Task</a>
{#if $loading}
	<p>Loading tasks...</p>
{:else if $error}
	<p style="color: red">{$error}</p>
{:else if $tasks.length}
	<ul class="tasks box">
		{#each $tasks as task}
			<li>
				<a href={`/tasks/${task.id}`}><p>{task.title}</p></a>
			</li>
		{/each}
	</ul>
{:else}
	<p class="has-text-centered has-text-grey is-italic">
		No tasks found. <a href="/tasks/create">Create a task.</a>
	</p>
{/if}
