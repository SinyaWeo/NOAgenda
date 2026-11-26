<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { page } from '$app/state';
	import { t } from '#lib/i18n/index.js';
	import { Card } from 'flowbite-svelte';
	import ActivityLog from '#lib/components/ActivityLog.svelte';
</script>

<svelte:head>
	<title>{t('activity.project.title')}</title>
</svelte:head>

<div class="max-w-3xl">
	<PageHeader
		title={t('activity.project.title')}
		back={{ href: `/projects/${page.params.id}`, label: t('activity.project.back') }}
	/>
	<Card class="max-w-none">
		<ActivityLog endpoint="/activity?projectId={page.params.id}" />
	</Card>
</div>
