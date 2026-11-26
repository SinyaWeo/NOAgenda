<script lang="ts">
	import { t, type MessageKey } from '#lib/i18n/index.js';
	import type { Component } from 'svelte';
	import { authSession } from '#lib/auth.svelte.js';
	import { isAdmin } from '#lib/roles.js';
	import { Card } from 'flowbite-svelte';
	import {
		UserCircleOutline,
		ApiKeyOutline,
		DesktopPcOutline,
		LinkOutline,
		ArrowDownToBracketOutline,
		TrashBinOutline,
		QuoteOutline
	} from 'flowbite-svelte-icons';

	const me = $derived(authSession.user);

	const sections = [
		{
			href: '/user/settings/profile',
			icon: UserCircleOutline,
			labelKey: 'settings.section.profile',
			descKey: 'settings.section.profile.desc'
		},
		{
			href: '/user/settings/api-tokens',
			icon: ApiKeyOutline,
			labelKey: 'settings.section.apiTokens',
			descKey: 'settings.section.apiTokens.desc'
		},
		{
			href: '/user/settings/sessions',
			icon: DesktopPcOutline,
			labelKey: 'settings.section.sessions',
			descKey: 'settings.section.sessions.desc'
		},
		{
			href: '/user/settings/webhooks',
			icon: LinkOutline,
			labelKey: 'settings.section.webhooks',
			descKey: 'settings.section.webhooks.desc'
		},
		{
			href: '/user/settings/data-export',
			icon: ArrowDownToBracketOutline,
			labelKey: 'settings.section.dataExport',
			descKey: 'settings.section.dataExport.desc'
		},
		{
			href: '/user/settings/deletion',
			icon: TrashBinOutline,
			labelKey: 'settings.section.deletion',
			descKey: 'settings.section.deletion.desc',
			danger: true
		}
	] satisfies {
		href: string;
		icon: Component<{ class?: string }>;
		labelKey: MessageKey;
		descKey: MessageKey;
		danger?: true;
	}[];
</script>

<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('settings.title')}</h1>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
	{#each sections as s (s.href)}
		<a href={s.href} class="no-underline h-full">
			<Card
				class="hover:shadow-md transition-shadow cursor-pointer h-full {s.danger
					? 'border-red-200 dark:border-red-800'
					: ''}"
			>
				<div class="flex items-center gap-3">
					<s.icon class="w-8 h-8 shrink-0 {s.danger ? 'text-red-600' : 'text-primary-600'}" />
					<div>
						<p class="font-semibold m-0 {s.danger ? 'text-red-600' : 'text-gray-900 dark:text-white'}">
							{t(s.labelKey)}
						</p>
						<p class="text-sm text-gray-500 dark:text-gray-400 m-0">{t(s.descKey)}</p>
					</div>
				</div>
			</Card>
		</a>
	{/each}
</div>

{#if isAdmin(me)}
	<h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-8 mb-3">
		{t('settings.admin')}
	</h2>
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
		<a href="/admin/quotes" class="no-underline h-full">
			<Card class="hover:shadow-md transition-shadow cursor-pointer h-full">
				<div class="flex items-center gap-3">
					<QuoteOutline class="w-8 h-8 shrink-0 text-primary-600" />
					<div>
						<p class="font-semibold m-0 text-gray-900 dark:text-white">
							{t('settings.quotes.title')}
						</p>
						<p class="text-sm text-gray-500 dark:text-gray-400 m-0">
							{t('settings.quotes.desc')}
						</p>
					</div>
				</div>
			</Card>
		</a>
	</div>
{/if}
