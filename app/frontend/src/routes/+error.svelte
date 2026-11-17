<script lang="ts">
	import { appName } from '$lib/appName';
	import { page } from '$app/state';
	import { authSession } from '$lib/auth';
	import { t } from '$lib/i18n';
	import { Button } from 'flowbite-svelte';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

	const status = $derived(page.status);
	const signedIn = $derived($authSession.status === 'authenticated');

	const title = $derived(
		status === 404
			? $t('layout.error.notFound')
			: status === 403
				? $t('layout.error.forbidden')
				: status >= 500
					? $t('layout.error.server')
					: $t('layout.error.other')
	);
	// Never show raw server error text for 5xx: it can contain internals.
	const detail = $derived(
		status === 404
			? $t('layout.error.notFoundDetail')
			: status === 403
				? $t('layout.error.forbiddenDetail')
				: status >= 500
					? $t('layout.error.serverDetail')
					: (page.error?.message ?? $t('layout.error.otherDetail'))
	);
</script>

<svelte:head><title>{$t('layout.titleWithApp', { title, app: $appName })}</title></svelte:head>

<div
	class="min-h-screen flex flex-col items-center justify-center gap-2 p-8 text-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
	role="alert"
>
	<ExclamationCircleOutline class="w-16 h-16 text-red-500 mb-2" aria-hidden="true" />
	<p class="text-6xl font-extrabold text-primary-600 leading-none m-0">{status}</p>
	<h1 class="text-xl font-semibold m-0 mt-2">{title}</h1>
	<p class="text-gray-500 dark:text-gray-400 m-0 max-w-md">{detail}</p>
	<div class="flex gap-3 mt-4">
		<Button href={signedIn ? '/dashboard' : '/user/login'}
			>{signedIn ? $t('layout.error.backToDashboard') : $t('layout.error.signIn')}</Button
		>
		<Button color="light" onclick={() => history.back()}>{$t('layout.error.goBack')}</Button>
	</div>
</div>
