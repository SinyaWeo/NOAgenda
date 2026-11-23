<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { errMessage } from '$lib/errors';
	import { page } from '$app/state';
	import { apiGetAuth, apiPatchAuth } from '$lib/api';
	import { loadOnParamChange } from '$lib/param-loader.svelte';
	import type { Project } from '$lib/types';
	import { writable } from 'svelte/store';
	import { Alert, Button, Card } from 'flowbite-svelte';
	import { t, tr } from '$lib/i18n';

	const project = writable<Project | null>(null);
	const loading = writable(true);
	const saving = writable(false);
	const error = writable('');
	const success = writable('');

	loadOnParamChange(
		() => page.params.id ?? '',
		async (id, isStale) => {
			const p = await apiGetAuth<Project>(`/projects/${id}`);
			if (!isStale()) project.set(p);
		},
		loading,
		error
	);

	async function toggleArchive() {
		const p = $project;
		if (!p) return;
		saving.set(true);
		error.set('');
		success.set('');
		try {
			const endpoint = p.isArchived ? `/projects/${p.id}/unarchive` : `/projects/${p.id}/archive`;
			const updated = await apiPatchAuth<Project>(endpoint, {});
			project.set(updated);
			success.set(
				updated.isArchived ? tr('projects.archive.doneArchived') : tr('projects.archive.doneRestored')
			);
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			saving.set(false);
		}
	}
</script>

<PageHeader
	title={$t('projects.archive.title')}
	back={{ href: `/projects/${page.params.id}/edit`, label: $t('common.back') }}
	subtitle={$t('projects.archive.intro')}
/>

{#if $loading}
	<p class="text-gray-500 dark:text-gray-400">{$t('common.loading')}</p>
{:else if $error}
	<Alert color="red">{$error}</Alert>
{:else if $project}
	<Card class="max-w-md">
		{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}
		<p class="text-gray-900 dark:text-white mb-1">
			{$t('projects.archive.project')} <strong>{$project.name}</strong>
		</p>
		<p class="mb-4">
			{$t('projects.archive.status')}
			<strong class={$project.isArchived ? 'text-red-600' : 'text-green-600'}>
				{$project.isArchived ? $t('projects.archive.statusArchived') : $t('projects.archive.statusActive')}
			</strong>
		</p>
		{#if $project.isArchived}
			<p class="text-gray-500 dark:text-gray-400 text-sm mb-4">
				{$t('projects.archive.archivedNote')}
			</p>
			<Button onclick={toggleArchive} disabled={$saving}>
				{$saving ? $t('projects.archive.restoring') : $t('projects.archive.restore')}
			</Button>
		{:else}
			<p class="text-gray-500 dark:text-gray-400 text-sm mb-4">
				{$t('projects.archive.activeNote')}
			</p>
			<Button color="light" onclick={toggleArchive} disabled={$saving}>
				{$saving ? $t('projects.archive.archiving') : $t('projects.archive.archive')}
			</Button>
		{/if}
	</Card>
{/if}
