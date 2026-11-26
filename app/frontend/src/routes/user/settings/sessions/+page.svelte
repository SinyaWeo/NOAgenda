<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { t, fmt } from '#lib/i18n/index.js';
	import { errMessage } from '#lib/errors.js';
	import { onMount } from 'svelte';
	import { apiGetAuth, apiDeleteAuth } from '#lib/api.js';
	import type { SessionRow } from '#lib/types-misc.js';
	import { Alert, Button, Card } from 'flowbite-svelte';
	import { DesktopPcOutline } from 'flowbite-svelte-icons';

	let sessions = $state<SessionRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	function expiresText(v: string | null | undefined): string {
		return v ? fmt.dateTime(v) : t('settings.sessions.never');
	}

	async function loadSessions() {
		sessions = await apiGetAuth<SessionRow[]>('/user/sessions');
	}

	onMount(async () => {
		try {
			await loadSessions();
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			loading = false;
		}
	});

	async function deleteSession(id: number) {
		try {
			await apiDeleteAuth(`/user/sessions/${id}`);
			await loadSessions();
		} catch (e: unknown) {
			error = errMessage(e);
		}
	}
</script>

<PageHeader
	title={t('settings.sessions.title')}
	back={{ href: '/user/settings', label: t('settings.back') }}
/>

<!-- Same width as the dashboard's notes card: full width, half from lg up. -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
	<div class="min-w-0">
		{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}

		{#if loading}
			<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
		{:else if sessions.length}
			<Card class="max-w-none p-0 overflow-hidden">
				{#each sessions as session, i (session.id)}
					<div
						class="flex items-center gap-3 px-4 py-3 {i < sessions.length - 1
							? 'border-b border-gray-100 dark:border-gray-700'
							: ''}"
					>
						<div class="flex-1 min-w-0">
							<p class="font-medium text-sm text-gray-900 dark:text-white m-0 truncate">
								{session.userAgent ?? t('settings.sessions.unknownClient')}
								{#if session.current}<span
										class="ml-2 text-xs font-normal text-primary-600 dark:text-primary-400"
									>
										{t('settings.sessions.thisDevice')}
									</span>{/if}
							</p>
							<p class="text-xs text-gray-500 dark:text-gray-400 m-0">
								{session.ipAddress
									? t('settings.sessions.metaIp', {
											ip: session.ipAddress,
											expires: expiresText(session.expiresAt)
										})
									: t('settings.sessions.meta', { expires: expiresText(session.expiresAt) })}
							</p>
						</div>
						<Button size="sm" color="red" outline onclick={() => deleteSession(session.id)}>
							{t('settings.sessions.revoke')}
						</Button>
					</div>
				{/each}
			</Card>
		{:else}
			<div class="text-center py-10 text-gray-500 dark:text-gray-400">
				<DesktopPcOutline class="w-10 h-10 mx-auto mb-2" />
				<p>{t('settings.sessions.empty')}</p>
			</div>
		{/if}
	</div>
</div>
