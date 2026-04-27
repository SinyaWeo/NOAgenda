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
				Reset your password
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
					Check your email
				</p>
				<p style="margin:0;font-size:0.875rem">
					If an account exists for that address, we've sent reset
					instructions.
				</p>
			</div>
			<p style="text-align:center;margin-top:1.5rem;font-size:0.875rem">
				<a
					href="/login"
					style="color:#6366f1;text-decoration:none;font-weight:500"
					>Back to Sign in</a
				>
			</p>
		{:else}
			<form
				onsubmit={handleRequest}
				style="display:flex;flex-direction:column;gap:1rem"
			>
				<div>
					<label
						for="reset-email"
						style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
						>Email address</label
					>
					<input
						id="reset-email"
						type="email"
						bind:value={$email}
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
					{$loading ? 'Sending…' : 'Send reset link'}
				</button>
			</form>
			<p
				style="text-align:center;margin-top:1.5rem;font-size:0.875rem;margin-bottom:0"
			>
				<a href="/login" style="color:#94a3b8;text-decoration:none"
					>&larr; Back to Sign in</a
				>
			</p>
		{/if}
	</div>
</div>
