<script lang="ts">
	import { errMessage } from '$lib/errors';
	import { onMount } from 'svelte';
	import { apiGetAuth } from '$lib/api';
	import { authSession } from '$lib/auth';
	import type { TeamWithMembers } from '$lib/types-misc';
	import type { TeamMember } from '$lib/types';
	import { derived, writable } from 'svelte/store';
	import { canManageTeam } from '$lib/roles';
	import { Alert, Button, Card } from 'flowbite-svelte';
	import { UsersGroupOutline, PlusOutline } from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';

	const teams = writable<TeamWithMembers[]>([]);
	const loading = writable(true);
	const error = writable('');
	const currentUser = derived(authSession, ($s) => $s.user);

	onMount(async () => {
		try {
			const [list, members] = await Promise.all([
				apiGetAuth<TeamWithMembers[]>('/teams'),
				apiGetAuth<TeamMember[]>('/team-members')
			]);
			teams.set(list.map((tm) => ({ ...tm, members: members.filter((m) => m.team?.id === tm.id) })));
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			loading.set(false);
		}
	});
</script>

<div class="flex items-center justify-between mb-4">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">{$t('teams.title')}</h1>
	<Button href="/teams/new"><PlusOutline class="w-4 h-4 mr-1" />{$t('teams.new')}</Button>
</div>

{#if $loading}
	<p class="text-gray-400">{$t('teams.loading')}</p>
{:else if $error}
	<Alert color="red">{$error}</Alert>
{:else if $teams.length}
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
		{#each $teams as team (team.id)}
			<Card class="h-full">
				<div class="flex flex-col gap-3 h-full">
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0">
							<a href="/teams/{team.id}" class="font-bold text-gray-900 dark:text-white hover:underline"
								>{team.name}</a
							>
							{#if team.description}<p class="text-sm text-gray-500 mt-1 mb-0">
									{team.description}
								</p>{/if}
						</div>
						{#if canManageTeam($currentUser, team.members ?? [])}
							<span class="shrink-0 text-xs font-medium tone-blue">
								{$t('teams.role.manager')}
							</span>
						{/if}
					</div>
					{#if team.members?.length != null}
						<span class="text-xs text-gray-400"
							>{$t('teams.memberCount', { count: team.members.length })}</span
						>
					{/if}
					<div class="flex gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
						<Button href="/teams/{team.id}" color="light" size="sm">{$t('teams.view')}</Button>
						{#if canManageTeam($currentUser, team.members ?? [])}
							<Button href="/teams/{team.id}/edit" color="light" size="sm">{$t('common.edit')}</Button>
						{/if}
					</div>
				</div>
			</Card>
		{/each}
	</div>
{:else}
	<div class="text-center py-12 text-gray-400">
		<UsersGroupOutline class="w-12 h-12 mx-auto mb-3" />
		<p>
			{$t('teams.empty.text')}
			<a href="/teams/new" class="text-primary-600 hover:underline">{$t('teams.empty.link')}</a>
		</p>
	</div>
{/if}
