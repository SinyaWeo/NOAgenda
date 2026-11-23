<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { errMessage } from '$lib/errors';
	import { writable } from 'svelte/store';
	import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
	import { loadOnParamChange } from '$lib/param-loader.svelte';
	import type { WebhookInfo } from '$lib/types';
	import { page } from '$app/state';
	import WebhookStatus from '$lib/components/WebhookStatus.svelte';
	import { Alert, Button, Card, Input } from 'flowbite-svelte';
	import { LinkOutline } from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';

	const webhooks = writable<WebhookInfo[]>([]);
	const loading = writable(true);
	const error = writable('');
	let newUrl = $state('');

	async function load() {
		webhooks.set(await apiGetAuth<WebhookInfo[]>(`/webhooks?projectId=${page.params.id}`));
	}

	async function addWebhook(e: Event) {
		e.preventDefault();
		try {
			await apiPostAuth('/webhooks', {
				url: newUrl,
				projectId: Number(page.params.id)
			});
			newUrl = '';
			await load();
		} catch (e: unknown) {
			error.set(errMessage(e));
		}
	}

	async function deleteWebhook(id: number) {
		try {
			await apiDeleteAuth(`/webhooks/${id}`);
			await load();
		} catch (e: unknown) {
			error.set(errMessage(e));
		}
	}

	loadOnParamChange(
		() => page.params.id ?? '',
		async (_id, isStale) => {
			const list = await apiGetAuth<WebhookInfo[]>(`/webhooks?projectId=${page.params.id}`);
			if (!isStale()) webhooks.set(list);
		},
		loading,
		error
	);
</script>

<PageHeader
	title={$t('projects.webhooks.title')}
	back={{ href: `/projects/${page.params.id}/edit`, label: $t('common.back') }}
/>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="mb-4">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
		{$t('projects.webhooks.add')}
	</h2>
	<form onsubmit={addWebhook} class="flex gap-2">
		<Input
			type="url"
			bind:value={newUrl}
			placeholder="https://your-url.example.com/hook"
			required
			class="flex-1"
		/>
		<Button type="submit">{$t('common.add')}</Button>
	</form>
</Card>

{#if $loading}
	<p class="text-gray-500 dark:text-gray-400">{$t('common.loading')}</p>
{:else if $webhooks.length}
	<Card class="p-0 overflow-hidden">
		{#each $webhooks as wh, i (wh.id)}
			<div
				class="flex items-center gap-3 p-4 {i < $webhooks.length - 1
					? 'border-b border-gray-100 dark:border-gray-700'
					: ''}"
			>
				<div class="flex-1 min-w-0 flex flex-col gap-1">
					<span class="text-sm text-gray-700 dark:text-gray-300 truncate">{wh.url}</span>
					<WebhookStatus webhook={wh} onChanged={load} />
				</div>
				<Button size="sm" color="red" outline onclick={() => deleteWebhook(wh.id)}>
					{$t('common.delete')}
				</Button>
			</div>
		{/each}
	</Card>
{:else}
	<div class="text-center py-10 text-gray-500 dark:text-gray-400">
		<LinkOutline class="w-10 h-10 mx-auto mb-2" />
		<p>{$t('projects.webhooks.empty')}</p>
	</div>
{/if}
