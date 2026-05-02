<script lang="ts">
	import { writable } from 'svelte/store';
	import { apiPost } from '$lib/api';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const password = writable('');
	const confirm = writable('');
	const error = writable('');
	const success = writable(false);
	const loading = writable(false);
	let showPassword = false;

	async function handleReset(event: SubmitEvent) {
		event.preventDefault();
		if ($password !== $confirm) {
			error.set('Passwords do not match');
			return;
		}
		loading.set(true);
		error.set('');
		success.set(false);
		try {
			const token = $page.url.searchParams.get('token') ?? '';
			await apiPost('/auth/password-reset/reset', {
				token,
				password: $password,
			});
			success.set(true);
			setTimeout(() => goto('/login'), 2000);
		} catch (e: any) {
			error.set(e.message ?? 'Reset failed');
		} finally {
			loading.set(false);
		}
	}
</script>

<div class="auth-page">
	<div class="auth-card">
		<div style="text-align:center;margin-bottom:2rem">
			<div class="auth-title">NOAgenda</div>
			<p class="auth-subtitle">Set a new password</p>
		</div>
		{#if $error}
			<div class="alert alert-error">{$error}</div>
		{/if}
		{#if $success}
			<div class="alert alert-success">
				<p class="font-bold mb-2">Password reset successful</p>
				<p class="text-sm">Redirecting to sign in…</p>
			</div>
		{:else}
			<form onsubmit={handleReset}>
				<div class="form-group">
					<label for="new-password" class="form-label"
						>New Password <span class="text-xs text-muted"
							>(min 8 characters)</span
						></label
					>
					<div class="input-with-action">
						<input
							id="new-password"
							type={showPassword ? 'text' : 'password'}
							bind:value={$password}
							required
							minlength={8}
							class="form-input"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="btn-show-hide"
						>
							{showPassword ? 'Hide' : 'Show'}
						</button>
					</div>
				</div>
				<div class="form-group">
					<label for="confirm-password" class="form-label"
						>Confirm Password</label
					>
					<input
						id="confirm-password"
						type="password"
						bind:value={$confirm}
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
					{$loading ? 'Resetting…' : 'Reset Password'}
				</button>
			</form>
		{/if}
	</div>
</div>
