<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { errMessage } from '#lib/errors.js';
	import { page } from '$app/state';
	import { apiGetAuth, apiPatchAuth } from '#lib/api.js';
	import { loadOnParamChange } from '#lib/param-loader.svelte.js';
	import type { Project } from '#lib/types.js';
	import { Alert, Button, Card } from 'flowbite-svelte';
	import { t } from '#lib/i18n/index.js';

	let project = $state<Project | null>(null);
	let saving = $state(false);
	let success = $state('');

	const pageLoad = loadOnParamChange(
		() => page.params.id ?? '',
		async (id, isStale) => {
			const p = await apiGetAuth<Project>(`/projects/${id}`);
			if (!isStale()) project = p;
		}
	);

	async function toggleArchive() {
		const p = project;
		if (!p) return;
		saving = true;
		pageLoad.error = '';
		success = '';
		try {
			const endpoint = p.isArchived ? `/projects/${p.id}/unarchive` : `/projects/${p.id}/archive`;
			const updated = await apiPatchAuth<Project>(endpoint, {});
			project = updated;
			success = updated.isArchived ? t('projects.archive.doneArchived') : t('projects.archive.doneRestored');
		} catch (e: unknown) {
			pageLoad.error = errMessage(e);
		} finally {
			saving = false;
		}
	}
</script>

<PageHeader
	title={t('projects.archive.title')}
	back={{ href: `/projects/${page.params.id}/edit`, label: t('common.back') }}
	subtitle={t('projects.archive.intro')}
/>

{#if pageLoad.loading}
	<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
{:else if pageLoad.error}
	<Alert color="red">{pageLoad.error}</Alert>
{:else if project}
	<Card class="max-w-md">
		{#if success}<Alert color="green" class="mb-4">{success}</Alert>{/if}
		<p class="text-gray-900 dark:text-white mb-1">
			{t('projects.archive.project')} <strong>{project.name}</strong>
		</p>
		<p class="mb-4">
			{t('projects.archive.status')}
			<strong class={project.isArchived ? 'text-red-600' : 'text-green-600'}>
				{project.isArchived ? t('projects.archive.statusArchived') : t('projects.archive.statusActive')}
			</strong>
		</p>
		{#if project.isArchived}
			<p class="text-gray-500 dark:text-gray-400 text-sm mb-4">
				{t('projects.archive.archivedNote')}
			</p>
			<Button onclick={toggleArchive} disabled={saving}>
				{saving ? t('projects.archive.restoring') : t('projects.archive.restore')}
			</Button>
		{:else}
			<p class="text-gray-500 dark:text-gray-400 text-sm mb-4">
				{t('projects.archive.activeNote')}
			</p>
			<Button color="light" onclick={toggleArchive} disabled={saving}>
				{saving ? t('projects.archive.archiving') : t('projects.archive.archive')}
			</Button>
		{/if}
	</Card>
{/if}
