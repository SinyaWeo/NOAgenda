<script lang="ts">
	import { onMount } from 'svelte';
	import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
	import { errMessage } from '$lib/errors';
	import { showToast } from '$lib/toast';
	import { t, tr, fmt } from '$lib/i18n';
	import type { MessageKey } from '$lib/i18n/messages';
	import type { TrashEntry } from '$lib/types';
	import { Alert, Button, Card } from 'flowbite-svelte';

	let items = $state<TrashEntry[]>([]);
	let loaded = $state(false);
	let error = $state('');
	let busy = $state<number | null>(null);

	async function load() {
		try {
			items = await apiGetAuth<TrashEntry[]>('/trash');
			error = '';
		} catch (e) {
			error = errMessage(e, tr('trash.loadFailed'));
		} finally {
			loaded = true;
		}
	}
	onMount(load);

	async function act(entry: TrashEntry, run: () => Promise<unknown>, ok: MessageKey, failed: MessageKey) {
		busy = entry.id;
		try {
			await run();
			showToast(tr(ok), 'success');
			await load();
		} catch (e) {
			showToast(errMessage(e, tr(failed)), 'error');
		} finally {
			busy = null;
		}
	}

	const restore = (e: TrashEntry) =>
		act(e, () => apiPostAuth(`/trash/${e.id}/restore`, {}), 'trash.restored', 'trash.restoreFailed');

	function purge(e: TrashEntry) {
		if (!confirm(tr('trash.confirmPurge', { title: e.title ?? tr('trash.untitled') }))) return;
		return act(e, () => apiDeleteAuth(`/trash/${e.id}`), 'trash.purged', 'trash.purgeFailed');
	}
</script>

<svelte:head>
	<title>{$t('trash.title')}</title>
</svelte:head>

<div class="max-w-3xl mx-auto">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">{$t('trash.title')}</h1>
	<p class="text-sm text-gray-500 mt-0 mb-6">{$t('trash.hint')}</p>
	{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}
	<Card class="max-w-none">
		{#if loaded && !items.length && !error}
			<p class="text-sm text-gray-400 m-0">{$t('trash.empty')}</p>
		{:else}
			<ul class="list-none p-0 m-0">
				{#each items as e, i (e.id)}
					<li
						class="py-3 flex items-start justify-between gap-3 {i < items.length - 1
							? 'border-b border-gray-100 dark:border-gray-700'
							: ''}"
						data-trash-type={e.type}
					>
						<div class="min-w-0">
							<p class="text-sm font-medium text-gray-900 dark:text-white m-0 break-words">
								{e.title ?? $t('trash.untitled')}
								<span class="text-xs font-normal text-gray-400"> · {$t(`trash.type.${e.type}`)}</span>
							</p>
							<p class="text-xs text-gray-500 m-0">
								{$t('trash.deleted', {
									when: $fmt.dateTime(e.deletedAt),
									who: e.deletedBy.username ?? $t('common.unknown')
								})}
							</p>
							<p class="text-xs text-gray-400 m-0">
								{$t('trash.purgeAt', { when: $fmt.dateTime(e.purgeAt) })}
							</p>
						</div>
						<div class="flex gap-2 shrink-0">
							<Button size="xs" disabled={busy !== null} onclick={() => restore(e)}>
								{$t('trash.restore')}
							</Button>
							<Button size="xs" color="light" disabled={busy !== null} onclick={() => purge(e)}>
								{$t('trash.purge')}
							</Button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>
</div>
