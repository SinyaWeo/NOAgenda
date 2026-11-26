<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { errMessage } from '#lib/errors.js';
	import { onMount } from 'svelte';
	import { apiGetAuth } from '#lib/api.js';
	import { authSession } from '#lib/auth.svelte.js';
	import type { TeamWithMembers } from '#lib/types-misc.js';
	import type { TeamMember } from '#lib/types.js';
	import { canManageTeam, isAdmin } from '#lib/roles.js';
	import { Alert, Button, Card } from 'flowbite-svelte';
	import { UsersGroupOutline, PlusOutline } from 'flowbite-svelte-icons';
	import { t } from '#lib/i18n/index.js';

	let teams = $state<TeamWithMembers[]>([]);
	let loading = $state(true);
	let error = $state('');
	const currentUser = $derived(authSession.user);

	onMount(async () => {
		try {
			const [list, members] = await Promise.all([
				apiGetAuth<TeamWithMembers[]>('/teams'),
				apiGetAuth<TeamMember[]>('/team-members')
			]);
			teams = list.map((tm) => ({ ...tm, members: members.filter((m) => m.team?.id === tm.id) }));
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			loading = false;
		}
	});
</script>

<PageHeader title={t('teams.title')}>
	{#snippet actions()}
		<Button href="/teams/new"><PlusOutline class="w-4 h-4 mr-1" />{t('teams.new')}</Button>
	{/snippet}
</PageHeader>

{#if loading}
	<p class="text-gray-500 dark:text-gray-400">{t('teams.loading')}</p>
{:else if error}
	<Alert color="red">{error}</Alert>
{:else if teams.length}
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
		{#each teams as team (team.id)}
			<Card class="max-w-none h-full">
				<div class="flex flex-col gap-3 h-full">
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0">
							<a href="/teams/{team.id}" class="font-bold text-gray-900 dark:text-white hover:underline">
								{team.name}
							</a>
							{#if team.description}<p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-0">
									{team.description}
								</p>{/if}
						</div>
						{#if canManageTeam(currentUser, team.members ?? [])}
							<span class="shrink-0 text-xs font-medium tone-blue">
								{t('teams.role.manager')}
							</span>
						{/if}
					</div>
					{#if team.members?.length != null}
						<span class="text-xs text-gray-500 dark:text-gray-400">
							{t('teams.memberCount', { count: team.members.length })}
						</span>
					{/if}
					<div class="flex gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
						<Button href="/teams/{team.id}" color="light" size="sm">{t('teams.view')}</Button>
						{#if canManageTeam(currentUser, team.members ?? [])}
							<Button href="/teams/{team.id}/edit" color="light" size="sm">{t('common.edit')}</Button>
						{/if}
					</div>
				</div>
			</Card>
		{/each}
	</div>
{:else}
	<div class="text-center py-12 text-gray-500 dark:text-gray-400">
		<UsersGroupOutline class="w-12 h-12 mx-auto mb-3" />
		<p>
			{t('teams.empty.text')}
			<a href="/teams/new" class="text-primary-600 hover:underline">{t('teams.empty.link')}</a>
		</p>
		{#if isAdmin(currentUser)}
			<p class="text-sm">
				{t('teams.empty.adminHint')}
				<a href="/admin/teams" class="text-primary-600 hover:underline">{t('teams.empty.adminLink')}</a>
			</p>
		{/if}
	</div>
{/if}
