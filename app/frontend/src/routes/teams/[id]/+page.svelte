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
	<div class="alert alert-error">{$error}</div>
{:else if $team}
	<div class="page">
		<div class="page-header">
			<a href="/teams" class="back-link"
				><span class="icon icon-sm">arrow_back</span></a
			>
			<h1 class="page-title">{$team.name}</h1>
			<div class="page-actions">
				<a href="/teams/{$team.id}/edit" class="btn btn-secondary"
					>Edit Team</a
				>
			</div>
		</div>
		{#if $team.description}
			<p class="text-muted mb-4">{$team.description}</p>
		{/if}

		<div class="card">
			<div class="card-header"><h2 class="card-title">Members</h2></div>
			<div class="card-body">
				{#if $members.length}
					<ul class="list">
						{#each $members as member}
							<li class="list-item">
								<span class="list-item-body">
									{#if member.user}
										{member.user.name ||
											member.user.username ||
											`User #${member.user.id}`}
									{:else}
										{displayName(member.userId)}
									{/if}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-muted mb-0">No members yet.</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<p>Team not found.</p>
{/if}
