<script lang="ts">
	import { apiPostAuth, apiPutAuth } from '#lib/api.js';
	import { errMessage } from '#lib/errors.js';
	import { showToast } from '#lib/toast.svelte.js';
	import { t, fmt } from '#lib/i18n/index.js';
	import type { WebhookInfo } from '#lib/types.js';
	import { Button } from 'flowbite-svelte';

	/** What a webhook did last, plus "send test" and (for a switched-off one) "turn on again". */
	let { webhook, onChanged }: { webhook: WebhookInfo; onChanged: () => void | Promise<void> } = $props();

	let busy = $state(false);

	async function sendTest() {
		busy = true;
		try {
			const r = await apiPostAuth<{ ok: boolean; status: number | null; error: string | null }>(
				`/webhooks/${webhook.id}/test`,
				{}
			);
			showToast(
				r.ok
					? t('settings.webhooks.testOk', { status: r.status ?? '' })
					: t('settings.webhooks.testFailed', { error: r.error ?? '' }),
				r.ok ? 'success' : 'error'
			);
			await onChanged();
		} catch (e: unknown) {
			showToast(errMessage(e), 'error');
		} finally {
			busy = false;
		}
	}

	async function enable() {
		busy = true;
		try {
			await apiPutAuth(`/webhooks/${webhook.id}`, { active: true });
			await onChanged();
		} catch (e: unknown) {
			showToast(errMessage(e), 'error');
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
	{#if !webhook.active}
		<span class="text-xs font-medium tone-red">{t('settings.webhooks.statusOff')}</span>
	{/if}
	{#if webhook.lastDeliveryAt}
		{#if webhook.lastError}
			<span class="text-xs font-medium tone-yellow">{t('settings.webhooks.statusFailed')}</span>
			<span>{webhook.lastError}</span>
		{:else}
			<span class="text-xs font-medium tone-green">{webhook.lastStatus ?? 'OK'}</span>
		{/if}
		<span>{fmt.dateTime(webhook.lastDeliveryAt)}</span>
	{:else}
		<span>{t('settings.webhooks.statusNever')}</span>
	{/if}
	<Button size="xs" color="light" disabled={busy} onclick={sendTest}>{t('settings.webhooks.test')}</Button>
	{#if !webhook.active}
		<Button size="xs" color="light" disabled={busy} onclick={enable}>{t('settings.webhooks.enable')}</Button>
	{/if}
</div>
