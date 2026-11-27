<script lang="ts">
	import { singleUserMode } from '#lib/appConfig.svelte.js';
	import { appName } from '#lib/appName.svelte.js';
	import { Card } from 'flowbite-svelte';
	import { t } from '#lib/i18n/index.js';
	import {
		UsersGroupOutline,
		UsersGroupSolid,
		QuoteOutline,
		CogOutline,
		ClipboardListOutline,
		GridPlusOutline
	} from 'flowbite-svelte-icons';
</script>

<svelte:head>
	<title>{t('admin.title', { app: appName.current })}</title>
</svelte:head>

<div class="max-w-3xl">
	<h1 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
		{t('admin.dashboard.title')}
	</h1>
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
		<a href="/admin/users" class="no-underline">
			<Card class="hover:shadow-md transition-shadow cursor-pointer h-full">
				<div class="flex items-center gap-3">
					<UsersGroupOutline class="w-8 h-8 text-primary-600" />
					<div>
						<p class="font-semibold text-gray-900 dark:text-white">
							{t('admin.dashboard.users')}
						</p>
						<p class="text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.usersHint')}</p>
					</div>
				</div>
			</Card>
		</a>
		{#if !singleUserMode.current}<a href="/admin/teams" class="no-underline">
				<Card class="hover:shadow-md transition-shadow cursor-pointer h-full">
					<div class="flex items-center gap-3">
						<UsersGroupSolid class="w-8 h-8 text-primary-600" />
						<div>
							<p class="font-semibold text-gray-900 dark:text-white">
								{t('admin.dashboard.teams')}
							</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.teamsHint')}</p>
						</div>
					</div>
				</Card>
			</a>{/if}
		<a href="/admin/quotes" class="no-underline">
			<Card class="hover:shadow-md transition-shadow cursor-pointer h-full">
				<div class="flex items-center gap-3">
					<QuoteOutline class="w-8 h-8 text-primary-600" />
					<div>
						<p class="font-semibold text-gray-900 dark:text-white">
							{t('admin.dashboard.quotes')}
						</p>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							{t('admin.dashboard.quotesHint')}
						</p>
					</div>
				</div>
			</Card>
		</a>
		<a href="/admin/activity" class="no-underline">
			<Card class="hover:shadow-md transition-shadow cursor-pointer h-full">
				<div class="flex items-center gap-3">
					<ClipboardListOutline class="w-8 h-8 text-primary-600" />
					<div>
						<p class="font-semibold text-gray-900 dark:text-white">
							{t('admin.dashboard.audit')}
						</p>
						<p class="text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.auditHint')}</p>
					</div>
				</div>
			</Card>
		</a>
		<a href="/admin/plugins" class="no-underline">
			<Card class="hover:shadow-md transition-shadow cursor-pointer h-full">
				<div class="flex items-center gap-3">
					<GridPlusOutline class="w-8 h-8 text-primary-600" />
					<div>
						<p class="font-semibold text-gray-900 dark:text-white">
							{t('admin.dashboard.plugins')}
						</p>
						<p class="text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.pluginsHint')}</p>
					</div>
				</div>
			</Card>
		</a>
		<a href="/admin/settings" class="no-underline">
			<Card class="hover:shadow-md transition-shadow cursor-pointer h-full">
				<div class="flex items-center gap-3">
					<CogOutline class="w-8 h-8 text-primary-600" />
					<div>
						<p class="font-semibold text-gray-900 dark:text-white">
							{t('admin.dashboard.settings')}
						</p>
						<p class="text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.settingsHint')}</p>
					</div>
				</div>
			</Card>
		</a>
	</div>
</div>
