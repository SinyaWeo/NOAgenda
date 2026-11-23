<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { t, tr } from '$lib/i18n';
	import { errMessage } from '$lib/errors';
	import { writable } from 'svelte/store';
	import { downloadAuthFile } from '$lib/api';
	import { Alert, Button, Card } from 'flowbite-svelte';

	const error = writable('');
	const success = writable('');
	const loading = writable(false);
	async function downloadExport() {
		loading.set(true);
		error.set('');
		success.set('');
		try {
			const day = new Date().toISOString().slice(0, 10);
			await downloadAuthFile('/user/export', `noagenda-export-${day}.json`);
			success.set(tr('settings.export.done'));
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			loading.set(false);
		}
	}
</script>

<PageHeader
	title={$t('settings.export.title')}
	back={{ href: '/user/settings', label: $t('settings.back') }}
/>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

<Card class="max-w-md">
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
		{$t('settings.export.intro')}
	</p>
	<Button onclick={downloadExport} disabled={$loading}>
		{$loading ? $t('settings.export.preparing') : $t('settings.export.download')}
	</Button>
</Card>
