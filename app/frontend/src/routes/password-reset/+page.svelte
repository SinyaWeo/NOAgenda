<script lang="ts">
import { writable } from 'svelte/store';
import { apiFetch } from '$lib/api';

const password = writable('');
const error = writable('');
const success = writable(false);
const loading = writable(false);

async function handleReset(event: Event) {
	event.preventDefault();
	loading.set(true);
	error.set('');
	success.set(false);
	try {
		const response = await apiFetch('/password-reset', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password: $password })
		});
		if (!response.ok) {
			throw new Error('Reset failed');
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

<form onsubmit={handleReset}>
	<h1>Reset Password</h1>
	{#if $error}
		<p style="color: red">{$error}</p>
	{/if}
	{#if $success}
		<p style="color: green">Password reset successful. You can now log in.</p>
	{/if}
	<label>
		New Password
		<input type="password" bind:value={$password} required />
	</label>
	<button type="submit" disabled={$loading}>{$loading ? 'Resetting...' : 'Reset Password'}</button>
</form>
