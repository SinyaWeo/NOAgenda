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

<div
	style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;padding:1rem"
>
	<div
		style="background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:2.5rem;width:100%;max-width:400px"
	>
		<div style="text-align:center;margin-bottom:2rem">
			<div
				style="font-size:1.8rem;font-weight:700;color:#1e293b;margin-bottom:0.25rem"
			>
				NOAgenda
			</div>
			<h1 style="font-size:1.2rem;font-weight:600;color:#475569;margin:0">
				Set a new password
			</h1>
		</div>
		{#if $error}
			<div
				style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1.25rem;font-size:0.875rem"
			>
				{$error}
			</div>
		{/if}
		{#if $success}
			<div
				style="background:#f0fdf4;border:1px solid #86efac;color:#166534;padding:1rem;border-radius:6px;text-align:center"
			>
				<p style="margin:0 0 0.5rem;font-weight:600">
					Password reset successful
				</p>
				<p style="margin:0;font-size:0.875rem">
					Redirecting to sign in…
				</p>
			</div>
		{:else}
			<form
				onsubmit={handleReset}
				style="display:flex;flex-direction:column;gap:1rem"
			>
				<div>
					<label
						for="new-password"
						style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
						>New Password <span
							style="font-size:0.8rem;color:#9ca3af"
							>(min 8 characters)</span
						></label
					>
					<div style="display:flex;gap:0.5rem">
						<input
							id="new-password"
							type={showPassword ? 'text' : 'password'}
							bind:value={$password}
							required
							minlength={8}
							style="flex:1;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							style="padding:0.5rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;background:#f9fafb;cursor:pointer;font-size:0.8rem;color:#6b7280;white-space:nowrap"
						>
							{showPassword ? 'Hide' : 'Show'}
						</button>
					</div>
				</div>
				<div>
					<label
						for="confirm-password"
						style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
						>Confirm Password</label
					>
					<input
						id="confirm-password"
						type="password"
						bind:value={$confirm}
						required
						style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box"
					/>
				</div>
				<button
					type="submit"
					disabled={$loading}
					style="background:#6366f1;color:#fff;padding:0.65rem 1rem;border:none;border-radius:6px;font-size:0.95rem;font-weight:500;cursor:{$loading
						? 'not-allowed'
						: 'pointer'};opacity:{$loading ? 0.7 : 1}"
				>
					{$loading ? 'Resetting…' : 'Reset Password'}
				</button>
			</form>
		{/if}
	</div>
</div>
