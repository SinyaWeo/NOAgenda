<script lang="ts">
	import { errMessage } from '$lib/errors';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { apiGetAuth, apiPutAuth } from '$lib/api';
	import { loadOnParamChange } from '$lib/param-loader.svelte';
	import type { Project } from '$lib/types';
	import { writable } from 'svelte/store';
	import { Alert, Button, Card } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';

	const project = writable<Project | null>(null);
	const loading = writable(true);
	const saving = writable(false);
	const error = writable('');

	loadOnParamChange(
		() => page.params.id ?? '',
		async (id, isStale) => {
			const p = await apiGetAuth<Project>(`/projects/${id}`);
			if (!isStale()) project.set(p);
		},
		loading,
		error
	);

	async function duplicate() {
		saving.set(true);
		error.set('');
		try {
			const newProject = await apiPutAuth<Project>(`/projects/${page.params.id}/duplicate`, {});
			goto(`/projects/${newProject.id}`);
		} catch (e: unknown) {
			error.set(errMessage(e));
			saving.set(false);
		}
	}
</script>

<div class="flex items-center gap-3 mb-4">
	<a href="/projects/{page.params.id}/edit" class="text-gray-400 hover:text-gray-600"
		><CaretLeftSolid class="w-4 h-4 inline mr-1" /> {$t('common.back')}</a
	>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
		{$t('projects.duplicate.title')}
	</h1>
</div>
<p class="text-gray-500 dark:text-gray-400 mb-4">
	{$t('projects.duplicate.intro')}
</p>

{#if $loading}
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else if $error}
	<Alert color="red">{$error}</Alert>
{:else if $project}
	<Card class="max-w-md">
		<p class="mb-2 text-gray-900 dark:text-white">
			{$t('projects.duplicate.source')} <strong>{$project.name}</strong>
		</p>
		<Alert color="yellow" class="mb-4">{$t('projects.duplicate.note')}</Alert>
		<Button onclick={duplicate} disabled={$saving}
			>{$saving ? $t('projects.duplicate.submitting') : $t('projects.duplicate.submit')}</Button
		>
	</Card>
{/if}
