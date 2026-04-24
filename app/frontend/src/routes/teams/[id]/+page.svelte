<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { apiFetch } from '$lib/api';

	import { writable } from 'svelte/store';

	interface Team {
		id: string;
		name: string;
		description: string;
	}

	const teamId = writable('');
	const team = writable<Team | null>(null);
	const loading = writable(true);
	const error = writable('');

	onMount(async () => {
		const id = page.params.id;
		if (!id) {
			error.set('Team ID not found');
			loading.set(false);
			return;
		}
		teamId.set(id);
		try {
			const response = await apiFetch(`/teams/${id}`);
			if (!response.ok) throw new Error('Failed to load team');
			team.set(await response.json());
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

<h1>Team Details</h1>
{#if $loading}
	<p>Loading...</p>
{:else if $error}
	<p style="color: red">{$error}</p>
{:else if $team}
	<h2>{$team.name}</h2>
	<p>{$team.description}</p>
	<!-- Add more team details and actions here -->
{:else}
	<p>Team not found.</p>
{/if}
