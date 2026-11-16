<script lang="ts">
	import { authSession } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';

	let { children } = $props();

	// Fail closed: admin pages are not rendered at all until the signed-in user is confirmed
	// to be an admin. (The API enforces the role too; this just avoids showing the UI.)
	const allowed = $derived($authSession.status === 'authenticated' && $authSession.user?.role === 'admin');

	$effect(() => {
		if ($authSession.status === 'authenticated' && $authSession.user?.role !== 'admin') {
			goto('/dashboard', { replaceState: true });
		}
	});
</script>

{#if allowed}
	{@render children?.()}
{:else}
	<p class="text-gray-400" role="status">{$t('admin.checking')}</p>
{/if}
