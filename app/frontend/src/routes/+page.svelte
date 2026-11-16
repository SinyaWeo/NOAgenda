<script lang="ts">
	import { onMount } from 'svelte';
	import { initializeAuth } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';

	onMount(async () => {
		const u = await initializeAuth();
		if (u) {
			goto('/dashboard');
		} else {
			goto('/user/login');
		}
	});
</script>

<p>{$t('common.loading')}</p>
