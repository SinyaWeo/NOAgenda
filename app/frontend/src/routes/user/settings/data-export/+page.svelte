<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { t } from '#lib/i18n/index.js';
	import { errMessage } from '#lib/errors.js';
	import { downloadAuthFile } from '#lib/api.js';
	import { Alert, Button, Card } from 'flowbite-svelte';

	let error = $state('');
	let success = $state('');
	let loading = $state(false);
	async function downloadExport() {
		loading = true;
		error = '';
		success = '';
		try {
			const day = new Date().toISOString().slice(0, 10);
			await downloadAuthFile('/user/export', `noagenda-export-${day}.json`);
			success = t('settings.export.done');
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			loading = false;
		}
	}
</script>

<PageHeader title={t('settings.export.title')} back={{ href: '/user/settings', label: t('settings.back') }} />

{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}
{#if success}<Alert color="green" class="mb-4">{success}</Alert>{/if}

<Card class="max-w-md">
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
		{t('settings.export.intro')}
	</p>
	<Button onclick={downloadExport} disabled={loading}>
		{loading ? t('settings.export.preparing') : t('settings.export.download')}
	</Button>
</Card>
