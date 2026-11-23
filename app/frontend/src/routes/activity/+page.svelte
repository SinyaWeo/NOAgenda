<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { t } from '$lib/i18n';
	import { Card } from 'flowbite-svelte';
	import ActivityLog from '$lib/components/ActivityLog.svelte';
</script>

<svelte:head>
	<title>{$t('activity.mine.title')}</title>
</svelte:head>

<div class="max-w-3xl">
	<PageHeader title={$t('activity.mine.title')} subtitle={$t('activity.mine.hint')} />
	<Card class="max-w-none">
		<ActivityLog endpoint="/activity?scope=mine" showProject />
	</Card>
</div>
