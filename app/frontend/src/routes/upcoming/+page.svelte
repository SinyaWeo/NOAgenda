<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { t } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { getCurrentUser } from '$lib/auth';
	import { goto } from '$app/navigation';
	import CalendarView from '$lib/components/views/CalendarView.svelte';

	let ready = $state(false);

	onMount(async () => {
		if (!(await getCurrentUser())) {
			goto('/user/login');
			return;
		}
		ready = true;
	});
</script>

<PageHeader title={$t('dashboard.upcoming.title')} />

{#if ready}
	<CalendarView />
{:else}
	<p class="text-gray-500 dark:text-gray-400">{$t('common.loading')}</p>
{/if}
