<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { errMessage } from '$lib/errors';
	import { writable } from 'svelte/store';
	import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
	import { loadOnParamChange } from '$lib/param-loader.svelte';
	import type { ProjectView, ViewType } from '$lib/types';
	import { page } from '$app/state';
	import { Alert, Button, Card, Input, Label, Select } from 'flowbite-svelte';
	import { TableColumnOutline } from 'flowbite-svelte-icons';
	import { t, type MessageKey } from '$lib/i18n';

	const views = writable<ProjectView[]>([]);
	const loading = writable(true);
	const error = writable('');
	let newViewTitle = $state('');
	let newViewType = $state<ViewType>('list');

	async function load() {
		views.set(await apiGetAuth<ProjectView[]>(`/projects/${page.params.id}/views`));
	}

	async function addView(e: Event) {
		e.preventDefault();
		try {
			await apiPostAuth(`/projects/${page.params.id}/views`, {
				title: newViewTitle,
				viewType: newViewType
			});
			newViewTitle = '';
			await load();
		} catch (e: unknown) {
			error.set(errMessage(e));
		}
	}

	async function deleteView(viewId: number) {
		try {
			await apiDeleteAuth(`/projects/${page.params.id}/views/${viewId}`);
			await load();
		} catch (e: unknown) {
			error.set(errMessage(e));
		}
	}

	loadOnParamChange(
		() => page.params.id ?? '',
		async (id, isStale) => {
			const list = await apiGetAuth<ProjectView[]>(`/projects/${id}/views`);
			if (!isStale()) views.set(list);
		},
		loading,
		error
	);
</script>

<PageHeader
	title={$t('projects.views.title')}
	back={{ href: `/projects/${page.params.id}`, label: $t('common.back') }}
/>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="max-w-xl mb-4">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
		{$t('projects.views.addView')}
	</h2>
	<form onsubmit={addView} class="flex flex-col gap-3">
		<div>
			<Label for="view-title" class="mb-1">{$t('projects.views.viewName')}</Label>
			<Input
				id="view-title"
				type="text"
				bind:value={newViewTitle}
				placeholder={$t('projects.views.viewNamePlaceholder')}
				required
			/>
		</div>
		<div>
			<Label for="view-type" class="mb-1">{$t('projects.views.type')}</Label>
			<Select placeholder="" id="view-type" bind:value={newViewType}>
				<option value="list">{$t('projects.viewType.list')}</option>
				<option value="kanban">{$t('projects.viewType.kanban')}</option>
				<option value="gantt">{$t('projects.viewType.gantt')}</option>
				<option value="table">{$t('projects.viewType.table')}</option>
				<option value="calendar">{$t('projects.viewType.calendar')}</option>
				<option value="mindmap">{$t('projects.viewType.mindmap')}</option>
			</Select>
		</div>
		<div><Button type="submit">{$t('projects.views.addView')}</Button></div>
	</form>
</Card>

{#if $loading}
	<p class="text-gray-500 dark:text-gray-400">{$t('common.loading')}</p>
{:else if $views.length}
	<Card class="max-w-xl p-0 overflow-hidden">
		{#each $views as view, i (view.id)}
			<div
				class="flex items-center gap-3 p-4 {i < $views.length - 1
					? 'border-b border-gray-100 dark:border-gray-700'
					: ''}"
			>
				<div class="flex-1">
					<a
						href="/projects/{page.params.id}/{view.id}"
						class="font-medium text-gray-900 dark:text-white hover:underline"
					>
						{view.title}
					</a>
					<span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
						{$t(`projects.viewType.${view.viewType}` as MessageKey)}
					</span>
				</div>
				<Button size="sm" color="red" outline onclick={() => deleteView(view.id)}>
					{$t('common.delete')}
				</Button>
			</div>
		{/each}
	</Card>
{:else}
	<div class="text-center py-10 text-gray-500 dark:text-gray-400">
		<TableColumnOutline class="w-10 h-10 mx-auto mb-2" />
		<p>{$t('projects.views.empty')}</p>
	</div>
{/if}
