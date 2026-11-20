<script lang="ts">
	import { appName } from '$lib/appName';
	import { errMessage } from '$lib/errors';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { apiGetAuth } from '$lib/api';
	import { t } from '$lib/i18n';
	import { Alert, Card } from 'flowbite-svelte';
	import type { AppInfo } from '$lib/types-misc';

	// AGPL-3.0 section 13: users of a network service must be offered the source of the running version.
	const SOURCE_URL = 'https://github.com/SinyaWeo/NOAgenda';
	const LICENSE_URL = `${SOURCE_URL}/blob/main/LICENSE`;

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
				<dt class="text-gray-500 dark:text-gray-400">{$t('auth.about.source')}</dt>
				<dd class="text-gray-900 dark:text-white font-medium m-0">
					<a
						href={SOURCE_URL}
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary-700 hover:underline dark:text-primary-500">NOAgenda on GitHub</a
					>
				</dd>
				<dt class="text-gray-500 dark:text-gray-400">{$t('auth.about.license')}</dt>
				<dd class="text-gray-900 dark:text-white font-medium m-0">
					<a
						href={LICENSE_URL}
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary-700 hover:underline dark:text-primary-500">AGPL-3.0-or-later</a
					>
				</dd>
			</dl>
		</Card>
	{:else}
		<p class="text-gray-400">{$t('common.loading')}</p>
	{/if}
</div>
