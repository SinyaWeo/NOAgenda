<script lang="ts">
	import { t, fmt } from '$lib/i18n';
	import { errMessage } from '$lib/errors';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { apiGetAuth, apiDeleteAuth } from '$lib/api';
	import type { SessionRow } from '$lib/types-misc';
	import { Alert, Button, Card } from 'flowbite-svelte';
	import { DesktopPcOutline, CaretLeftSolid } from 'flowbite-svelte-icons';

	const sessions = writable<SessionRow[]>([]);
	const loading = writable(true);
	const error = writable('');

	function expiresText(v: string | null | undefined): string {
		return v ? $fmt.dateTime(v) : $t('settings.sessions.never');
	}

	async function loadSessions() {
		sessions.set(await apiGetAuth<SessionRow[]>('/user/sessions'));
	}

	onMount(async () => {
		try {
			await loadSessions();
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			loading.set(false);
		}
	});

	async function deleteSession(id: number) {
		try {
			await apiDeleteAuth(`/user/sessions/${id}`);
			await loadSessions();
		} catch (e: unknown) {
			error.set(errMessage(e));
		}
	}
</script>

<div class="flex items-center gap-3 mb-6">
	<a href="/user/settings" class="text-gray-400 hover:text-gray-600">
		<CaretLeftSolid class="w-4 h-4 inline mr-1" />
		{$t('settings.back')}
	</a>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
		{$t('settings.sessions.title')}
	</h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

{#if $loading}
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else if $sessions.length}
	<Card class="p-0 overflow-hidden">
		{#each $sessions as session, i (session.id)}
			<div
				class="flex items-center gap-3 px-4 py-3 {i < $sessions.length - 1
					? 'border-b border-gray-100 dark:border-gray-700'
					: ''}"
			>
				<div class="flex-1 min-w-0">
					<p class="font-medium text-sm text-gray-900 dark:text-white m-0 truncate">
						{session.userAgent ?? $t('settings.sessions.unknownClient')}
						{#if session.current}<span
								class="ml-2 text-xs font-normal text-primary-600 dark:text-primary-400"
							>
								{$t('settings.sessions.thisDevice')}
							</span>{/if}
					</p>
					<p class="text-xs text-gray-400 m-0">
						{session.ipAddress
							? $t('settings.sessions.metaIp', {
									ip: session.ipAddress,
									expires: expiresText(session.expiresAt)
								})
							: $t('settings.sessions.meta', { expires: expiresText(session.expiresAt) })}
					</p>
				</div>
				<Button size="xs" color="red" onclick={() => deleteSession(session.id)}>
					{$t('settings.sessions.revoke')}
				</Button>
			</div>
		{/each}
	</Card>
{:else}
	<div class="text-center py-10 text-gray-400">
		<DesktopPcOutline class="w-10 h-10 mx-auto mb-2" />
		<p>{$t('settings.sessions.empty')}</p>
	</div>
{/if}
