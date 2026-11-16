<script lang="ts">
	import { writable } from 'svelte/store';
	import { apiGetAuth, apiPutAuth } from '$lib/api';
	import { errMessage } from '$lib/errors';
	import { showToast } from '$lib/toast';
	import { t, tr, type MessageKey } from '$lib/i18n';
	import { loadOnParamChange } from '$lib/param-loader.svelte';
	import type { KanbanBucket, ProjectView, Task } from '$lib/types';
	import { page } from '$app/state';
	import SimpleListView from '$lib/components/views/SimpleListView.svelte';
	import BucketKanbanView from '$lib/components/views/BucketKanbanView.svelte';
	import TableView from '$lib/components/views/TableView.svelte';
	import GanttView from '$lib/components/views/GanttView.svelte';
	import MindmapView from '$lib/components/views/MindmapView.svelte';
	import { Alert, Badge, Button } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';

	const view = writable<ProjectView | null>(null);
	const tasks = writable<Task[]>([]);
	const buckets = writable<KanbanBucket[]>([]);
	const loading = writable(true);
	const error = writable('');
	const views = writable<ProjectView[]>([]);

	async function moveTaskToBucket(taskId: number, bucketId: number) {
		try {
			const updated = await apiPutAuth<Task>(`/tasks/${taskId}`, { bucketId });
			tasks.update((list) => list.map((t) => (t.id === taskId ? updated : t)));
		} catch (e: unknown) {
			showToast(errMessage(e, tr('views.toast.moveTaskFailed')), 'error');
		}
	}

	async function load(key: string, isStale: () => boolean) {
		const [id, viewId] = key.split('/');
		const [v, t, vs] = await Promise.all([
			apiGetAuth<ProjectView>(`/projects/${id}/views/${viewId}`),
			apiGetAuth<Task[]>(`/tasks?projectId=${id}`),
			apiGetAuth<ProjectView[]>(`/projects/${id}/views`).catch((): ProjectView[] => [])
		]);
		const b =
			v.viewType === 'kanban'
				? await apiGetAuth<KanbanBucket[]>(`/projects/${id}/views/${viewId}/buckets`)
				: [];
		if (isStale()) return; // a newer view/project was requested meanwhile
		view.set(v);
		tasks.set(t);
		views.set(vs);
		buckets.set(b);
	}

	// The view pills only change the URL, so the component stays mounted: reload on every
	// project/view change instead of loading once on mount.
	loadOnParamChange(() => `${page.params.id}/${page.params.viewId}`, load, loading, error);
</script>

{#if $loading}
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else if $error}
	<Alert color="red">{$error}</Alert>
{:else if $view}
	<div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
		<div class="flex items-center gap-2 flex-wrap">
			<a href="/projects/{page.params.id}" class="text-gray-400 hover:text-gray-600 text-sm shrink-0"
				><CaretLeftSolid class="w-4 h-4 inline mr-1" /> {$t('common.back')}</a
			>
			{#if $views.length > 0}
				<nav class="flex gap-1 flex-wrap">
					{#each $views as v (v.id)}
						<a
							href="/projects/{page.params.id}/{v.id}"
							class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium no-underline transition-colors {v.id ===
							Number(page.params.viewId)
								? 'bg-primary-600 text-white'
								: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
							>{v.title}</a
						>
					{/each}
				</nav>
			{:else}
				<h1 class="text-xl font-bold text-gray-900 dark:text-white m-0">
					{$view?.title}
				</h1>
				<Badge color="indigo">{$view ? $t(`projects.viewType.${$view.viewType}` as MessageKey) : ''}</Badge>
			{/if}
		</div>
		<Button href="/projects/{page.params.id}/settings/views" color="light" size="sm"
			>{$t('views.view.manage')}</Button
		>
	</div>

	{#if $view.viewType === 'list'}
		<SimpleListView tasks={$tasks} />
	{:else if $view.viewType === 'kanban'}
		<BucketKanbanView tasks={$tasks} buckets={$buckets} onMove={moveTaskToBucket} />
	{:else if $view.viewType === 'table'}
		<TableView tasks={$tasks} />
	{:else if $view.viewType === 'gantt'}
		<GanttView tasks={$tasks} />
	{:else if $view.viewType === 'mindmap'}
		<MindmapView projectId={page.params.id ?? ''} />
	{:else}
		<p class="text-gray-400">{$t('views.view.unknownType', { type: $view.viewType })}</p>
	{/if}
{/if}
