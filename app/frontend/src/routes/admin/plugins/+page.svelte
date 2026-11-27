<script lang="ts">
	import { onMount } from 'svelte';
	import { Alert } from 'flowbite-svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import AdminPluginCard from '#lib/components/plugins/AdminPluginCard.svelte';
	import { apiGetAuth } from '#lib/api.js';
	import { errMessage } from '#lib/errors.js';
	import { t } from '#lib/i18n/index.js';
	import type { AdminPlugin } from '#lib/types-misc.js';

	let plugins = $state<AdminPlugin[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			plugins = await apiGetAuth<AdminPlugin[]>('/admin/plugins');
		} catch (e: unknown) {
			error = errMessage(e, t('plugins.loadFailed'));
		} finally {
			loading = false;
		}
	});

	function replace(updated: AdminPlugin) {
		plugins = plugins.map((p) => (p.key === updated.key ? updated : p));
	}
</script>

<svelte:head>
	<title>{t('plugins.admin.pageTitle')}</title>
</svelte:head>

<div class="max-w-3xl">
	<PageHeader title={t('plugins.admin.title')} back={{ href: '/admin', label: t('admin.back') }} />
	<p class="text-sm text-gray-600 dark:text-gray-300 mb-4">{t('plugins.admin.intro')}</p>

	{#if error}
		<Alert color="red" class="mb-4">{error}</Alert>
	{:else if loading}
		<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
	{:else if !plugins.length}
		<p class="text-gray-500 dark:text-gray-400">{t('plugins.admin.empty')}</p>
	{:else}
		<div class="flex flex-col gap-4">
			{#each plugins as p (p.key)}
				<!-- A new server view re-creates the card, so its form starts from what was saved. -->
				{#key p}
					<AdminPluginCard plugin={p} onupdated={replace} />
				{/key}
			{/each}
		</div>
	{/if}
</div>
