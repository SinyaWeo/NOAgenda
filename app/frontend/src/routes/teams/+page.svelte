<script lang="ts">
	import { onMount } from 'svelte';
	import { apiFetch } from '$lib/api';
	import { writable } from 'svelte/store';

	interface Team {
		id: string;
		name: string;
	}

	const teams = writable<Team[]>([]);
	const loading = writable(true);
	const error = writable('');

	onMount(async () => {
		try {
			const response = await apiFetch('/teams');
			if (!response.ok) throw new Error('Failed to load teams');
			teams.set(await response.json());
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

<h1>Teams</h1>
<a href="/teams/create" class="is-pulled-right">Create Team</a>
{#if $loading}
	<p>Loading teams...</p>
{:else if $error}
	<p style="color: red">{$error}</p>
{:else if $teams.length}
	<ul class="teams box">
		{#each $teams as team}
			<li>
				<a href={`/teams/${team.id}`}><p>{team.name}</p></a>
			</li>
		{/each}
	</ul>
{:else}
	<p class="has-text-centered has-text-grey is-italic">
		No teams found. <a href="/teams/create">Create a team.</a>
	</p>
{/if}
