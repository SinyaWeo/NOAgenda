<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { errMessage } from '#lib/errors.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { apiGetAuth, apiPutAuth } from '#lib/api.js';
	import { loadOnParamChange } from '#lib/param-loader.svelte.js';
	import type { Project } from '#lib/types.js';
	import { Alert, Button, Card } from 'flowbite-svelte';
	import { t } from '#lib/i18n/index.js';

	let project = $state<Project | null>(null);
	let saving = $state(false);

	const pageLoad = loadOnParamChange(
		() => page.params.id ?? '',
		async (id, isStale) => {
			const p = await apiGetAuth<Project>(`/projects/${id}`);
			if (!isStale()) project = p;
		}
	);

	async function duplicate() {
		saving = true;
		pageLoad.error = '';
		try {
			const newProject = await apiPutAuth<Project>(`/projects/${page.params.id}/duplicate`, {});
			goto(`/projects/${newProject.id}`);
		} catch (e: unknown) {
			pageLoad.error = errMessage(e);
			saving = false;
		}
	}
</script>

<PageHeader
	title={t('projects.duplicate.title')}
	back={{ href: `/projects/${page.params.id}/edit`, label: t('common.back') }}
	subtitle={t('projects.duplicate.intro')}
/>

{#if pageLoad.loading}
	<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
{:else if pageLoad.error}
	<Alert color="red">{pageLoad.error}</Alert>
{:else if project}
	<Card class="max-w-md">
		<p class="mb-2 text-gray-900 dark:text-white">
			{t('projects.duplicate.source')} <strong>{project.name}</strong>
		</p>
		<Alert color="yellow" class="mb-4">{t('projects.duplicate.note')}</Alert>
		<Button onclick={duplicate} disabled={saving}>
			{saving ? t('projects.duplicate.submitting') : t('projects.duplicate.submit')}
		</Button>
	</Card>
{/if}
