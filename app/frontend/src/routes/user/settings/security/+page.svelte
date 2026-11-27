<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import TotpSetup from '#lib/components/mfa/TotpSetup.svelte';
	import RecoveryCodes from '#lib/components/mfa/RecoveryCodes.svelte';
	import { demoMode } from '#lib/appConfig.svelte.js';
	import { apiGetAuth, apiPostAuth } from '#lib/api.js';
	import { authSession, patchCurrentUser } from '#lib/auth.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import { t, fmt } from '#lib/i18n/index.js';
	import { showToast } from '#lib/toast.svelte.js';
	import { onMount } from 'svelte';
	import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';

	interface MfaStatus {
		enabled: boolean;
		enabledAt: string | null;
		recoveryCodesLeft: number;
		required: boolean;
	}

	let status = $state<MfaStatus | null>(null);
	let loading = $state(true);
	let error = $state('');
	let busy = $state(false);

	/** Which form is open. */
	let mode = $state<'idle' | 'setup' | 'regenerate' | 'disable'>('idle');
	let code = $state('');
	let password = $state('');
	/** Fresh recovery codes to show once (after making new ones). */
	let newCodes = $state<string[]>([]);

	async function load() {
		status = await apiGetAuth<MfaStatus>('/user/mfa');
		patchCurrentUser({ totpEnabledAt: status.enabledAt });
	}

	onMount(async () => {
		try {
			await load();
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			loading = false;
		}
	});

	function open(next: typeof mode) {
		mode = next;
		code = '';
		password = '';
		error = '';
	}

	async function setupFinished() {
		open('idle');
		await load();
	}

	async function regenerate(e: Event) {
		e.preventDefault();
		if (busy) return;
		busy = true;
		error = '';
		try {
			const res = await apiPostAuth<{ recoveryCodes: string[] }>('/user/mfa/recovery-codes', { code });
			newCodes = res.recoveryCodes;
			open('idle');
			await load();
		} catch (err: unknown) {
			error = errMessage(err);
		} finally {
			busy = false;
		}
	}

	async function disable(e: Event) {
		e.preventDefault();
		if (busy) return;
		busy = true;
		error = '';
		try {
			await apiPostAuth('/user/mfa/disable', { password, code });
			open('idle');
			await load();
			showToast(t('settings.security.disabled'));
		} catch (err: unknown) {
			error = errMessage(err);
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader
	title={t('settings.security.title')}
	back={{ href: '/user/settings', label: t('settings.back') }}
/>

<div class="max-w-xl space-y-4">
	<p class="text-sm text-gray-600 dark:text-gray-300 m-0">{t('settings.security.intro')}</p>
	{#if error}<Alert color="red">{error}</Alert>{/if}

	{#if loading}
		<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
	{:else if status}
		<Card class="max-w-none space-y-4">
			<p class="text-sm m-0" data-testid="mfa-status">
				<span
					class="font-medium {status.enabled ? 'tone-green' : 'tone-gray'}"
					data-mfa={status.enabled ? 'on' : 'off'}
				>
					{status.enabled && status.enabledAt
						? t('settings.security.statusOn', { date: fmt.date(status.enabledAt) })
						: t('settings.security.statusOff')}
				</span>
			</p>

			{#if status.required}
				<p class="text-xs text-gray-500 dark:text-gray-400 m-0">{t('settings.security.required')}</p>
			{/if}

			{#if newCodes.length}
				<RecoveryCodes codes={newCodes} ondone={() => (newCodes = [])} />
			{:else if demoMode.current}
				<Alert color="yellow">{t('settings.security.demo')}</Alert>
			{:else if !status.enabled}
				{#if mode === 'setup'}
					<TotpSetup onfinished={setupFinished} />
				{:else}
					<Button onclick={() => open('setup')} data-testid="mfa-start">
						{t('settings.security.start')}
					</Button>
				{/if}
			{:else}
				<p class="text-sm text-gray-700 dark:text-gray-300 m-0">
					{t('settings.security.recoveryLeft', { count: status.recoveryCodesLeft })}
				</p>
				{#if status.recoveryCodesLeft <= 3}
					<p class="text-xs tone-yellow m-0">{t('settings.security.recoveryLow')}</p>
				{/if}

				{#if mode === 'regenerate'}
					<form onsubmit={regenerate} class="space-y-3">
						<p class="text-sm text-gray-600 dark:text-gray-300 m-0">
							{t('settings.security.regenerateText')}
						</p>
						<div>
							<Label for="mfa-regen-code" class="mb-1">{t('auth.mfa.code')}</Label>
							<Input
								id="mfa-regen-code"
								inputmode="numeric"
								autocomplete="one-time-code"
								maxlength={7}
								bind:value={code}
								disabled={busy}
								required
							/>
						</div>
						<div class="flex gap-2">
							<Button type="submit" disabled={busy || !code}>{t('settings.security.regenerate')}</Button>
							<Button color="light" onclick={() => open('idle')} disabled={busy}>{t('common.cancel')}</Button>
						</div>
					</form>
				{:else if mode === 'disable'}
					<form onsubmit={disable} class="space-y-3">
						<p class="text-sm text-gray-600 dark:text-gray-300 m-0">
							{t('settings.security.disableText')}
						</p>
						<input
							type="text"
							class="hidden"
							autocomplete="username"
							value={authSession.user?.username ?? ''}
							readonly
							tabindex="-1"
							aria-hidden="true"
						/>
						<div>
							<Label for="mfa-disable-password" class="mb-1">{t('common.field.password')}</Label>
							<Input
								id="mfa-disable-password"
								type="password"
								autocomplete="current-password"
								bind:value={password}
								disabled={busy}
								required
							/>
						</div>
						<div>
							<Label for="mfa-disable-code" class="mb-1">{t('auth.mfa.code')}</Label>
							<Input
								id="mfa-disable-code"
								autocomplete="one-time-code"
								bind:value={code}
								disabled={busy}
								required
							/>
						</div>
						<div class="flex gap-2">
							<Button type="submit" color="red" disabled={busy || !code || !password}>
								{t('settings.security.disable')}
							</Button>
							<Button color="light" onclick={() => open('idle')} disabled={busy}>{t('common.cancel')}</Button>
						</div>
					</form>
				{:else}
					<div class="flex flex-wrap gap-2">
						<Button color="light" onclick={() => open('regenerate')}>
							{t('settings.security.regenerate')}
						</Button>
						{#if !status.required}
							<Button color="red" outline onclick={() => open('disable')}>
								{t('settings.security.disable')}
							</Button>
						{/if}
					</div>
				{/if}
			{/if}
		</Card>
	{/if}
</div>
