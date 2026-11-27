<script lang="ts">
	import { Button, Card, Checkbox } from 'flowbite-svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { apiDeleteAuth, apiPostAuth, apiPutAuth } from '#lib/api.js';
	import { confirmDialog } from '#lib/confirm.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import { t, fmt, type MessageKey } from '#lib/i18n/index.js';
	import { fieldChanges, pluginDescription, pluginName } from '#lib/plugins.js';
	import { showToast } from '#lib/toast.svelte.js';
	import { NOTIFICATION_TYPES, type NotificationType, type UserPlugin } from '#lib/types-misc.js';
	import PluginFields from './PluginFields.svelte';

	interface Props {
		plugin: UserPlugin;
		/** The server's new view after a change (the parent re-creates this card with it). */
		onupdated: (plugin: UserPlugin) => void;
	}
	let { plugin, onupdated }: Props = $props();

	function initialDraft(): Record<string, string> {
		return Object.fromEntries(plugin.fields.map((f) => [f.key, f.kind === 'secret' ? '' : (f.value ?? '')]));
	}
	let draft = $state(initialDraft());
	const cleared = new SvelteSet<string>();
	const types = new SvelteSet<NotificationType>(initialTypes());
	let enabled = $state(initialEnabled());
	let busy = $state(false);

	function initialTypes(): NotificationType[] {
		return plugin.types;
	}
	function initialEnabled(): boolean {
		// A channel that was never set up is meant to be used once its address is saved.
		return plugin.configured ? plugin.enabled : true;
	}

	const name = $derived(pluginName(plugin));

	async function save(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			const changes = fieldChanges(plugin.fields, draft, cleared);
			const updated = await apiPutAuth<UserPlugin>(`/user/plugins/${plugin.key}`, {
				enabled,
				types: NOTIFICATION_TYPES.filter((ty) => types.has(ty)),
				...(Object.keys(changes).length ? { settings: changes } : {})
			});
			showToast(t('plugins.saved'));
			onupdated(updated);
		} catch (err: unknown) {
			showToast(errMessage(err, t('plugins.saveFailed')), 'error');
		} finally {
			busy = false;
		}
	}

	async function test() {
		busy = true;
		try {
			const r = await apiPostAuth<{ ok: boolean; error: string | null }>(
				`/user/plugins/${plugin.key}/test`,
				{}
			);
			if (r.ok) showToast(t('plugins.channels.testOk'));
			else showToast(t('plugins.channels.testFailed', { error: r.error ?? '' }), 'error', 8000);
			onupdated({
				...plugin,
				lastDeliveryAt: new Date().toISOString(),
				lastError: r.ok ? null : r.error
			});
		} catch (err: unknown) {
			showToast(errMessage(err, t('plugins.saveFailed')), 'error');
		} finally {
			busy = false;
		}
	}

	async function disconnect() {
		if (
			!(await confirmDialog(t('plugins.channels.confirmDisconnect', { name }), {
				confirmLabel: t('plugins.channels.disconnect')
			}))
		)
			return;
		busy = true;
		try {
			await apiDeleteAuth(`/user/plugins/${plugin.key}`);
			showToast(t('plugins.channels.disconnected', { name }));
			onupdated({
				...plugin,
				configured: false,
				enabled: false,
				types: [...NOTIFICATION_TYPES],
				lastDeliveryAt: null,
				lastError: null,
				fields: plugin.fields.map((f) => ({
					...f,
					value: f.kind === 'secret' ? null : (f.default ?? null),
					isSet: false
				}))
			});
		} catch (err: unknown) {
			showToast(errMessage(err, t('plugins.saveFailed')), 'error');
		} finally {
			busy = false;
		}
	}
</script>

<Card class="max-w-none" data-testid="channel-{plugin.key}">
	<h2 class="text-lg font-semibold text-gray-900 dark:text-white m-0">{name}</h2>
	<p class="text-sm text-gray-600 dark:text-gray-300 mt-1 mb-0">{pluginDescription(plugin)}</p>

	<form class="flex flex-col gap-4 mt-4" onsubmit={save}>
		<Checkbox bind:checked={enabled} disabled={busy}>{t('plugins.channels.on')}</Checkbox>

		<PluginFields
			plugin={plugin.key}
			fields={plugin.fields}
			bind:draft
			{cleared}
			idPrefix="channel-{plugin.key}"
			disabled={busy}
		/>

		{#if plugin.isChannel}
			<fieldset class="m-0 p-0 border-0">
				<legend class="text-sm font-medium text-gray-900 dark:text-white mb-2">
					{t('plugins.channels.types')}
				</legend>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{#each NOTIFICATION_TYPES as ty (ty)}
						<Checkbox
							checked={types.has(ty)}
							disabled={busy}
							onchange={(e) => ((e.target as HTMLInputElement).checked ? types.add(ty) : types.delete(ty))}
						>
							{t(`plugins.type.${ty}` as MessageKey)}
						</Checkbox>
					{/each}
				</div>
			</fieldset>
		{/if}

		{#if plugin.lastDeliveryAt}
			<p class="text-xs m-0 {plugin.lastError ? 'tone-red' : 'tone-green'}">
				{plugin.lastError
					? t('plugins.channels.lastError', {
							when: fmt.dateTime(plugin.lastDeliveryAt),
							error: plugin.lastError
						})
					: t('plugins.channels.lastOk', { when: fmt.dateTime(plugin.lastDeliveryAt) })}
			</p>
		{/if}

		<div class="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
			<Button type="submit" size="sm" disabled={busy}>
				{busy ? t('plugins.saving') : t('plugins.save')}
			</Button>
			{#if plugin.configured && plugin.isChannel}
				<Button type="button" size="sm" color="light" disabled={busy} onclick={test}>
					{t('plugins.channels.test')}
				</Button>
			{/if}
			{#if plugin.configured}
				<Button type="button" size="sm" color="light" class="sm:ml-auto" disabled={busy} onclick={disconnect}>
					{t('plugins.channels.disconnect')}
				</Button>
			{/if}
		</div>
	</form>
</Card>
