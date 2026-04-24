
<script lang="ts">
import { onMount } from 'svelte';
import { getCurrentUser } from '$lib/auth';
import { writable } from 'svelte/store';

const user = writable<any | null>(null);
const loading = writable(true);

onMount(async () => {
	const u = await getCurrentUser();
	user.set(u);
	loading.set(false);
});
</script>

{#if $loading}
	<p>Loading...</p>
{:else}
	{#if $user}
		<h1>Welcome to NOAgenda</h1>
		<p>This is the new home/dashboard page. Here you will see your tasks, projects, and quick links after login.</p>
		<!-- Add dashboard widgets and navigation as needed -->
	{:else}
		<h1>Login Required</h1>
		<p>Please log in to access your dashboard.</p>
		<!-- Add login form or link here -->
		<a href="/login">Go to Login</a>
        

	{/if}
{/if}
