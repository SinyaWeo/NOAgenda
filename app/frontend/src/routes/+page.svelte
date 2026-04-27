<script lang="ts">
	import { onMount } from 'svelte';
	import { getCurrentUser } from '$lib/auth';
	import { goto } from '$app/navigation';

	onMount(async () => {
		const u = await getCurrentUser();
		if (u) {
			goto('/dashboard');
		} else {
			goto('/login');
		}
	});
</script>

<p>Loading…</p>
