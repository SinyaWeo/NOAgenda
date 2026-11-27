<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { appName } from '#lib/appName.svelte.js';
	import { authSession } from '#lib/auth.svelte.js';
	import { t } from '#lib/i18n/index.js';
	import { recoveryCodesFile } from '#lib/mfa.svelte.js';
	import { showToast } from '#lib/toast.svelte.js';

	let { codes, ondone }: { codes: string[]; ondone: () => void } = $props();

	const heading = $derived(
		t('settings.security.fileHeading', {
			app: appName.current,
			username: authSession.user?.username ?? ''
		})
	);

	async function copy() {
		try {
			await navigator.clipboard.writeText(codes.join('\n'));
			showToast(t('settings.security.copied'));
		} catch {
			// no clipboard access: the codes stay on screen to copy by hand
		}
	}

	function download() {
		const url = URL.createObjectURL(recoveryCodesFile(heading, codes));
		const a = document.createElement('a');
		a.href = url;
		a.download = 'recovery-codes.txt';
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-3" data-testid="recovery-codes">
	<h3 class="text-base font-semibold text-gray-900 dark:text-white m-0">
		{t('settings.security.codesTitle')}
	</h3>
	<p class="text-sm text-gray-600 dark:text-gray-300 m-0">{t('settings.security.codesText')}</p>
	<ul
		class="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm p-3 m-0 list-none rounded-lg border border-gray-200 dark:border-gray-700"
	>
		{#each codes as code (code)}
			<li>{code}</li>
		{/each}
	</ul>
	<div class="flex flex-wrap gap-2">
		<Button color="light" size="sm" onclick={copy}>{t('settings.security.copy')}</Button>
		<Button color="light" size="sm" onclick={download}>{t('settings.security.download')}</Button>
		<Button size="sm" class="ml-auto" data-testid="recovery-codes-done" onclick={ondone}>
			{t('settings.security.saved')}
		</Button>
	</div>
</div>
