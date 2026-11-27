<script lang="ts">
	import { appName } from '#lib/appName.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import { onMount } from 'svelte';
	import { apiGetAuth } from '#lib/api.js';
	import { t, fmt } from '#lib/i18n/index.js';
	import { TIMELINE } from '#lib/timeline.js';
	import { Alert, Card } from 'flowbite-svelte';
	import type { AppInfo } from '#lib/types-misc.js';

	// AGPL-3.0 section 13: users of a network service must be offered the source of the running version.
	const SOURCE_URL = 'https://github.com/SinyaWeo/NOAgenda';
	const LICENSE_URL = `${SOURCE_URL}/blob/main/LICENSE`;

	let info = $state<AppInfo | null>(null);
	let error = $state('');

	onMount(async () => {
		try {
			info = await apiGetAuth<AppInfo>('/info');
		} catch (e: unknown) {
			error = errMessage(e);
		}
	});
</script>

<div class="max-w-3xl">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
		{t('auth.about.title', { app: appName.current })}
	</h1>
	<p class="text-gray-500 dark:text-gray-400 mb-6">{t('auth.about.tagline')}</p>

	{#if error}
		<Alert color="red">{error}</Alert>
	{:else if info}
		<Card class="max-w-xl">
			<dl class="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3 m-0">
				<dt class="text-gray-500 dark:text-gray-400">{t('common.field.name')}</dt>
				<dd class="text-gray-900 dark:text-white font-medium m-0">{info.name ?? appName.current}</dd>
				<dt class="text-gray-500 dark:text-gray-400">{t('auth.about.version')}</dt>
				<dd class="text-gray-900 dark:text-white font-medium m-0">{info.version ?? '—'}</dd>
				<dt class="text-gray-500 dark:text-gray-400">{t('auth.about.source')}</dt>
				<dd class="text-gray-900 dark:text-white font-medium m-0">
					<a
						href={SOURCE_URL}
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary-700 hover:underline dark:text-primary-500"
					>
						GitHub
					</a>
				</dd>
				<dt class="text-gray-500 dark:text-gray-400">{t('auth.about.license')}</dt>
				<dd class="text-gray-900 dark:text-white font-medium m-0">
					<a
						href={LICENSE_URL}
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary-700 hover:underline dark:text-primary-500"
					>
						AGPL-3.0-or-later
					</a>
				</dd>
				<dt class="text-gray-500 dark:text-gray-400">{t('auth.about.legal')}</dt>
				<dd class="text-gray-900 dark:text-white font-medium m-0 flex flex-col gap-1">
					<a href="/terms" class="text-primary-700 hover:underline dark:text-primary-500">
						{t('auth.about.terms')}
					</a>
					<a href="/privacy" class="text-primary-700 hover:underline dark:text-primary-500">
						{t('auth.about.privacy')}
					</a>
				</dd>
			</dl>
		</Card>
	{:else}
		<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
	{/if}

	{#if TIMELINE.length}
		<h2 class="text-xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
			{t('auth.about.timeline.heading')}
		</h2>
		<ol class="relative border-s border-gray-200 dark:border-gray-700 ms-2">
			{#each TIMELINE as entry (entry.id)}
				<li class="mb-8 ms-6">
					<span
						class="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-300 dark:border-gray-900 dark:bg-gray-600"
					></span>
					<time class="text-sm text-gray-500 dark:text-gray-400">{fmt.date(entry.date)}</time>
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
						{t(`auth.about.timeline.${entry.id}.title` as 'auth.about.license')}
					</h3>
					<p class="text-gray-600 dark:text-gray-400">
						{t(`auth.about.timeline.${entry.id}.body` as 'auth.about.license')}
					</p>
				</li>
			{/each}
		</ol>
	{/if}
</div>
