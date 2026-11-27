<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { errMessage } from '#lib/errors.js';
	import { apiGetAuth, apiPostAuth } from '#lib/api.js';
	import { singleUserMode } from '#lib/appConfig.svelte.js';
	import type { Permission, Project, Team } from '#lib/types.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Alert, Button, Card, Input, Label, Select, Textarea } from 'flowbite-svelte';
	import { showToast } from '#lib/toast.svelte.js';
	import { t } from '#lib/i18n/index.js';

	let name = $state('');
	let description = $state('');
	let error = $state('');
	let loading = $state(false);
	/** The teams the user belongs to; the new project can be shared with one of them right away. */
	let teams = $state<Team[]>([]);
	let teamId = $state('');
	let teamPermission = $state<Permission>('write');

	onMount(async () => {
		if (singleUserMode.current) return;
		try {
			teams = await apiGetAuth<Team[]>('/teams');
			// In just one team: that is almost always who the project is for.
			if (teams.length === 1) teamId = String(teams[0].id);
		} catch {
			// no teams: the project is created just for the user
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		try {
			const project = await apiPostAuth<Project>('/projects', {
				name,
				description,
				...(teamId && !singleUserMode.current ? { teamId: Number(teamId), teamPermission } : {})
			});
			showToast(t('projects.create.created'), 'success');
			goto(`/projects/${project.id}`);
		} catch (err: unknown) {
			error = errMessage(err, t('projects.create.failed'));
		} finally {
			loading = false;
		}
	}
</script>

<PageHeader title={t('projects.create.title')} back={{ href: '/projects', label: t('common.back') }} />

{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}

<Card class="max-w-xl">
	<form onsubmit={handleSubmit} class="flex flex-col gap-4">
		<div>
			<Label for="proj-name" class="mb-1">
				{t('common.field.name')} <span class="text-red-500">*</span>
			</Label>
			<Input id="proj-name" type="text" bind:value={name} required />
		</div>
		<div>
			<Label for="proj-desc" class="mb-1">{t('common.field.description')}</Label>
			<Textarea id="proj-desc" bind:value={description} rows={4} />
		</div>
		{#if !singleUserMode.current && teams.length}
			<div class="flex flex-col sm:flex-row gap-4">
				<div class="flex-1">
					<Label for="proj-team" class="mb-1">{t('projects.create.team')}</Label>
					<Select id="proj-team" placeholder="" bind:value={teamId}>
						<option value="">{t('projects.create.noTeam')}</option>
						{#each teams as team (team.id)}
							<option value={String(team.id)}>{team.name}</option>
						{/each}
					</Select>
				</div>
				{#if teamId}
					<div>
						<Label for="proj-team-perm" class="mb-1">{t('projects.create.teamPermission')}</Label>
						<Select id="proj-team-perm" placeholder="" bind:value={teamPermission}>
							{#each ['read', 'write', 'admin'] as const as p (p)}
								<option value={p}>{t(`common.permission.${p}`)}</option>
							{/each}
						</Select>
					</div>
				{/if}
			</div>
			<p class="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-0">{t('projects.create.teamHint')}</p>
		{/if}
		<div class="flex gap-2">
			<Button type="submit" disabled={loading}>
				{loading ? t('projects.create.submitting') : t('projects.create.submit')}
			</Button>
			<Button href="/projects" color="light">{t('common.cancel')}</Button>
		</div>
	</form>
</Card>
