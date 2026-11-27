<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SingleUserModeSection from '#lib/components/SingleUserModeSection.svelte';
	import { appName as sharedAppName, DEFAULT_APP_NAME } from '#lib/appName.svelte.js';
	import { onMount } from 'svelte';
	import { t } from '#lib/i18n/index.js';
	import { apiGetAuth, apiPatchAuth } from '#lib/api.js';
	import { errMessage } from '#lib/errors.js';
	import { Alert, Button, Input, Label, Toggle } from 'flowbite-svelte';

	let error = $state('');
	let success = $state('');
	let saving = $state(false);

	let appName = $state('');
	let allowRegistration = $state(true);
	let requireAdminMfa = $state(false);

	// The notice has two inline <code> names; the translation holds placeholders, split here so word order can differ.
	const ENABLED = '\u0001';
	const INVITE = '\u0002';
	const noticeParts = $derived(
		t('admin.settings.notice', { enabled: ENABLED, inviteCode: INVITE }).split(/([\u0001\u0002])/)
	);

	onMount(async () => {
		try {
			const data = await apiGetAuth<Record<string, string>>('/admin/settings');
			appName = data['appName'] ?? DEFAULT_APP_NAME;
			allowRegistration = (data['allowRegistration'] ?? 'true') === 'true';
			requireAdminMfa = data['requireAdminMfa'] === 'true';
		} catch (_) {
			error = t('admin.settings.loadFailed');
		}
	});

	async function save() {
		saving = true;
		error = '';
		success = '';
		try {
			await apiPatchAuth('/admin/settings', {
				appName,
				allowRegistration: String(allowRegistration),
				requireAdminMfa: String(requireAdminMfa)
			});
			sharedAppName.current = appName.trim() || DEFAULT_APP_NAME;
			success = t('admin.settings.saved');
		} catch (e: unknown) {
			error = errMessage(e, t('admin.settings.saveFailed'));
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{t('admin.settings.pageTitle')}</title>
</svelte:head>

<div class="max-w-xl">
	<PageHeader title={t('admin.settings.title')} back={{ href: '/admin', label: t('admin.back') }} />

	<Alert color="yellow" class="mb-4">
		{#each noticeParts as part, i (i)}{#if part === ENABLED}<code>
					REGISTRATION_ENABLED
				</code>{:else if part === INVITE}<code>REGISTRATION_INVITE_CODE</code>{:else}{part}{/if}{/each}
	</Alert>
	{#if error}
		<Alert color="red" class="mb-4">{error}</Alert>
	{/if}
	{#if success}
		<Alert color="green" class="mb-4">{success}</Alert>
	{/if}

	<form
		onsubmit={(e) => {
			e.preventDefault();
			save();
		}}
		class="flex flex-col gap-5"
	>
		<div>
			<Label for="app-name" class="mb-1">{t('admin.settings.appName')}</Label>
			<Input id="app-name" bind:value={appName} placeholder={DEFAULT_APP_NAME} maxlength={60} />
		</div>
		<div class="flex items-center gap-3">
			<Toggle bind:checked={allowRegistration} />
			<span class="text-sm text-gray-700 dark:text-gray-300">{t('admin.settings.allowRegistration')}</span>
		</div>
		<div>
			<div class="flex items-center gap-3">
				<Toggle bind:checked={requireAdminMfa} data-testid="require-admin-mfa" />
				<span class="text-sm text-gray-700 dark:text-gray-300">{t('admin.settings.requireAdminMfa')}</span>
			</div>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
				{t('admin.settings.requireAdminMfaHint')}
			</p>
		</div>
		<Button type="submit" disabled={saving}>
			{saving ? t('common.saving') : t('admin.settings.save')}
		</Button>
	</form>

	<SingleUserModeSection />
</div>
