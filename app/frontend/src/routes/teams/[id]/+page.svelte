<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { apiGetAuth } from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';

	const team = writable<any>(null);
	const members = writable<any[]>([]);
	const usersById = writable<
		Record<number, { username?: string; name?: string }>
	>({});
	const loading = writable(true);
	const error = writable('');

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/login');
			return;
		}
		const id = $page.params.id;
		try {
			const [t, m, users] = await Promise.all([
				apiGetAuth<any>(`/teams/${id}`),
				apiGetAuth<any[]>(`/team-members?teamId=${id}`),
				apiGetAuth<any[]>('/users'),
			]);
			team.set(t);
			members.set(m);
			usersById.set(
				Object.fromEntries(
					users.map((u: any) => [
						u.id,
						{ username: u.username, name: u.name },
					]),
				),
			);
		} catch (e: any) {
			error.set(e.message);
		} finally {
			loading.set(false);
		}
	});

	function displayName(userId: number): string {
		const user = $usersById[userId];
		if (!user) return `User #${userId}`;
		if (user.name && user.name.trim()) return user.name;
		if (user.username && user.username.trim()) return user.username;
		return `User #${userId}`;
	}
</script>

{#if $loading}
	<p>Loading...</p>
{:else if $error}
	<p
		style="color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:0.6rem 1rem"
	>
		{$error}
	</p>
{:else if $team}
	<div style="max-width:920px">
		<div
			style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap"
		>
			<h1 style="margin:0">{$team.name}</h1>
			<a href="/teams/{$team.id}/edit">Edit Team</a>
		</div>
		{#if $team.description}
			<p style="margin:0.5rem 0 1.25rem;color:#64748b">
				{$team.description}
			</p>
		{/if}

		<section
			style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)"
		>
			<h2 style="margin:0 0 0.9rem">Members</h2>
			{#if $members.length}
				<ul
					style="margin:0;padding-left:1.2rem;display:flex;flex-direction:column;gap:0.4rem"
				>
					{#each $members as member}
						<li>
							{#if member.user}
								{member.user.name ||
									member.user.username ||
									`User #${member.user.id}`}
							{:else}
								{displayName(member.userId)}
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p style="margin:0;color:#64748b">No members yet.</p>
			{/if}
		</section>
	</div>
{:else}
	<p>Team not found.</p>
{/if}
