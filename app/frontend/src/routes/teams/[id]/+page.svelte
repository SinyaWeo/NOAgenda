<script lang="ts">
	import { page } from '$app/state';
	import { apiGetAuth } from '$lib/api';
	import { loadOnParamChange } from '$lib/param-loader.svelte';
	import { derived, writable } from 'svelte/store';
	import type { Team, TeamMember } from '$lib/types';
	import { Alert, Button, Card } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';
	import { t, type MessageKey } from '$lib/i18n';
	import { authSession } from '$lib/auth';
	import { canManageTeam } from '$lib/roles';

	const team = writable<Team | null>(null);
	const members = writable<TeamMember[]>([]);
	const loading = writable(true);
	const error = writable('');
	const canManage = derived([authSession, members], ([$s, $m]) => canManageTeam($s.user, $m));

	async function loadTeam(id: string, isStale: () => boolean) {
		const [t, m] = await Promise.all([
			apiGetAuth<Team>(`/teams/${id}`),
			apiGetAuth<TeamMember[]>(`/team-members?teamId=${id}`)
		]);
		if (isStale()) return;
		team.set(t);
		members.set(m);
	}

	loadOnParamChange(() => page.params.id ?? '', loadTeam, loading, error);
</script>

{#if $loading}
	<p class="text-gray-400">{$t('teams.detail.loading')}</p>
{:else if $error}
	<Alert color="red">{$error}</Alert>
{:else if $team}
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			<a href="/teams" class="text-gray-400 hover:text-gray-600">
				<CaretLeftSolid class="w-4 h-4 inline mr-1" />
				{$t('common.back')}
			</a>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
				{$team.name}
			</h1>
		</div>
		{#if $canManage}
			<Button href="/teams/{$team.id}/edit" color="light" size="sm">{$t('teams.detail.edit')}</Button>
		{/if}
	</div>
	{#if $team.description}<p class="text-gray-500 mb-4">
			{$team.description}
		</p>{/if}

	<Card>
		<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
			{$t('teams.members')}
		</h2>
		{#if $members.length}
			{#each $members as member, i (member.id)}
				<div
					class="flex items-center gap-3 py-2 {i < $members.length - 1
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
							$t('teams.userFallback', { id: member.user?.id ?? member.id })}
					</span>
					<span
						class="ml-auto text-xs font-medium {member.role === 'manager' ? 'tone-blue' : 'tone-gray'}"
						data-team-role={member.role}
					>
						{$t(`teams.role.${member.role}` as MessageKey)}
					</span>
				</div>
			{/each}
		{:else}
			<p class="text-sm text-gray-400">{$t('teams.noMembers')}</p>
		{/if}
	</Card>
{:else}
	<p class="text-gray-400">{$t('teams.detail.notFound')}</p>
{/if}
