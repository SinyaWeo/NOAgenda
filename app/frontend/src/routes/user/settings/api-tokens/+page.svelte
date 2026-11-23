<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { t, fmt } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
	import { Alert, Button, Card, Input, Label, Select } from 'flowbite-svelte';
	import { ApiKeyOutline } from 'flowbite-svelte-icons';
	import { errMessage } from '$lib/errors';
	import { showToast } from '$lib/toast';
	import type { ApiTokenInfo, TokenScope } from '$lib/types';
	import type { CreatedApiToken } from '$lib/types-misc';

	const tokens = writable<ApiTokenInfo[]>([]);
	const loading = writable(true);
	const error = writable('');
	let newTokenName = $state('');
	let newTokenExpiry = $state('');
	let newTokenScope = $state<TokenScope>('read');
	let createdToken = $state('');

	function expiresText(v: string | null | undefined): string {
		return v ? $fmt.date(v) : $t('settings.tokens.never');
	}

	async function loadTokens() {
		tokens.set(await apiGetAuth<ApiTokenInfo[]>('/tokens'));
	}

	onMount(async () => {
		try {
			await loadTokens();
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			loading.set(false);
		}
	});

	async function createToken(e: Event) {
		e.preventDefault();
		createdToken = '';
		try {
			const result = await apiPostAuth<CreatedApiToken>('/tokens', {
				name: newTokenName,
				scope: newTokenScope,
				expiresAt: newTokenExpiry ? new Date(newTokenExpiry).toISOString() : null
			});
			createdToken = result.rawToken ?? '';
			newTokenName = '';
			newTokenExpiry = '';
			newTokenScope = 'read';
			await loadTokens();
		} catch (e: unknown) {
			showToast(errMessage(e), 'error');
		}
	}

	async function deleteToken(id: number) {
		try {
			await apiDeleteAuth(`/tokens/${id}`);
			await loadTokens();
		} catch (e: unknown) {
			showToast(errMessage(e), 'error');
		}
	}
</script>

<PageHeader
	title={$t('settings.tokens.title')}
	back={{ href: '/user/settings', label: $t('settings.back') }}
/>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if createdToken}
	<Alert color="green" class="mb-4">
		<p class="font-bold mb-2">
			{$t('settings.tokens.created')}
		</p>
		<code class="token-value break-all font-mono text-sm">{createdToken}</code>
	</Alert>
{/if}

<Card class="mb-4">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
		{$t('settings.tokens.createTitle')}
	</h2>
	<form onsubmit={createToken} class="flex flex-wrap gap-3 items-end">
		<div class="flex-1 min-w-40">
			<Label for="token-name" class="mb-1">{$t('settings.tokens.name')}</Label>
			<Input
				id="token-name"
				type="text"
				bind:value={newTokenName}
				placeholder={$t('settings.tokens.namePlaceholder')}
				required
			/>
		</div>
		<div>
			<Label for="token-expiry" class="mb-1">
				{$t('settings.tokens.expiry')}
				<span class="text-xs text-gray-500 dark:text-gray-400">({$t('common.optional')})</span>
			</Label>
			<Input id="token-expiry" type="date" bind:value={newTokenExpiry} />
		</div>
		<div>
			<Label for="token-scope" class="mb-1">{$t('settings.tokens.access')}</Label>
			<Select
				placeholder=""
				id="token-scope"
				bind:value={newTokenScope}
				items={[
					{ value: 'read', name: $t('settings.tokens.scope.read') },
					{ value: 'write', name: $t('settings.tokens.scope.write') }
				]}
			/>
		</div>
		<Button type="submit">{$t('common.create')}</Button>
	</form>
	<p class="text-xs text-gray-500 dark:text-gray-400 mt-3 mb-0">
		{$t('settings.tokens.limits')}
	</p>
</Card>

{#if $loading}
	<p class="text-gray-500 dark:text-gray-400">{$t('common.loading')}</p>
{:else if $tokens.length}
	<Card class="p-0 overflow-hidden">
		{#each $tokens as token, i (token.id)}
			<div
				class="flex items-center gap-3 px-4 py-3 {i < $tokens.length - 1
					? 'border-b border-gray-100 dark:border-gray-700'
					: ''}"
			>
				<div class="flex-1">
					<p class="font-bold text-sm text-gray-900 dark:text-white m-0">
						{token.name}
						<span
							class="ml-2 align-middle text-xs font-medium {token.scope === 'write'
								? 'tone-yellow'
								: 'tone-gray'}"
							data-testid="token-scope"
						>
							{token.scope === 'write' ? $t('settings.tokens.badge.write') : $t('settings.tokens.badge.read')}
						</span>
					</p>
					<p class="text-xs text-gray-500 dark:text-gray-400 m-0">
						{token.lastUsedAt
							? $t('settings.tokens.metaUsed', {
									created: $fmt.date(token.createdAt),
									expires: expiresText(token.expiresAt),
									used: $fmt.date(token.lastUsedAt)
								})
							: $t('settings.tokens.meta', {
									created: $fmt.date(token.createdAt),
									expires: expiresText(token.expiresAt)
								})}
					</p>
				</div>
				<Button size="sm" color="red" outline onclick={() => deleteToken(token.id)}>
					{$t('common.delete')}
				</Button>
			</div>
		{/each}
	</Card>
{:else}
	<div class="text-center py-10 text-gray-500 dark:text-gray-400">
		<ApiKeyOutline class="w-10 h-10 mx-auto mb-2" />
		<p>{$t('settings.tokens.empty')}</p>
	</div>
{/if}
