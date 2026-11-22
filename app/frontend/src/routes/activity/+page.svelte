<script lang="ts">
	import { t } from '$lib/i18n';
	import { Card } from 'flowbite-svelte';
	import ActivityLog from '$lib/components/ActivityLog.svelte';
</script>

<svelte:head>
	<title>{$t('activity.mine.title')}</title>
</svelte:head>

<div class="max-w-3xl mx-auto">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">{$t('activity.mine.title')}</h1>
	<p class="text-sm text-gray-500 mt-0 mb-6">{$t('activity.mine.hint')}</p>
	<Card class="max-w-none">
		<ActivityLog endpoint="/activity?scope=mine" showProject />
	</Card>
</div>
