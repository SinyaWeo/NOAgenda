<script lang="ts">
	import { apiPostAuth, apiPutAuth } from '$lib/api';
	import { errMessage } from '$lib/errors';
	import { showToast } from '$lib/toast';
	import { t, tr, fmt } from '$lib/i18n';
	import type { WebhookInfo } from '$lib/types';
	import { Badge, Button } from 'flowbite-svelte';

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
					? tr('settings.webhooks.testOk', { status: r.status ?? '' })
					: tr('settings.webhooks.testFailed', { error: r.error ?? '' }),
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
		<Badge color="red">{$t('settings.webhooks.statusOff')}</Badge>
	{/if}
	{#if webhook.lastDeliveryAt}
		{#if webhook.lastError}
			<Badge color="yellow">{$t('settings.webhooks.statusFailed')}</Badge>
			<span>{webhook.lastError}</span>
		{:else}
			<Badge color="green">{webhook.lastStatus ?? 'OK'}</Badge>
		{/if}
		<span>{$fmt.dateTime(webhook.lastDeliveryAt)}</span>
	{:else}
		<span>{$t('settings.webhooks.statusNever')}</span>
	{/if}
	<Button size="xs" color="light" disabled={busy} onclick={sendTest}>{$t('settings.webhooks.test')}</Button>
	{#if !webhook.active}
		<Button size="xs" color="light" disabled={busy} onclick={enable}>{$t('settings.webhooks.enable')}</Button>
	{/if}
</div>
