<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { confirmDialog } from '#lib/confirm.svelte.js';
	import { t, fmt } from '#lib/i18n/index.js';
	import { errMessage } from '#lib/errors.js';
	import { apiPostAuth } from '#lib/api.js';
	import { authSession, refreshCurrentUser } from '#lib/auth.svelte.js';
	import { onMount } from 'svelte';
	import { Alert, Button, Input, Label } from 'flowbite-svelte';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

	let error = $state('');
	let success = $state('');
	let loading = $state(false);
	let password = $state('');
	let scheduledAt = $state<string | null>(null);
	let graceDays = $state(7);
	onMount(() => {
		const me = authSession.user;
		// A request made earlier (or in another tab) is still pending: show it instead of the bare form.
		scheduledAt = me?.isDeletionRequested ? (me.deletionScheduledAt ?? null) : null;
	});

	async function requestDeletion() {
		if (!password) {
			error = t('settings.deletion.needPassword');
			return;
		}
		if (
			!(await confirmDialog(t('settings.deletion.confirm', { count: graceDays }), {
				confirmLabel: t('settings.deletion.request')
			}))
		)
			return;
		loading = true;
		error = '';
		success = '';
		try {
			const r = await apiPostAuth<{ scheduledAt: string; graceDays: number }>('/user/deletion/request', {
				password
			});
			scheduledAt = r.scheduledAt;
			void refreshCurrentUser();
			graceDays = r.graceDays ?? graceDays;
			password = '';
			success = t('settings.deletion.scheduled', { date: fmt.dateTime(r.scheduledAt) });
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			loading = false;
		}
	}

	async function cancelDeletion() {
		loading = true;
		error = '';
		try {
			await apiPostAuth('/user/deletion/cancel', {});
			scheduledAt = null;
			void refreshCurrentUser();
			success = t('settings.deletion.cancelled');
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			loading = false;
		}
	}
</script>

<PageHeader
	title={t('settings.deletion.title')}
	back={{ href: '/user/settings', label: t('settings.back') }}
/>

{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}
{#if success}<Alert color="green" class="mb-4">{success}</Alert>{/if}
{#if scheduledAt}
	<Alert color="yellow" class="mb-4">
		{#each t( 'settings.deletion.banner', { date: '\u0001' } ).split('\u0001') as part, pi (pi)}{#if pi > 0}<strong>
					{fmt.dateTime(scheduledAt)}
				</strong>{/if}{part}{/each}
	</Alert>
{/if}

<div class="max-w-md border-2 border-red-200 dark:border-red-900 rounded-lg p-5">
	<div class="flex items-start gap-3 mb-5">
		<ExclamationCircleOutline class="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
		<div>
			<p class="font-bold text-red-600 m-0">
				{t('settings.deletion.warning')}
			</p>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1 m-0">
				{#each t( 'settings.deletion.details', { count: graceDays, link: '\u0001' } ).split('\u0001') as part, pi (pi)}{#if pi > 0}<a
							href="/user/settings/data-export"
							class="underline"
						>
							{t('settings.section.dataExport')}
						</a>{/if}{part}{/each}
			</p>
		</div>
	</div>
	<div class="mb-4">
		<Label for="del-password" class="mb-1">{t('settings.deletion.confirmPassword')}</Label>
		<Input id="del-password" type="password" autocomplete="current-password" bind:value={password} />
	</div>
	<div class="flex gap-3 flex-wrap">
		{#if scheduledAt}
			<Button color="light" onclick={cancelDeletion} disabled={loading}>
				{t('settings.deletion.cancelRequest')}
			</Button>
		{:else}
			<Button color="red" onclick={requestDeletion} disabled={loading}>
				{loading ? t('settings.deletion.processing') : t('settings.deletion.request')}
			</Button>
		{/if}
	</div>
</div>
