<script lang="ts">
	import { Alert, Button, Input, Label } from 'flowbite-svelte';
	import { apiPostAuth } from '#lib/api.js';
	import { authSession } from '#lib/auth.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import { t } from '#lib/i18n/index.js';
	import QrCode from './QrCode.svelte';
	import RecoveryCodes from './RecoveryCodes.svelte';

	/** `onfinished` runs once 2FA is on and the user has acknowledged the recovery codes. */
	let { onfinished }: { onfinished: () => void } = $props();

	let step = $state<'password' | 'scan' | 'codes'>('password');
	let password = $state('');
	let code = $state('');
	let secret = $state('');
	let uri = $state('');
	let recoveryCodes = $state<string[]>([]);
	let busy = $state(false);
	let error = $state('');

	/** The key in groups of four, easier to type into an app by hand. */
	const groupedSecret = $derived(secret.replace(/(.{4})/g, '$1 ').trim());

	async function start(e: Event) {
		e.preventDefault();
		if (busy || !password) return;
		busy = true;
		error = '';
		try {
			const res = await apiPostAuth<{ secret: string; uri: string }>('/user/mfa/setup', { password });
			secret = res.secret;
			uri = res.uri;
			password = '';
			step = 'scan';
		} catch (err: unknown) {
			error = errMessage(err);
		} finally {
			busy = false;
		}
	}

	async function enable(e: Event) {
		e.preventDefault();
		if (busy || !code) return;
		busy = true;
		error = '';
		try {
			const res = await apiPostAuth<{ recoveryCodes: string[] }>('/user/mfa/enable', { code });
			recoveryCodes = res.recoveryCodes;
			secret = '';
			uri = '';
			step = 'codes';
		} catch (err: unknown) {
			error = errMessage(err);
			code = '';
		} finally {
			busy = false;
		}
	}
</script>

<div class="space-y-4">
	{#if error}<Alert color="red">{error}</Alert>{/if}

	{#if step === 'password'}
		<form onsubmit={start} class="space-y-3">
			<p class="text-sm text-gray-600 dark:text-gray-300 m-0">{t('settings.security.passwordStep')}</p>
			<!-- Lets password managers know which account the password is for. -->
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
				<Label for="mfa-setup-password" class="mb-1">{t('common.field.password')}</Label>
				<Input
					id="mfa-setup-password"
					type="password"
					autocomplete="current-password"
					bind:value={password}
					disabled={busy}
					required
				/>
			</div>
			<Button type="submit" disabled={busy || !password} data-testid="mfa-setup-start">
				{t('settings.security.continue')}
			</Button>
		</form>
	{:else if step === 'scan'}
		<form onsubmit={enable} class="space-y-3">
			<p class="text-sm text-gray-600 dark:text-gray-300 m-0">{t('settings.security.scan')}</p>
			<div class="flex justify-center"><QrCode value={uri} label={t('settings.security.qrLabel')} /></div>
			<p class="text-xs text-gray-500 dark:text-gray-400 m-0">{t('settings.security.manual')}</p>
			<p class="font-mono text-sm break-all m-0 select-all" data-testid="mfa-secret">{groupedSecret}</p>
			<div>
				<Label for="mfa-setup-code" class="mb-1">{t('auth.mfa.code')}</Label>
				<Input
					id="mfa-setup-code"
					inputmode="numeric"
					autocomplete="one-time-code"
					maxlength={7}
					bind:value={code}
					disabled={busy}
					required
				/>
			</div>
			<Button type="submit" disabled={busy || !code} data-testid="mfa-setup-enable">
				{t('settings.security.enable')}
			</Button>
		</form>
	{:else}
		<Alert color="green">{t('settings.security.enabled')}</Alert>
		<RecoveryCodes codes={recoveryCodes} ondone={onfinished} />
	{/if}
</div>
