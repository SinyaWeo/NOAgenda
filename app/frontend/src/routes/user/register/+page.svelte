<script lang="ts">
	import { appName } from '$lib/appName';
	import Logo from '$lib/components/Logo.svelte';
	import { errMessage } from '$lib/errors';
	import { get, writable } from 'svelte/store';
	import { apiFetch, apiPost } from '$lib/api';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Alert, Button, Card, Checkbox, Helper, Input, Label } from 'flowbite-svelte';
	import { t, tr, locale } from '$lib/i18n';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { EyeOutline, EyeSlashOutline } from 'flowbite-svelte-icons';

	const username = writable('');
	const email = writable('');
	const password = writable('');
	const error = writable('');
	const loading = writable(false);
	let showPassword = $state(false);
	let checkEmail = $state(false);
	let acceptTerms = $state(false);
	let emailVerificationRequired = $state(false); // from the same /auth/config call as the other flags
	let registrationEnabled = $state(true);
	let inviteRequired = $state(false);
	let inviteCode = $state('');

	// The operator may close registration or require an invite code for a soft launch.
	onMount(async () => {
		const cfg: {
			registrationEnabled?: boolean;
			inviteRequired?: boolean;
			emailVerificationRequired?: boolean;
		} = await apiFetch('/auth/config')
			.then((r) => (r.ok ? r.json() : {}))
			.catch(() => ({}));
		registrationEnabled = cfg.registrationEnabled !== false;
		inviteRequired = cfg.inviteRequired === true;
		emailVerificationRequired = cfg.emailVerificationRequired === true;
	});

	async function handleRegister(event: SubmitEvent) {
		event.preventDefault();
		loading.set(true);
		error.set('');
		try {
			await apiPost('/users', {
				username: $username,
				email: $email,
				password: $password,
				acceptTerms,
				language: get(locale),
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				...(inviteRequired ? { inviteCode: inviteCode.trim() } : {})
			});
			if (emailVerificationRequired) {
				checkEmail = true;
			} else {
				goto('/user/login');
			}
		} catch (e: unknown) {
			error.set(errMessage(e, tr('auth.register.failed')));
		} finally {
			loading.set(false);
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
	<Card class="w-full max-w-md">
		<div class="text-center mb-6">
			<div class="flex justify-center mb-3"><Logo size={64} /></div>
			<h1 class="brand-text text-2xl font-bold">{$appName}</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{$t('auth.register.title')}</p>
		</div>

		{#if $error}
			<Alert color="red" class="mb-4">{$error}</Alert>
		{/if}

		{#if !registrationEnabled}
			<Alert color="yellow" class="mb-4">
				<p class="font-semibold">{$t('auth.register.closedTitle')}</p>
				<p class="text-sm mt-1">{$t('auth.register.closedBody')}</p>
			</Alert>
			<p class="text-sm text-center mt-4">
				<a href="/user/login" class="text-primary-600 dark:text-primary-400 hover:underline">
					{$t('auth.goToSignIn')}
				</a>
			</p>
		{:else if checkEmail}
			<Alert color="green" class="mb-4">
				<p class="font-semibold">{$t('auth.checkEmail')}</p>
				<p class="text-sm mt-1">
					{$t('auth.register.sentLink', { email: $email })}
				</p>
			</Alert>
			<p class="text-sm text-center mt-4">
				<a href="/user/login" class="text-primary-600 dark:text-primary-400 hover:underline">
					{$t('auth.goToSignIn')}
				</a>
			</p>
		{:else}
			<form onsubmit={handleRegister} class="flex flex-col gap-4">
				{#if inviteRequired}
					<div>
						<Label for="reg-invite" class="mb-1">{$t('auth.register.inviteCode')}</Label>
						<Input id="reg-invite" type="text" bind:value={inviteCode} required autocomplete="off" />
						<Helper class="mt-1">{$t('auth.register.inviteHelp')}</Helper>
					</div>
				{/if}
				<div>
					<Label for="reg-username" class="mb-1">{$t('common.field.username')}</Label>
					<Input id="reg-username" type="text" bind:value={$username} required />
				</div>
				<div>
					<Label for="reg-email" class="mb-1">{$t('common.field.email')}</Label>
					<Input id="reg-email" type="email" bind:value={$email} required />
				</div>
				<div>
					<Label for="reg-password" class="mb-1">{$t('common.field.password')}</Label>
					<div class="flex gap-2">
						<Input
							id="reg-password"
							type={showPassword ? 'text' : 'password'}
							bind:value={$password}
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
					<Helper class="mt-1">{$t('auth.register.passwordHint')}</Helper>
				</div>
				<div class="flex items-start gap-2">
					<Checkbox id="reg-terms" bind:checked={acceptTerms} required />
					<Label for="reg-terms" class="text-sm font-normal">
						{$t('auth.register.agreePrefix')}
						<a
							href="/terms"
							target="_blank"
							rel="noopener"
							class="text-primary-600 dark:text-primary-400 hover:underline"
						>
							{$t('auth.register.termsLink')}
						</a>
						{$t('auth.register.agreeAnd')}
						<a
							href="/privacy"
							target="_blank"
							rel="noopener"
							class="text-primary-600 dark:text-primary-400 hover:underline"
						>
							{$t('auth.register.privacyLink')}
						</a>.
					</Label>
				</div>
				<Button type="submit" disabled={$loading || !acceptTerms} class="w-full mt-1">
					{$loading ? $t('auth.register.submitting') : $t('auth.register.submit')}
				</Button>
			</form>

			<p class="text-sm text-center text-gray-500 dark:text-gray-400 mt-4">
				{$t('auth.register.haveAccount')}
				<a href="/user/login" class="text-primary-600 dark:text-primary-400 hover:underline">
					{$t('auth.signIn')}
				</a>
			</p>
		{/if}
		<LanguageSwitcher />
	</Card>
</div>
