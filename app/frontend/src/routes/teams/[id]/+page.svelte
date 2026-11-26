<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { page } from '$app/state';
	import { apiGetAuth } from '#lib/api.js';
	import { loadOnParamChange } from '#lib/param-loader.svelte.js';
	import type { Team, TeamMember } from '#lib/types.js';
	import { Alert, Button, Card } from 'flowbite-svelte';
	import { t, type MessageKey } from '#lib/i18n/index.js';
	import { authSession } from '#lib/auth.svelte.js';
	import { canManageTeam } from '#lib/roles.js';

	let team = $state<Team | null>(null);
	let members = $state<TeamMember[]>([]);
	const canManage = $derived(canManageTeam(authSession.user, members));

	async function loadTeam(id: string, isStale: () => boolean) {
		const [t, m] = await Promise.all([
			apiGetAuth<Team>(`/teams/${id}`),
			apiGetAuth<TeamMember[]>(`/team-members?teamId=${id}`)
		]);
		if (isStale()) return;
		team = t;
		members = m;
	}

	const pageLoad = loadOnParamChange(() => page.params.id ?? '', loadTeam);
</script>

{#if pageLoad.loading}
	<p class="text-gray-500 dark:text-gray-400">{t('teams.detail.loading')}</p>
{:else if pageLoad.error}
	<Alert color="red">{pageLoad.error}</Alert>
{:else if team}
	<PageHeader title={team.name} back={{ href: '/teams', label: t('common.back') }}>
		{#snippet actions()}
			{#if canManage && team}
				<Button href="/teams/{team.id}/edit" color="light" size="sm">{t('teams.detail.edit')}</Button>
			{/if}
		{/snippet}
	</PageHeader>
	{#if team.description}<p class="text-gray-500 dark:text-gray-400 mb-4">
			{team.description}
		</p>{/if}

	<Card>
		<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
			{t('teams.members')}
		</h2>
		{#if members.length}
			{#each members as member, i (member.id)}
				<div
					class="flex items-center gap-3 py-2 {i < members.length - 1
						? 'border-b border-gray-100 dark:border-gray-700'
						: ''}"
				>
					<div
						class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 shrink-0"
					>
						{(member.user?.name ?? member.user?.username ?? 'U')[0].toUpperCase()}
					</div>
					<span class="text-sm text-gray-800 dark:text-gray-200">
						{member.user?.name ||
							member.user?.username ||
							t('teams.userFallback', { id: member.user?.id ?? member.id })}
					</span>
					<span
						class="ml-auto text-xs font-medium {member.role === 'manager' ? 'tone-blue' : 'tone-gray'}"
						data-team-role={member.role}
					>
						{t(`teams.role.${member.role}` as MessageKey)}
					</span>
				</div>
			{/each}
		{:else}
			<p class="text-sm text-gray-500 dark:text-gray-400">{t('teams.noMembers')}</p>
		{/if}
	</Card>
{:else}
	<p class="text-gray-500 dark:text-gray-400">{t('teams.detail.notFound')}</p>
{/if}
