<script lang="ts">
	import { onMount } from 'svelte';
	import { initializeAuth } from '#lib/auth.svelte.js';
	import { goto } from '$app/navigation';
	import { t } from '#lib/i18n/index.js';

	onMount(async () => {
		const u = await initializeAuth();
		if (u) {
			goto('/dashboard');
		} else {
			goto('/user/login');
		}
	});
</script>

<p>{t('common.loading')}</p>
