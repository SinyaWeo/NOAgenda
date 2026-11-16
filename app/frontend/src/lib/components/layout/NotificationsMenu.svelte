<script lang="ts">
	import { t, fmt } from '$lib/i18n';
	import { apiGetAuth, apiPostAuth } from '$lib/api';
	import type { AppNotification } from '$lib/types';
	import { Badge, Dropdown } from 'flowbite-svelte';
	import { BellOutline } from 'flowbite-svelte-icons';

	/** Notifications are (re)loaded whenever the signed-in user changes. */
	let { userId }: { userId: number } = $props();

	let notifications = $state<AppNotification[]>([]);
	const unreadCount = $derived(notifications.filter((n) => !n.read).length);

	async function loadNotifications() {
		try {
			notifications = await apiGetAuth<AppNotification[]>('/notifications');
		} catch (_) {}
	}

	async function markAllRead() {
		try {
			await apiPostAuth('/notifications/read/all', {});
			await loadNotifications();
		} catch (_) {}
	}

	$effect(() => {
		void userId;
		notifications = [];
		void loadNotifications();
	});
</script>

<button
	id="notif-btn"
	aria-label={unreadCount > 0
		? $t('layout.notifications.withUnread', { count: unreadCount })
		: $t('layout.notifications.title')}
	class="relative bg-transparent border-0 cursor-pointer p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
	onclick={loadNotifications}
>
	<BellOutline class="w-5 h-5" />
	{#if unreadCount > 0}
		<Badge
			color="red"
			class="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 text-[10px] px-1 flex items-center justify-center"
			>{unreadCount}</Badge
		>
	{/if}
</button>
<Dropdown triggeredBy="#notif-btn" placement="bottom-end" class="w-80 max-h-[420px] overflow-y-auto">
	<div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-600">
		<strong class="text-sm text-gray-900 dark:text-white">{$t('layout.notifications.title')}</strong>
		<button
			onclick={markAllRead}
			class="text-xs text-primary-600 dark:text-primary-400 bg-transparent border-0 cursor-pointer"
			>{$t('layout.notifications.markAllRead')}</button
		>
	</div>
	{#if notifications.length === 0}
		<p class="px-4 py-3 text-sm text-gray-500">{$t('layout.notifications.empty')}</p>
	{:else}
		{#each notifications as n (n.id)}
			<div
				class="px-4 py-2 border-b border-gray-100 dark:border-gray-700 {n.read
					? ''
					: 'bg-primary-50 dark:bg-primary-900/20'}"
			>
				<p class="text-sm text-gray-800 dark:text-gray-200 m-0">
					{n.message ?? $t('layout.notifications.fallback', { id: n.id })}
				</p>
				<small class="text-xs text-gray-400">{$fmt.dateTime(n.createdAt)}</small>
			</div>
		{/each}
	{/if}
</Dropdown>
