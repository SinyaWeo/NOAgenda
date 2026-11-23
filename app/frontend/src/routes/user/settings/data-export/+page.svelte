<script lang="ts">
	import { t, tr } from '$lib/i18n';
	import { errMessage } from '$lib/errors';
	import { writable } from 'svelte/store';
	import { downloadAuthFile } from '$lib/api';
	import { Alert, Button, Card } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';

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

<div class="flex items-center gap-3 mb-6">
	<a href="/user/settings" class="text-gray-400 hover:text-gray-600">
		<CaretLeftSolid class="w-4 h-4 inline mr-1" />
		{$t('settings.back')}
	</a>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
		{$t('settings.export.title')}
	</h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

<Card class="max-w-md">
	<p class="text-sm text-gray-500 mb-4">
		{$t('settings.export.intro')}
	</p>
	<Button onclick={downloadExport} disabled={$loading}>
		{$loading ? $t('settings.export.preparing') : $t('settings.export.download')}
	</Button>
</Card>
