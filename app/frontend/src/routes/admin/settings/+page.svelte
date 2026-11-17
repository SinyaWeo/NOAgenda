<script lang="ts">
	import { appName as appNameStore, DEFAULT_APP_NAME } from '$lib/appName';
	import { onMount } from 'svelte';
	import { t, tr } from '$lib/i18n';
	import { apiGetAuth, apiPatchAuth } from '$lib/api';
	import { writable } from 'svelte/store';
	import { Alert, Button, Input, Label, Toggle } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';

	const settings = writable<Record<string, string>>({});
	const error = writable('');
	const success = writable('');
	const saving = writable(false);

	let appName = $state('');
	let allowRegistration = $state(true);

	// The notice has two inline <code> names; the translation holds placeholders, split here so word order can differ.
	const ENABLED = '\u0001';
	const INVITE = '\u0002';
	const noticeParts = $derived(
		$t('admin.settings.notice', { enabled: ENABLED, inviteCode: INVITE }).split(/([\u0001\u0002])/)
	);

	onMount(async () => {
		try {
			const data = await apiGetAuth<Record<string, string>>('/admin/settings');
			settings.set(data);
			appName = data['appName'] ?? DEFAULT_APP_NAME;
			allowRegistration = (data['allowRegistration'] ?? 'true') === 'true';
		} catch (_) {
			error.set(tr('admin.settings.loadFailed'));
		}
	});

	async function save() {
		saving.set(true);
		error.set('');
		success.set('');
		try {
			await apiPatchAuth('/admin/settings', {
				appName,
				allowRegistration: String(allowRegistration)
			});
			appNameStore.set(appName.trim() || DEFAULT_APP_NAME);
			success.set(tr('admin.settings.saved'));
		} catch (_) {
			error.set(tr('admin.settings.saveFailed'));
		} finally {
			saving.set(false);
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.settings.pageTitle')}</title>
</svelte:head>

<div class="max-w-xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
			{$t('admin.settings.title')}
		</h1>
		<a href="/admin" class="text-sm text-primary-600 dark:text-primary-400"
			><CaretLeftSolid class="w-4 h-4 inline mr-1" /> {$t('admin.back')}</a
		>
	</div>

	<Alert color="yellow" class="mb-4">
		{#each noticeParts as part}{#if part === ENABLED}<code>REGISTRATION_ENABLED</code
				>{:else if part === INVITE}<code>REGISTRATION_INVITE_CODE</code>{:else}{part}{/if}{/each}
	</Alert>
	{#if $error}
		<Alert color="red" class="mb-4">{$error}</Alert>
	{/if}
	{#if $success}
		<Alert color="green" class="mb-4">{$success}</Alert>
	{/if}

	<form
		onsubmit={(e) => {
			e.preventDefault();
			save();
		}}
		class="flex flex-col gap-5"
	>
		<div>
			<Label for="app-name" class="mb-1">{$t('admin.settings.appName')}</Label>
			<Input id="app-name" bind:value={appName} placeholder={DEFAULT_APP_NAME} maxlength={60} />
		</div>
		<div class="flex items-center gap-3">
			<Toggle bind:checked={allowRegistration} />
			<span class="text-sm text-gray-700 dark:text-gray-300">{$t('admin.settings.allowRegistration')}</span>
		</div>
		<Button type="submit" disabled={$saving}>
			{$saving ? $t('common.saving') : $t('admin.settings.save')}
		</Button>
	</form>
</div>
