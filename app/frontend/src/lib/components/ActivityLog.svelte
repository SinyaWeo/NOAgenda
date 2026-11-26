<script lang="ts">
	import { t, fmt } from '#lib/i18n/index.js';
	import { apiGetAuth } from '#lib/api.js';
	import { changeLines, describeActivity } from '#lib/activity.js';
	import type { ActivityEntry, ActivityPage } from '#lib/types.js';
	import { Button } from 'flowbite-svelte';

	/**
	 * `endpoint` is the API path with its filters, e.g. `/activity?nodeId=5`. `version` changes whenever
	 * something may have been added (reload from the top). `showProject` adds where each entry happened.
	 */
	let {
		endpoint,
		version,
		showProject = false
	}: { endpoint: string; version?: string | number; showProject?: boolean } = $props();

	let items = $state<ActivityEntry[]>([]);
	let next = $state<number | null>(null);
	let loaded = $state(false);
	let failed = $state(false);
	let loadingMore = $state(false);

	const url = (before?: number | null) =>
		`${endpoint}${endpoint.includes('?') ? '&' : '?'}${before ? `before=${before}&` : ''}limit=30`;

	$effect(() => {
		void version;
		void endpoint;
		let current = true;
		apiGetAuth<ActivityPage>(url())
			.then((p) => {
				if (!current) return;
				items = p.items;
				next = p.next;
				failed = false;
				loaded = true;
			})
			.catch(() => {
				if (current) failed = true;
			});
		return () => {
			current = false;
		};
	});

	async function more() {
		if (next == null) return;
		loadingMore = true;
		try {
			const p = await apiGetAuth<ActivityPage>(url(next));
			items = [...items, ...p.items];
			next = p.next;
		} catch (_) {
			failed = true;
		} finally {
			loadingMore = false;
		}
	}
</script>

{#if failed && !items.length}
	<p class="text-sm text-red-500 m-0">{t('activity.loadFailed')}</p>
{:else if loaded && !items.length}
	<p class="text-sm text-gray-500 dark:text-gray-400 m-0">{t('activity.empty')}</p>
{:else if items.length}
	<ul class="list-none p-0 m-0">
		{#each items as e, i (e.id)}
			<li
				class="py-2 {i < items.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}"
				data-activity-action={e.action}
			>
				<p class="text-sm text-gray-800 dark:text-gray-200 m-0">{describeActivity(e, t)}</p>
				{#each changeLines(e, t, fmt.dateTime) as line (line)}
					<p class="text-xs text-gray-500 dark:text-gray-400 m-0 ml-3">{line}</p>
				{/each}
				<p class="text-xs text-gray-500 dark:text-gray-400 m-0">
					{fmt.dateTime(e.createdAt)}
					{#if showProject}
						· {e.projectId
							? t('activity.admin.projectId', { id: e.projectId })
							: t('activity.admin.projectNone')}
					{/if}
				</p>
			</li>
		{/each}
	</ul>
	{#if failed}<p class="text-sm text-red-500 m-0 mt-2">{t('activity.loadFailed')}</p>{/if}
	{#if next != null}
		<div class="mt-3">
			<Button size="xs" color="light" disabled={loadingMore} onclick={more}>{t('activity.loadMore')}</Button>
		</div>
	{/if}
{/if}
