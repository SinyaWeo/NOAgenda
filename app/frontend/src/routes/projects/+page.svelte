<script lang="ts">
	import { onMount } from 'svelte';
	import { apiFetch } from '$lib/api';
	import { writable } from 'svelte/store';

	interface Project {
		id: string | number;
		title: string;
	}

	const projects = writable<Project[]>([]);
	const loading = writable(true);
	const error = writable('');

	onMount(async () => {
		try {
			const response = await apiFetch('/projects');
			if (!response.ok) throw new Error('Failed to load projects');
			projects.set(await response.json());
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

<h1>Projects</h1>
<a href="/projects/create" class="is-pulled-right">Create Project</a>
{#if $loading}
	<p>Loading projects...</p>
{:else if $error}
	<p style="color: red">{$error}</p>
{:else if $projects.length}
	<ul class="projects box">
		{#each $projects as project}
			<li>
				<a href={`/projects/${project.id}`}><p>{project.title}</p></a>
			</li>
		{/each}
	</ul>
{:else}
	<p class="has-text-centered has-text-grey is-italic">
		No projects found. <a href="/projects/create">Create a project.</a>
	</p>
{/if}
