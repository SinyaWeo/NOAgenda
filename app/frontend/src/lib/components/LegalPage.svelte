<script lang="ts">
	import { appName } from '$lib/appName';
	import type { Snippet } from 'svelte';
	import { LEGAL_CONFIGURED } from '$lib/legal';
	import { t, locale } from '$lib/i18n';

	let { title, children }: { title: string; children: Snippet } = $props();
</script>

<svelte:head><title>{$t('layout.titleWithApp', { title, app: $appName })}</title></svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
	<div class="max-w-3xl mx-auto px-4 py-8">
		<p class="text-sm mb-6">
			<a href="/" class="text-primary-600 dark:text-primary-400 hover:underline">← NOAgenda</a>
			<span class="mx-2 text-gray-400">·</span>
			<a href="/terms" class="hover:underline">{$t('layout.legal.terms')}</a>
			<span class="mx-2 text-gray-400">·</span>
			<a href="/privacy" class="hover:underline">{$t('layout.legal.privacy')}</a>
		</p>

		{#if !LEGAL_CONFIGURED}
			<div
				class="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 p-4 text-sm text-yellow-900 dark:text-yellow-200"
				role="note"
			>
				<strong>{$t('layout.legal.templateNoticeTitle')}</strong>
				{$t('layout.legal.templateNotice', { nameVar: 'VITE_OPERATOR_NAME', emailVar: 'VITE_CONTACT_EMAIL' })}
			</div>
		{/if}

		<article class="legal">
			<h1>{title}</h1>
			{#if $locale === 'cs'}
				<p class="meta" lang="cs">{$t('legal.englishOnlyNote')}</p>
			{/if}
			{@render children()}
		</article>
	</div>
</div>

<style>
	.legal :global(h1) {
		font-size: 1.75rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
	}
	.legal :global(h2) {
		font-size: 1.15rem;
		font-weight: 600;
		margin: 1.75rem 0 0.5rem;
	}
	.legal :global(p),
	.legal :global(li) {
		line-height: 1.65;
	}
	.legal :global(p) {
		margin: 0.5rem 0;
	}
	.legal :global(ul) {
		list-style: disc;
		padding-left: 1.4rem;
		margin: 0.5rem 0;
	}
	.legal :global(a) {
		color: var(--color-primary-600);
		text-decoration: underline;
	}
	.legal :global(.meta) {
		color: #6b7280;
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
	}
</style>
