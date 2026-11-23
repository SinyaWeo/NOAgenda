<script lang="ts">
	import { t, tr } from '$lib/i18n';
	import { errMessage } from '$lib/errors';
	import { writable } from 'svelte/store';
	import { apiPostAuth } from '$lib/api';
	import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';

	let email = $state('');
	let password = $state('');
	const error = writable('');
	const success = writable('');
	const saving = writable(false);

	async function handleSave(e: Event) {
		e.preventDefault();
		saving.set(true);
		error.set('');
		success.set('');
		try {
			await apiPostAuth('/user/settings/email', { email, password });
			success.set(tr('settings.email.done'));
			email = '';
			password = '';
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			saving.set(false);
		}
	}
</script>

<div class="flex items-center gap-3 mb-6">
	<a href="/user/settings" class="text-gray-400 hover:text-gray-600">
		<CaretLeftSolid class="w-4 h-4 inline mr-1" />
		{$t('settings.back')}
	</a>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
		{$t('settings.email.title')}
	</h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

<Card class="max-w-xl">
	<p class="text-sm text-gray-500 mb-4">
		{$t('settings.email.intro')}
	</p>
	<form onsubmit={handleSave} class="flex flex-col gap-4">
		<div>
			<Label for="new-email" class="mb-1">{$t('settings.email.newEmail')}</Label>
			<Input id="new-email" type="email" bind:value={email} required />
		</div>
		<div>
			<Label for="email-pw" class="mb-1">{$t('settings.email.currentPassword')}</Label>
			<Input id="email-pw" type="password" bind:value={password} required />
		</div>
		<div class="pt-2 border-t border-gray-100 dark:border-gray-700">
			<Button type="submit" disabled={$saving}>
				{$saving ? $t('settings.email.sending') : $t('settings.email.submit')}
			</Button>
		</div>
	</form>
</Card>
