<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { apiFetch } from '$lib/api';
	import { get } from 'svelte/store';

	import { writable } from 'svelte/store';

	interface Project {
		id: string;
		title: string;
		description: string;
	}

	const projectId = writable('');
	const project = writable<Project | null>(null);
	const loading = writable(true);
	const error = writable('');

	onMount(async () => {
		projectId.set(page.params.id ?? '');
		try {
			const response = await apiFetch(`/projects/${get(projectId)}`);
			if (!response.ok) throw new Error('Failed to load project');
			project.set(await response.json());
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

<h1>Project Details</h1>
{#if $loading}
	<p>Loading...</p>
{:else if $error}
	<p style="color: red">{$error}</p>
{:else if $project}
	<h2>{$project.title}</h2>
	<p>{$project.description}</p>
	<!-- Add more project details and actions here -->
{:else}
	<p>Project not found.</p>
{/if}
