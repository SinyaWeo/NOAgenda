<script lang="ts">
	import { writable } from 'svelte/store';
	import { apiPost } from '$lib/api';

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
			await apiPost('/auth/password-reset/request', { email: $email });
			success.set(true);
		} catch (e: any) {
			error.set(e.message ?? 'Request failed');
		} finally {
			loading.set(false);
		}
	}
</script>

<div class="auth-page">
	<div class="auth-card">
		<div style="text-align:center;margin-bottom:2rem">
			<div class="auth-title">NOAgenda</div>
			<p class="auth-subtitle">Reset your password</p>
		</div>
		{#if $error}
			<div class="alert alert-error">{$error}</div>
		{/if}
		{#if $success}
			<div class="alert alert-success">
				<p class="font-bold mb-2">Check your email</p>
				<p class="text-sm">
					If an account exists for that address, we've sent reset
					instructions.
				</p>
			</div>
			<div class="auth-footer"><a href="/login">Back to Sign in</a></div>
		{:else}
			<form onsubmit={handleRequest}>
				<div class="form-group">
					<label for="reset-email" class="form-label"
						>Email address</label
					>
					<input
						id="reset-email"
						type="email"
						bind:value={$email}
						required
						class="form-input"
					/>
				</div>
				<button
					type="submit"
					disabled={$loading}
					class="btn btn-primary"
					style="width:100%"
				>
					{$loading ? 'Sending…' : 'Send reset link'}
				</button>
			</form>
			<div class="auth-footer">
				<a href="/login" class="text-muted">&larr; Back to Sign in</a>
			</div>
		{/if}
	</div>
</div>
