<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n';
	import { Card } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';
	import ActivityLog from '$lib/components/ActivityLog.svelte';
</script>

<svelte:head>
	<title>{$t('activity.project.title')}</title>
</svelte:head>

<div class="max-w-3xl mx-auto">
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{$t('activity.project.title')}</h1>
		<a href="/projects/{page.params.id}" class="text-sm text-primary-600 dark:text-primary-400"
			><CaretLeftSolid class="w-4 h-4 inline mr-1" /> {$t('activity.project.back')}</a
		>
	</div>
	<Card class="max-w-none">
		<ActivityLog endpoint="/activity?projectId={page.params.id}" />
	</Card>
</div>
