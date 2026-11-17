<script lang="ts">
	import { appName } from '$lib/appName';
	import { errMessage } from '$lib/errors';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { apiGetAuth } from '$lib/api';
	import { t } from '$lib/i18n';
	import { Alert, Card } from 'flowbite-svelte';
	import type { AppInfo } from '$lib/types-misc';

	const info = writable<AppInfo | null>(null);
	const error = writable('');

	onMount(async () => {
		try {
			info.set(await apiGetAuth<AppInfo>('/info'));
		} catch (e: unknown) {
			error.set(errMessage(e));
		}
	});
</script>

<div class="max-w-xl">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
		{$t('auth.about.title', { app: $appName })}
	</h1>
	<p class="text-gray-500 dark:text-gray-400 mb-6">{$t('auth.about.tagline')}</p>

	{#if $error}
		<Alert color="red">{$error}</Alert>
	{:else if $info}
		<Card>
			<dl class="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3 m-0">
				<dt class="text-gray-500 dark:text-gray-400">{$t('common.field.name')}</dt>
				<dd class="text-gray-900 dark:text-white font-medium m-0">{$info.name ?? $appName}</dd>
				<dt class="text-gray-500 dark:text-gray-400">{$t('auth.about.version')}</dt>
				<dd class="text-gray-900 dark:text-white font-medium m-0">{$info.version ?? '—'}</dd>
				<dt class="text-gray-500 dark:text-gray-400">{$t('auth.about.builtAt')}</dt>
				<dd class="text-gray-900 dark:text-white font-medium m-0">{$info.builtAt ?? '—'}</dd>
				<dt class="text-gray-500 dark:text-gray-400">{$t('auth.about.commit')}</dt>
				<dd class="font-mono text-sm text-gray-900 dark:text-white m-0">{$info.commit ?? '—'}</dd>
			</dl>
		</Card>
	{:else}
		<p class="text-gray-400">{$t('common.loading')}</p>
	{/if}
</div>
