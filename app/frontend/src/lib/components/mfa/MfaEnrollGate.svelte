<script lang="ts">
	import { Button, Card } from 'flowbite-svelte';
	import { ShieldCheckOutline } from 'flowbite-svelte-icons';
	import { appName } from '#lib/appName.svelte.js';
	import { refreshCurrentUser } from '#lib/auth.svelte.js';
	import { t } from '#lib/i18n/index.js';
	import { mfaGate } from '#lib/mfa.svelte.js';
	import TotpSetup from './TotpSetup.svelte';

	/**
	 * Shown instead of the whole app while the account must set up 2FA first: the server refuses everything
	 * else until then (MfaEnrollmentGuard).
	 */
	let { onlogout }: { onlogout: () => void } = $props();

	async function finished() {
		mfaGate.current = false;
		await refreshCurrentUser();
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
	<Card class="w-full max-w-md" data-testid="mfa-gate">
		<div class="text-center mb-4">
			<ShieldCheckOutline class="w-10 h-10 mx-auto mb-2 text-primary-600 dark:text-primary-400" />
			<h1 class="text-xl font-bold text-gray-900 dark:text-white m-0">
				{t('settings.security.gateTitle')}
			</h1>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">{appName.current}</p>
		</div>
		<p class="text-sm text-gray-600 dark:text-gray-300 mt-0 mb-4">{t('settings.security.gateText')}</p>
		<TotpSetup onfinished={finished} />
		<div class="text-center mt-4">
			<Button color="light" size="sm" onclick={onlogout}>{t('settings.security.signOut')}</Button>
		</div>
	</Card>
</div>
