<script lang="ts">
	import { Button, Card } from 'flowbite-svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { apiPatchAuth } from '#lib/api.js';
	import { errMessage } from '#lib/errors.js';
	import { t } from '#lib/i18n/index.js';
	import { fieldChanges, pluginDescription, pluginName } from '#lib/plugins.js';
	import { showToast } from '#lib/toast.svelte.js';
	import type { AdminPlugin } from '#lib/types-misc.js';
	import PluginFields from './PluginFields.svelte';

	interface Props {
		plugin: AdminPlugin;
		/** The server's new view of the plugin after a change (the parent re-creates this card with it). */
		onupdated: (plugin: AdminPlugin) => void;
	}
	let { plugin, onupdated }: Props = $props();

	function initialDraft(): Record<string, string> {
		return Object.fromEntries(plugin.fields.map((f) => [f.key, f.kind === 'secret' ? '' : (f.value ?? '')]));
	}
	let draft = $state(initialDraft());
	const cleared = new SvelteSet<string>();
	let busy = $state(false);

	const changes = $derived(fieldChanges(plugin.fields, draft, cleared));
	const dirty = $derived(Object.keys(changes).length > 0);

	async function save(enabled?: boolean) {
		busy = true;
		try {
			const updated = await apiPatchAuth<AdminPlugin>(`/admin/plugins/${plugin.key}`, {
				...(enabled !== undefined ? { enabled } : {}),
				...(dirty ? { config: changes } : {})
			});
			const name = pluginName(updated);
			showToast(
				enabled === undefined
					? t('plugins.saved')
					: t(enabled ? 'plugins.admin.switchedOn' : 'plugins.admin.switchedOff', { name })
			);
			onupdated(updated);
		} catch (e: unknown) {
			showToast(errMessage(e, t('plugins.saveFailed')), 'error');
		} finally {
			busy = false;
		}
	}
</script>

<Card class="max-w-none" data-testid="plugin-{plugin.key}">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white m-0">
				{pluginName(plugin)}
				<span class="ml-2 text-xs font-medium {plugin.enabled ? 'tone-green' : 'tone-gray'}">
					{t(plugin.enabled ? 'plugins.admin.on' : 'plugins.admin.off')}
				</span>
			</h2>
			<p class="text-sm text-gray-600 dark:text-gray-300 mt-1 mb-0">{pluginDescription(plugin)}</p>
			{#if plugin.hasUserSettings}
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">{t('plugins.admin.perUser')}</p>
			{/if}
		</div>
		<Button
			size="sm"
			color={plugin.enabled ? 'light' : 'primary'}
			disabled={busy}
			onclick={() => save(!plugin.enabled)}
		>
			{t(plugin.enabled ? 'plugins.admin.switchOff' : 'plugins.admin.switchOn')}
		</Button>
	</div>

	{#if plugin.fields.length}
		<form
			class="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"
			onsubmit={(e) => {
				e.preventDefault();
				void save();
			}}
		>
			<PluginFields
				plugin={plugin.key}
				fields={plugin.fields}
				bind:draft
				{cleared}
				idPrefix="admin-{plugin.key}"
				disabled={busy}
			/>
			<div>
				<Button type="submit" size="sm" disabled={busy || !dirty}>
					{busy ? t('plugins.saving') : t('plugins.save')}
				</Button>
			</div>
		</form>
	{:else}
		<p class="text-xs text-gray-500 dark:text-gray-400 mt-3 mb-0">{t('plugins.admin.noSettings')}</p>
	{/if}
</Card>
