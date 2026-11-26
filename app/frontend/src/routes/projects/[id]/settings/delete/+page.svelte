<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { confirmDialog } from '#lib/confirm.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import { apiDeleteAuth } from '#lib/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Alert, Button } from 'flowbite-svelte';
	import { t } from '#lib/i18n/index.js';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

	let error = $state('');
	let loading = $state(false);

	async function handleDelete() {
		if (!(await confirmDialog(t('projects.delete.confirm')))) return;
		loading = true;
		try {
			await apiDeleteAuth(`/projects/${page.params.id}`);
			goto('/projects');
		} catch (e: unknown) {
			error = errMessage(e);
			loading = false;
		}
	}
</script>

<PageHeader
	title={t('projects.delete.title')}
	back={{ href: `/projects/${page.params.id}/edit`, label: t('common.back') }}
/>
{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}

<div class="border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 rounded-lg p-5 max-w-lg">
	<div class="flex gap-3 mb-4">
		<ExclamationCircleOutline class="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
		<div>
			<p class="font-bold text-red-600 dark:text-red-400 m-0">
				{t('projects.delete.warning')}
			</p>
			<p class="text-sm text-gray-600 dark:text-gray-300 m-0">
				{t('projects.delete.descBefore')} <strong>{t('projects.delete.descStrong')}</strong>{t(
					'projects.delete.descAfter'
				)}
			</p>
		</div>
	</div>
	<div class="flex gap-2">
		<Button color="red" disabled={loading} onclick={handleDelete}>
			{loading ? t('projects.delete.submitting') : t('projects.delete.submit')}
		</Button>
		<Button href="/projects/{page.params.id}/edit" color="light">{t('common.cancel')}</Button>
	</div>
</div>
