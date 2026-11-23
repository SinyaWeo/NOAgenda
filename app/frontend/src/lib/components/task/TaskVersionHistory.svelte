<script lang="ts" generics="R">
	import { t, fmt, tr } from '$lib/i18n';
	import { apiGetAuth, apiPostAuth } from '$lib/api';
	import { errMessage } from '$lib/errors';
	import { showToast } from '$lib/toast';
	import type { NodeRevision, NodeRevisionPage } from '$lib/types';
	import { Button } from 'flowbite-svelte';

	/**
	 * `version` changes whenever the node may have been saved (reload from the top). By default it
	 * shows the history of a task or project; ideas pass their own endpoints (and have no title).
	 */
	let {
		taskId,
		version,
		onRestored,
		listPath = `/node-revisions?nodeId=${taskId}`,
		restorePath = (rev) => `/node-revisions/${rev}/restore`,
		showTitle = true
	}: {
		taskId: number;
		version?: string | number;
		onRestored: (result: R) => void;
		/** API path of the first page (a `before` parameter is appended for the next ones). */
		listPath?: string;
		restorePath?: (revisionId: number) => string;
		showTitle?: boolean;
	} = $props();

	const PREVIEW = 240;
	let items = $state<NodeRevision[]>([]);
	let next = $state<number | null>(null);
	let loaded = $state(false);
	let failed = $state(false);
	let busy = $state<number | null>(null);

	const url = (before?: number | null) =>
		before ? `${listPath}${listPath.includes('?') ? '&' : '?'}before=${before}` : listPath;

	$effect(() => {
		void version;
		let current = true;
		apiGetAuth<NodeRevisionPage>(url())
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
		try {
			const p = await apiGetAuth<NodeRevisionPage>(url(next));
			items = [...items, ...p.items];
			next = p.next;
		} catch (_) {
			failed = true;
		}
	}

	async function restore(r: NodeRevision) {
		busy = r.id;
		try {
			onRestored(await apiPostAuth<R>(restorePath(r.id), {}));
			showToast(tr('tasks.history.restored'), 'success');
		} catch (e) {
			showToast(errMessage(e, tr('tasks.history.restoreFailed')), 'error');
		} finally {
			busy = null;
		}
	}

	const preview = (s: string | null) => (s && s.length > PREVIEW ? s.slice(0, PREVIEW) + '…' : s);
</script>

{#if failed && !items.length}
	<p class="text-sm text-red-500 m-0">{$t('tasks.history.loadFailed')}</p>
{:else if loaded && !items.length}
	<p class="text-sm text-gray-400 m-0">{$t('tasks.history.empty')}</p>
{:else if items.length}
	<ul class="list-none p-0 m-0">
		{#each items as r, i (r.id)}
			<li class="py-2 {i < items.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						{#if showTitle}
							<p class="text-sm font-medium text-gray-800 dark:text-gray-200 m-0">
								{r.title ?? $t('activity.untitled')}
							</p>
						{/if}
						{#if r.description}
							<p
								class="{showTitle
									? 'text-xs text-gray-500'
									: 'text-sm text-gray-800 dark:text-gray-200'} m-0 whitespace-pre-wrap break-words"
							>
								{preview(r.description)}
							</p>
						{/if}
						<p class="text-xs text-gray-400 m-0">
							{$fmt.dateTime(r.createdAt)} · {r.actor.username ?? $t('common.unknown')}
						</p>
					</div>
					{#if i > 0}
						<Button size="xs" color="light" disabled={busy !== null} onclick={() => restore(r)}>
							{$t('tasks.history.restore')}
						</Button>
					{:else}
						<span class="text-xs text-gray-400 shrink-0">{$t('tasks.history.current')}</span>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
	{#if failed}<p class="text-sm text-red-500 m-0 mt-2">{$t('tasks.history.loadFailed')}</p>{/if}
	{#if next != null}
		<div class="mt-3">
			<Button size="xs" color="light" onclick={more}>{$t('activity.loadMore')}</Button>
		</div>
	{/if}
{/if}
