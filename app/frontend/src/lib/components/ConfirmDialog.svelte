<script lang="ts">
	import { Button, Modal } from 'flowbite-svelte';
	import { t } from '#lib/i18n/index.js';
	import { pendingConfirm } from '#lib/confirm.svelte.js';

	// Writable derived: opens with the store; Escape, backdrop or X set it to false, which counts as "no".
	let open = $derived(pendingConfirm.current !== null);

	$effect(() => {
		if (!open && pendingConfirm.current) answer(false);
	});

	function answer(ok: boolean) {
		const req = pendingConfirm.current;
		pendingConfirm.current = null;
		req?.resolve(ok);
	}
</script>

<Modal title={t('common.confirm.title')} bind:open size="xs" outsideclose>
	<p class="text-base text-gray-600 dark:text-gray-300 m-0">{pendingConfirm.current?.message}</p>
	<div class="flex justify-end gap-2 mt-4">
		<Button color="light" onclick={() => answer(false)}>{t('common.cancel')}</Button>
		<Button color="red" data-testid="confirm-accept" onclick={() => answer(true)}>
			{pendingConfirm.current?.confirmLabel ?? t('common.delete')}
		</Button>
	</div>
</Modal>
