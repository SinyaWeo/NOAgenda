<script lang="ts">
	import { appName } from '#lib/appName.svelte.js';
	import Logo from '#lib/components/Logo.svelte';
	import { errMessage } from '#lib/errors.js';
	import { apiPost } from '#lib/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';
	import { t } from '#lib/i18n/index.js';
	import { EyeOutline, EyeSlashOutline } from 'flowbite-svelte-icons';

	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state(false);
	let loading = $state(false);
	let showPassword = $state(false);

	async function handleReset(event: SubmitEvent) {
		event.preventDefault();
		if (password !== confirmPassword) {
			error = t('auth.newPassword.mismatch');
			return;
		}
		loading = true;
		error = '';
		success = false;
		try {
			const token = page.url.searchParams.get('token') ?? '';
			if (!token) throw new Error(t('auth.newPassword.incompleteLink'));
			await apiPost('/auth/password/reset', { token, password });
			success = true;
			setTimeout(() => goto('/user/login'), 2000);
		} catch (e: unknown) {
			error = errMessage(e, t('auth.newPassword.failed'));
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
	<Card class="w-full max-w-md">
		<div class="text-center mb-6">
			<div class="flex justify-center mb-3"><Logo size={64} /></div>
			<h1 class="brand-text text-2xl font-bold">{appName.current}</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('auth.newPassword.title')}</p>
		</div>

		{#if error}
			<Alert color="red" class="mb-4">{error}</Alert>
		{/if}

		{#if success}
			<Alert color="green">
				<p class="font-semibold">{t('auth.newPassword.success')}</p>
				<p class="text-sm mt-1">{t('auth.newPassword.redirecting')}</p>
			</Alert>
		{:else}
			<form onsubmit={handleReset} class="flex flex-col gap-4">
				<div>
					<Label for="new-password" class="mb-1">{t('auth.newPassword.label')}</Label>
					<div class="flex gap-2">
						<Input
							id="new-password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							required
							minlength={8}
							class="flex-1"
						/>
						<Button
							type="button"
							color="light"
							onclick={() => (showPassword = !showPassword)}
							class="shrink-0 px-3"
						>
							{#if showPassword}<EyeSlashOutline class="w-4 h-4" />{:else}<EyeOutline class="w-4 h-4" />{/if}
						</Button>
					</div>
				</div>
				<div>
					<Label for="confirm-password" class="mb-1">{t('auth.newPassword.confirm')}</Label>
					<Input id="confirm-password" type="password" bind:value={confirmPassword} required minlength={8} />
				</div>
				<Button type="submit" disabled={loading} class="w-full">
					{loading ? t('auth.newPassword.submitting') : t('auth.newPassword.submit')}
				</Button>
			</form>
		{/if}
	</Card>
</div>
