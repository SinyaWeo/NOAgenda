<script lang="ts">
	import { errMessage } from '$lib/errors';
	import { writable } from 'svelte/store';
	import { apiDeleteAuth } from '$lib/api';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Alert, Button } from 'flowbite-svelte';
	import { t, tr } from '$lib/i18n';
	import { ExclamationCircleOutline, CaretLeftSolid } from 'flowbite-svelte-icons';

	const error = writable('');
	const loading = writable(false);

	async function handleDelete() {
		if (!confirm(tr('projects.delete.confirm'))) return;
		loading.set(true);
		try {
			await apiDeleteAuth(`/projects/${page.params.id}`);
			goto('/projects');
		} catch (e: unknown) {
			error.set(errMessage(e));
			loading.set(false);
		}
	}
</script>

<div class="flex items-center gap-3 mb-6">
	<a href="/projects/{page.params.id}/edit" class="text-gray-400 hover:text-gray-600"
		><CaretLeftSolid class="w-4 h-4 inline mr-1" /> {$t('common.back')}</a
	>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
		{$t('projects.delete.title')}
	</h1>
</div>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<div class="border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 rounded-lg p-5 max-w-lg">
	<div class="flex gap-3 mb-4">
		<ExclamationCircleOutline class="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
		<div>
			<p class="font-bold text-red-600 dark:text-red-400 m-0">
				{$t('projects.delete.warning')}
			</p>
			<p class="text-sm text-gray-600 dark:text-gray-300 m-0">
				{$t('projects.delete.descBefore')} <strong>{$t('projects.delete.descStrong')}</strong>{$t(
					'projects.delete.descAfter'
				)}
			</p>
		</div>
	</div>
	<div class="flex gap-2">
		<Button color="red" disabled={$loading} onclick={handleDelete}
			>{$loading ? $t('projects.delete.submitting') : $t('projects.delete.submit')}</Button
		>
		<Button href="/projects/{page.params.id}/edit" color="light">{$t('common.cancel')}</Button>
	</div>
</div>
