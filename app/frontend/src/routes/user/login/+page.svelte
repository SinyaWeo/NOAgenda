<script lang="ts">
	import { appName } from '#lib/appName.svelte.js';
	import Logo from '#lib/components/Logo.svelte';
	import { errMessage } from '#lib/errors.js';
	import { onMount } from 'svelte';
	import { apiError, apiFetch, setToken } from '#lib/api.js';
	import { authSession, refreshCurrentUser } from '#lib/auth.svelte.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';
	import { t } from '#lib/i18n/index.js';
	import LanguageSwitcher from '#lib/components/LanguageSwitcher.svelte';
	import { EyeOutline, EyeSlashOutline } from 'flowbite-svelte-icons';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let showPassword = $state(false);
	let needsVerification = $state(false);
	let resendEmail = $state('');
	let resendStatus = $state('');
	/** Set after the right password when the account has 2FA on: the code step is shown. */
	let mfaToken = $state<string | null>(null);
	let code = $state('');
	let useRecovery = $state(false);

	/** Only ever go back to a page on this site (never an external URL or the login page itself). */
	function safeRedirect(target: string | null): string {
		if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\'))
			return '/dashboard';
		if (target.startsWith('/user/login')) return '/dashboard';
		return target;
	}

	const expired = page.url.searchParams.get('reason') === 'expired';

	// Someone who is already signed in has no business on this page.
	$effect(() => {
		if (authSession.status === 'authenticated' && !loading) {
			goto(safeRedirect(page.url.searchParams.get('redirect')), { replace: true });
		}
	});

	let registrationEnabled = $state(true);
	let demoUsers = $state<
		{ username: string; name: string; password: string; role: string; teamRole?: string | null }[]
	>([]);
	onMount(async () => {
		const cfg: {
			registrationEnabled?: boolean;
			demoUsers?: {
				username: string;
				name: string;
				password: string;
				role: string;
				teamRole?: string | null;
			}[];
		} = await apiFetch('/auth/config')
			.then((r) => (r.ok ? r.json() : {}))
			.catch(() => ({}));
		registrationEnabled = cfg.registrationEnabled !== false;
		demoUsers = cfg.demoUsers ?? [];
	});

	async function handleLogin(event: Event) {
		event.preventDefault();
		loading = true;
		error = '';
		needsVerification = false;
		resendStatus = '';
		try {
			const response = await apiFetch('/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});
			if (!response.ok) {
				const data = await response
					.clone()
					.json()
					.catch(() => ({}));
				if (data.code === 'EMAIL_NOT_VERIFIED') needsVerification = true;
				// Same wording as everywhere else: friendly 429, validation arrays joined, no raw 5xx text.
				throw await apiError(response, t('auth.loginFailed'));
			}
			const data: { access_token?: string; mfaRequired?: boolean; mfaToken?: string } = await response.json();
			if (data.mfaRequired && data.mfaToken) {
				mfaToken = data.mfaToken;
				password = '';
				return;
			}
			await finishLogin(data.access_token ?? '');
		} catch (e) {
			error = e instanceof Error ? errMessage(e) : t('auth.unknownError');
		} finally {
			loading = false;
		}
	}

	async function finishLogin(accessToken: string) {
		setToken(accessToken);
		const me = await refreshCurrentUser();
		if (!me) throw new Error(t('auth.loadAccountFailed'));
		goto(safeRedirect(page.url.searchParams.get('redirect')), { replace: true });
	}

	/** Second step for accounts with 2FA: the code from the app (or a recovery code). */
	async function handleCode(event: Event) {
		event.preventDefault();
		if (!mfaToken || !code) return;
		loading = true;
		error = '';
		try {
			const response = await apiFetch('/auth/login/code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mfaToken, code })
			});
			if (!response.ok) {
				const raw = await response.clone().text();
				const failure = await apiError(response, t('auth.loginFailed'));
				// The password step is too old (or the account got locked): start over.
				if (response.status === 401 && !/Invalid code/.test(raw)) backToPassword();
				code = '';
				throw failure;
			}
			const data: { access_token: string } = await response.json();
			await finishLogin(data.access_token);
		} catch (e) {
			error = e instanceof Error ? errMessage(e) : t('auth.unknownError');
		} finally {
			loading = false;
		}
	}

	function backToPassword() {
		mfaToken = null;
		code = '';
		useRecovery = false;
	}

	async function resendVerification(event: Event) {
		event.preventDefault();
		resendStatus = '';
		const res = await apiFetch('/auth/email/resend', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: resendEmail })
		});
		resendStatus = res.ok ? t('auth.resend.ok') : t('auth.resend.failed');
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
	<Card class="w-full max-w-md">
		<div class="text-center mb-6">
			<div class="flex justify-center mb-3"><Logo size={64} /></div>
			<h1 class="brand-text text-2xl font-bold">{appName.current}</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
				{t('auth.signInTitle')}
			</p>
		</div>

		{#if expired && !error}
			<Alert color="yellow" class="mb-4">{t('auth.sessionExpired')}</Alert>
		{/if}
		{#if error}
			<Alert color="red" class="mb-4">{error}</Alert>
		{/if}

		{#if needsVerification}
			<form onsubmit={resendVerification} class="flex flex-col gap-2 mb-4">
				<Label for="resend-email">{t('auth.resend.label')}</Label>
				<div class="flex gap-2">
					<Input
						id="resend-email"
						type="email"
						bind:value={resendEmail}
						placeholder={t('auth.emailPlaceholder')}
						required
						class="flex-1"
					/>
					<Button type="submit" color="light" class="shrink-0">{t('auth.resend.button')}</Button>
				</div>
				{#if resendStatus}<p class="text-xs text-gray-500 dark:text-gray-400">{resendStatus}</p>{/if}
			</form>
		{/if}

		{#if mfaToken}
			<form onsubmit={handleCode} class="flex flex-col gap-4" data-testid="mfa-login">
				<div>
					<h2 class="text-base font-semibold text-gray-900 dark:text-white m-0">{t('auth.mfa.title')}</h2>
					<p class="text-sm text-gray-600 dark:text-gray-300 mt-1 mb-0">
						{useRecovery ? t('auth.mfa.recoveryPrompt') : t('auth.mfa.prompt')}
					</p>
				</div>
				<div>
					<Label for="login-code" class="mb-1">
						{useRecovery ? t('auth.mfa.recoveryCode') : t('auth.mfa.code')}
					</Label>
					<Input
						id="login-code"
						type="text"
						inputmode={useRecovery ? 'text' : 'numeric'}
						autocomplete="one-time-code"
						maxlength={useRecovery ? 32 : 7}
						bind:value={code}
						data-autofocus
						required
					/>
				</div>
				<Button type="submit" disabled={loading || !code} class="w-full">
					{loading ? t('auth.mfa.verifying') : t('auth.mfa.verify')}
				</Button>
				<div class="flex justify-between text-xs">
					<button
						type="button"
						class="bg-transparent border-0 p-0 cursor-pointer text-primary-600 dark:text-primary-400 hover:underline"
						onclick={() => {
							useRecovery = !useRecovery;
							code = '';
						}}
					>
						{useRecovery ? t('auth.mfa.useApp') : t('auth.mfa.useRecovery')}
					</button>
					<button
						type="button"
						class="bg-transparent border-0 p-0 cursor-pointer text-gray-500 dark:text-gray-400 hover:underline"
						onclick={backToPassword}
					>
						{t('auth.mfa.back')}
					</button>
				</div>
			</form>
		{:else}
			{#if demoUsers.length}
				<div class="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
					<p class="text-sm font-medium">{t('auth.demo.title')}</p>
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('auth.demo.hint')}</p>
					<table class="w-full text-xs">
						<tbody>
							{#each demoUsers as u (u.username)}
								<tr
									class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
									onclick={() => {
										username = u.username;
										password = u.password;
									}}
								>
									<td class="py-1 pr-2 font-mono">{u.username}</td>
									<td class="py-1 pr-2 font-mono">{u.password}</td>
									<td class="py-1 text-right text-gray-500 dark:text-gray-400">
										{u.role === 'admin'
											? t('auth.demo.role.admin')
											: u.teamRole === 'manager'
												? t('auth.demo.role.manager')
												: u.teamRole === 'member'
													? t('auth.demo.role.member')
													: t('auth.demo.role.user')}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<form onsubmit={handleLogin} class="flex flex-col gap-4">
				<div>
					<Label for="login-username" class="mb-1">{t('common.field.username')}</Label>
					<Input id="login-username" type="text" bind:value={username} required />
				</div>
				<div>
					<Label for="login-password" class="mb-1">{t('common.field.password')}</Label>
					<div class="flex gap-2">
						<Input
							id="login-password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							required
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
				<Button type="submit" disabled={loading} class="w-full mt-1">
					{loading ? t('auth.signingIn') : t('auth.signIn')}
				</Button>
			</form>
		{/if}

		{#if registrationEnabled}
			<p class="text-sm text-center text-gray-500 dark:text-gray-400 mt-4">
				{t('auth.noAccount')}
				<a href="/user/register" class="text-primary-600 dark:text-primary-400 hover:underline">
					{t('auth.register')}
				</a>
			</p>
		{/if}
		<p class="text-sm text-center mt-1">
			<a href="/user/get-password-reset" class="text-gray-500 dark:text-gray-400 hover:underline text-xs">
				{t('auth.forgotPassword')}
			</a>
		</p>
		<p class="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
			<a href="/terms" class="hover:underline">{t('auth.terms')}</a> ·
			<a href="/privacy" class="hover:underline">{t('auth.privacy')}</a>
		</p>
		<LanguageSwitcher />
	</Card>
</div>
