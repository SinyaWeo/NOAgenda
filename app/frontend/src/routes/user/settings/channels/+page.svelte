<script lang="ts">
	import { onMount } from 'svelte';
	import { Alert } from 'flowbite-svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import ChannelCard from '#lib/components/plugins/ChannelCard.svelte';
	import { apiGetAuth } from '#lib/api.js';
	import { errMessage } from '#lib/errors.js';
	import { t } from '#lib/i18n/index.js';
	import type { UserPlugin } from '#lib/types-misc.js';

	let channels = $state<UserPlugin[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			channels = await apiGetAuth<UserPlugin[]>('/user/plugins');
		} catch (e: unknown) {
			error = errMessage(e, t('plugins.loadFailed'));
		} finally {
			loading = false;
		}
	});

	function replace(updated: UserPlugin) {
		channels = channels.map((c) => (c.key === updated.key ? updated : c));
	}
</script>

<svelte:head>
	<title>{t('plugins.channels.pageTitle')}</title>
</svelte:head>

<PageHeader
	title={t('plugins.channels.title')}
	back={{ href: '/user/settings', label: t('settings.back') }}
/>

<div class="flex flex-col gap-4 max-w-xl">
	<p class="text-sm text-gray-600 dark:text-gray-300 m-0">{t('plugins.channels.intro')}</p>
	{#if error}
		<Alert color="red">{error}</Alert>
	{:else if loading}
		<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
	{:else if !channels.length}
		<p class="text-gray-500 dark:text-gray-400">{t('plugins.channels.empty')}</p>
	{:else}
		{#each channels as c (c.key)}
			{#key c}
				<ChannelCard plugin={c} onupdated={replace} />
			{/key}
		{/each}
	{/if}
</div>
