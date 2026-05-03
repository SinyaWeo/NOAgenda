<script lang="ts">
	import { onMount } from 'svelte';
	import { initializeAuth } from '$lib/auth';
	import { goto } from '$app/navigation';

	onMount(async () => {
		const u = await initializeAuth();
		if (u) {
			goto('/dashboard');
		} else {
			goto('/user/login');
		}
	});
</script>

<p>Loading…</p>
