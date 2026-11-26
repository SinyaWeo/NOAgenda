<script lang="ts">
	import { appName } from '#lib/appName.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { apiPost } from '#lib/api.js';
	import { t } from '#lib/i18n/index.js';
	import { Alert, Button, Card, Spinner } from 'flowbite-svelte';

	let status = $state<'working' | 'ok' | 'error'>('working');
	let message = $state('');

	onMount(async () => {
		const token = page.url.searchParams.get('token');
		if (!token) {
			status = 'error';
			message = t('auth.verify.incomplete');
			return;
		}
		try {
			await apiPost('/auth/email/verify', { token });
			status = 'ok';
		} catch (e: unknown) {
			status = 'error';
			message = errMessage(e, t('auth.verify.failed'));
		}
	});
</script>

<svelte:head><title>{t('auth.verify.pageTitle', { app: appName.current })}</title></svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
	<Card class="w-full max-w-md">
		<div class="text-center mb-6">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{appName.current}</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('auth.verify.title')}</p>
		</div>

		{#if status === 'working'}
			<div class="flex justify-center py-6"><Spinner /></div>
		{:else if status === 'ok'}
			<Alert color="green" class="mb-4">
				<p class="font-semibold">{t('auth.verify.okTitle')}</p>
				<p class="text-sm mt-1">{t('auth.verify.okBody')}</p>
			</Alert>
			<Button href="/user/login" class="w-full">{t('auth.goToSignIn')}</Button>
		{:else}
			<Alert color="red" class="mb-4">
				<p class="font-semibold">{t('auth.verify.invalidTitle')}</p>
				<p class="text-sm mt-1">{t('auth.verify.invalidBody', { message })}</p>
			</Alert>
			<p class="text-sm text-center">
				<a href="/user/login" class="text-primary-600 dark:text-primary-400 hover:underline">
					{t('auth.verify.requestNew')}
				</a>
			</p>
		{/if}
	</Card>
</div>
