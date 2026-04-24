<script lang="ts">
import { writable } from 'svelte/store';
import { apiFetch } from '$lib/api';

const email = writable('');
const error = writable('');
const success = writable(false);
const loading = writable(false);

async function handleRequest(event: Event) {
	event.preventDefault();
	loading.set(true);
	error.set('');
	success.set(false);
	try {
		const response = await apiFetch('/request-password-reset', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: $email })
		});
		if (!response.ok) {
			throw new Error('Request failed');
		}
		success.set(true);
	} catch (e) {
		if (e instanceof Error) {
			error.set(e.message);
		} else {
			error.set('Unknown error');
		}
	} finally {
		loading.set(false);
	}
}
</script>

<form onsubmit={handleRequest}>
	<h1>Request Password Reset</h1>
	{#if $error}
		<p style="color: red">{$error}</p>
	{/if}
	{#if $success}
		<p style="color: green">Check your email for reset instructions.</p>
	{/if}
	<label>
		Email
		<input type="email" bind:value={$email} required />
	</label>
	<button type="submit" disabled={$loading}>{$loading ? 'Requesting...' : 'Request Reset'}</button>
</form>
