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

<div
	style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem"
>
	<h1 style="margin:0">Teams</h1>
	<a
		href="/teams/new"
		style="background:#6366f1;color:#fff;padding:0.4rem 1rem;border-radius:6px;text-decoration:none;font-size:0.9rem"
		>+ New Team</a
	>
</div>

{#if $loading}
	<p>Loading teams...</p>
{:else if $error}
	<p style="color: red">{$error}</p>
{:else if $teams.length}
	<div
		style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem"
	>
		{#each $teams as team}
			<div
				style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;box-shadow:0 1px 4px rgba(0,0,0,0.04);display:flex;flex-direction:column;gap:0.75rem"
			>
				<div>
					<a
						href="/teams/{team.id}"
						style="font-size:1.05rem;font-weight:600;color:#1e293b;text-decoration:none"
						>{team.name}</a
					>
					{#if team.description}
						<p
							style="margin:0.25rem 0 0;color:#64748b;font-size:0.85rem"
						>
							{team.description}
						</p>
					{/if}
				</div>
				{#if team.members?.length != null}
					<span style="font-size:0.8rem;color:#94a3b8"
						>{team.members.length} member{team.members.length === 1
							? ''
							: 's'}</span
					>
				{/if}
				<div
					style="display:flex;gap:0.75rem;margin-top:auto;padding-top:0.5rem;border-top:1px solid #f1f5f9"
				>
					<a
						href="/teams/{team.id}"
						style="font-size:0.85rem;color:#6366f1">View</a
					>
					<a
						href="/teams/{team.id}/edit"
						style="font-size:0.85rem;color:#64748b">Edit</a
					>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div style="text-align:center;padding:3rem;color:#64748b">
		<p style="margin:0;font-size:1.1rem">No teams yet.</p>
		<a
			href="/teams/new"
			style="display:inline-block;margin-top:0.75rem;background:#6366f1;color:#fff;padding:0.4rem 1rem;border-radius:6px;text-decoration:none;font-size:0.9rem"
			>Create a team</a
		>
	</div>
{/if}
