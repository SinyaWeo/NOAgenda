<script lang="ts">
	import { t, tr, fmt, type MessageKey } from '$lib/i18n';
	import { apiDeleteAuth, apiGetAuth, apiPostAuth } from '$lib/api';
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

	interface Params {
		actor?: string;
		title?: string;
		kind?: 'task' | 'project';
	}

	function parseParams(n: AppNotification): Params {
		try {
			return n.params ? (JSON.parse(n.params) as Params) : {};
		} catch {
			return {};
		}
	}

	/** System notifications are worded in the reader's language; others show their stored text. */
	function textOf(n: AppNotification): string {
		if (n.type) {
			const p = parseParams(n);
			return tr(`layout.notifications.${n.type}` as MessageKey, {
				actor: p.actor ?? '',
				title: p.title ?? ''
			});
		}
		return n.message ?? tr('layout.notifications.fallback', { id: n.id });
	}

	function hrefOf(n: AppNotification): string | null {
		if (n.nodeId == null) return null;
		return `/${parseParams(n).kind === 'project' ? 'projects' : 'tasks'}/${n.nodeId}`;
	}

	/** Opening a notification marks it read (the link then navigates). */
	async function open(n: AppNotification) {
		if (n.read) return;
		n.read = true;
		try {
			await apiPostAuth(`/notifications/${n.id}/read`, {});
		} catch (_) {
			n.read = false;
		}
	}

	/** Remove one notification for good. It disappears at once and comes back if the server refuses. */
	async function dismiss(n: AppNotification) {
		const before = notifications;
		notifications = notifications.filter((x) => x.id !== n.id);
		try {
			await apiDeleteAuth(`/notifications/${n.id}`);
		} catch (_) {
			notifications = before;
		}
	}

	async function markAllRead() {
		try {
			await apiPostAuth('/notifications/read/all', {});
			await loadNotifications();
		} catch (_) {}
	}

	// Reload when the signed-in user changes, then now and then so new ones appear without a page reload.
	$effect(() => {
		void userId;
		notifications = [];
		void loadNotifications();
		const timer = setInterval(() => {
			if (!document.hidden) void loadNotifications();
		}, 60_000);
		return () => clearInterval(timer);
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
				class="flex items-start gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700 {n.read
					? ''
					: 'bg-primary-50 dark:bg-primary-900/20'}"
			>
				<div class="flex-1 min-w-0">
					{#if hrefOf(n)}
						<a
							href={hrefOf(n)}
							onclick={() => open(n)}
							class="block text-sm text-gray-800 dark:text-gray-200 m-0 no-underline hover:underline"
							>{textOf(n)}</a
						>
					{:else}
						<p class="text-sm text-gray-800 dark:text-gray-200 m-0">{textOf(n)}</p>
					{/if}
					<small class="text-xs text-gray-400">{$fmt.dateTime(n.createdAt)}</small>
				</div>
				<button
					type="button"
					class="bg-transparent border-0 cursor-pointer text-gray-400 hover:text-red-600 p-0.5 leading-none"
					aria-label={$t('layout.notifications.dismiss')}
					title={$t('layout.notifications.dismiss')}
					onclick={() => dismiss(n)}>✕</button
				>
			</div>
		{/each}
	{/if}
</Dropdown>
