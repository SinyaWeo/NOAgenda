<script lang="ts">
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

<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0 mb-6">
	{$t('dashboard.upcoming.title')}
</h1>

{#if ready}
	<CalendarView />
{:else}
	<p class="text-gray-400">{$t('common.loading')}</p>
{/if}
