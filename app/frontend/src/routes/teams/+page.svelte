<script lang="ts">
	import { onMount } from 'svelte';
	import { apiGetAuth } from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';

	const teams = writable<any[]>([]);
	const loading = writable(true);
	const error = writable('');

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/login');
			return;
		}
		try {
			teams.set(await apiGetAuth<any[]>('/teams'));
		} catch (e: any) {
			error.set(e.message);
		} finally {
			loading.set(false);
		}
	});
</script>

<div class="page-header">
	<h1 class="page-title">Teams</h1>
	<div class="page-actions">
		<a href="/teams/new" class="btn btn-primary"
			><span class="icon icon-sm">add</span> New Team</a
		>
	</div>
</div>

{#if $loading}
	<p>Loading teams...</p>
{:else if $error}
	<div class="alert alert-error">{$error}</div>
{:else if $teams.length}
	<div class="settings-grid">
		{#each $teams as team}
			<div class="card">
				<div
					class="card-body"
					style="display:flex;flex-direction:column;gap:0.75rem"
				>
					<div>
						<a href="/teams/{team.id}" class="font-bold"
							>{team.name}</a
						>
						{#if team.description}
							<p class="text-sm text-muted mb-0">
								{team.description}
							</p>
						{/if}
					</div>
					{#if team.members?.length != null}
						<span class="text-xs text-muted"
							>{team.members.length} member{team.members
								.length === 1
								? ''
								: 's'}</span
						>
					{/if}
					<div
						class="page-actions mt-auto"
						style="border-top:1px solid var(--na-border);padding-top:0.5rem"
					>
						<a href="/teams/{team.id}" class="btn btn-ghost btn-sm"
							>View</a
						>
						<a
							href="/teams/{team.id}/edit"
							class="btn btn-ghost btn-sm">Edit</a
						>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="empty-state">
		<span class="icon">group</span>
		<p>No teams yet.</p>
		<a href="/teams/new" class="btn btn-primary">Create a team</a>
	</div>
{/if}
