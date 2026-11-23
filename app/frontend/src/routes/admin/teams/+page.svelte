<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { errMessage } from '$lib/errors';
	import { onMount } from 'svelte';
	import { t, tr } from '$lib/i18n';
	import { apiGetAuth, apiPatchAuth } from '$lib/api';
	import { writable } from 'svelte/store';
	import { Alert, Card, Select } from 'flowbite-svelte';
	import type { AdminTeam } from '$lib/types-misc';

	const teams = writable<AdminTeam[]>([]);
	const loading = writable(true);
	const error = writable('');

	async function loadTeams() {
		try {
			teams.set(await apiGetAuth<AdminTeam[]>('/admin/teams'));
		} catch (_) {
			error.set(tr('admin.teams.loadFailed'));
		} finally {
			loading.set(false);
		}
	}

	onMount(loadTeams);

	async function changeRole(
		team: AdminTeam,
		member: AdminTeam['members'][number],
		select: HTMLSelectElement
	) {
		error.set('');
		try {
			await apiPatchAuth(`/admin/teams/${team.id}/members/${member.id}/role`, { role: select.value });
			await loadTeams();
		} catch (e: unknown) {
			select.value = member.role; // the change did not happen: show the role the member really has
			error.set(
				tr('admin.teams.roleFailed', {
					username: member.user.username,
					reason: errMessage(e, tr('admin.users.unknownError'))
				})
			);
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.teams.pageTitle')}</title>
</svelte:head>

<div class="max-w-4xl">
	<PageHeader
		title={$t('admin.teams.title')}
		back={{ href: '/admin', label: $t('admin.back') }}
		subtitle={$t('admin.teams.hint')}
	/>

	{#if $error}
		<Alert color="red" class="mb-4">{$error}</Alert>
	{/if}

	{#if $loading}
		<p class="text-gray-500 dark:text-gray-400">{$t('common.loading')}</p>
	{:else if !$teams.length}
		<p class="text-gray-500 dark:text-gray-400">{$t('admin.teams.empty')}</p>
	{:else}
		<div class="flex flex-col gap-4">
			{#each $teams as team (team.id)}
				<Card class="max-w-none">
					<div class="flex items-center justify-between gap-2 mb-2">
						<a href="/teams/{team.id}" class="font-bold text-gray-900 dark:text-white hover:underline">
							{team.name}
						</a>
						<a href="/teams/{team.id}/edit" class="text-xs text-primary-600 dark:text-primary-400">
							{$t('common.edit')}
						</a>
					</div>
					{#if team.description}<p class="text-sm text-gray-500 dark:text-gray-400 mt-0 mb-2">
							{team.description}
						</p>{/if}
					{#each team.members as member (member.id)}
						<div class="flex items-center gap-3 py-2 border-t border-gray-100 dark:border-gray-700">
							<span class="flex-1 text-sm text-gray-800 dark:text-gray-200">
								{member.user.name || member.user.username}
								<span class="text-gray-500 dark:text-gray-400">({member.user.username})</span>
							</span>
							<Select
								placeholder=""
								size="sm"
								class="w-auto"
								value={member.role}
								aria-label={$t('teams.role.change', { name: member.user.username })}
								onchange={(e: Event) => changeRole(team, member, e.currentTarget as HTMLSelectElement)}
							>
								<option value="member">{$t('teams.role.member')}</option>
								<option value="manager">{$t('teams.role.manager')}</option>
							</Select>
						</div>
					{:else}
						<p class="text-sm text-gray-500 dark:text-gray-400 m-0">{$t('admin.teams.noMembers')}</p>
					{/each}
				</Card>
			{/each}
		</div>
	{/if}
</div>
