<script lang="ts">
	import { appName } from '$lib/appName';
	import { errMessage } from '$lib/errors';
	import { writable } from 'svelte/store';
	import { apiPost } from '$lib/api';
	import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';
	import { t, tr } from '$lib/i18n';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';

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
			await apiPost('/auth/password/token', { email: $email });
			success.set(true);
		} catch (e: unknown) {
			error.set(errMessage(e, tr('auth.reset.failed')));
		} finally {
			loading.set(false);
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
	<Card class="w-full max-w-md">
		<div class="text-center mb-6">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{$appName}</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
				{$t('auth.reset.title')}
			</p>
		</div>

		{#if $error}
			<Alert color="red" class="mb-4">{$error}</Alert>
		{/if}

		{#if $success}
			<Alert color="green" class="mb-4">
				<p class="font-semibold">{$t('auth.checkEmail')}</p>
				<p class="text-sm mt-1">
					{$t('auth.reset.sent')}
				</p>
			</Alert>
			<p class="text-sm text-center mt-4">
				<a href="/user/login" class="text-primary-600 dark:text-primary-400 hover:underline">
					{$t('auth.backToSignIn')}
				</a>
			</p>
		{:else}
			<form onsubmit={handleRequest} class="flex flex-col gap-4">
				<div>
					<Label for="reset-email" class="mb-1">{$t('auth.reset.emailLabel')}</Label>
					<Input id="reset-email" type="email" bind:value={$email} required />
				</div>
				<Button type="submit" disabled={$loading} class="w-full">
					{$loading ? $t('auth.reset.sending') : $t('auth.reset.send')}
				</Button>
			</form>
			<p class="text-sm text-center mt-4">
				<a href="/user/login" class="text-gray-400 hover:underline">
					<CaretLeftSolid class="w-4 h-4 inline mr-1" />
					{$t('auth.backToSignIn')}
				</a>
			</p>
		{/if}
	</Card>
</div>
