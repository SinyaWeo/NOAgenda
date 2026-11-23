<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { apiGetAuth, apiPostAuth, apiPutAuth, apiDeleteAuth } from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { errMessage } from '$lib/errors';
	import { t, tr } from '$lib/i18n';
	import { cleanCriteria, describeCriteria } from '$lib/filters';
	import { loadProjectNames } from '$lib/project-names';
	import { goto } from '$app/navigation';
	import { Alert, Badge, Button, Card, Input } from 'flowbite-svelte';
	import { FilterOutline } from 'flowbite-svelte-icons';
	import CriteriaEditor from '$lib/components/views/CriteriaEditor.svelte';
	import type { FilterCriteria, SavedFilter } from '$lib/types';
	import type { ProjectOption } from '$lib/types-views';

	const filters = writable<SavedFilter[]>([]);
	const loading = writable(true);
	const error = writable('');
	let editingId = $state<number | null>(null);
	let newName = $state('');
	let newDescription = $state('');
	let newCriteria = $state<FilterCriteria>({});
	let editName = $state('');
	let editDescription = $state('');
	let editCriteria = $state<FilterCriteria>({});
	let projectNames = $state<Record<number, string>>({});

	const projectOptions = $derived<ProjectOption[]>(
		Object.entries(projectNames).map(([id, name]) => ({ id: Number(id), name }))
	);

	async function load() {
		filters.set(await apiGetAuth<SavedFilter[]>('/filters'));
	}

	async function create(e: Event) {
		e.preventDefault();
		try {
			await apiPostAuth('/filters', {
				name: newName,
				description: newDescription,
				filters: cleanCriteria(newCriteria)
			});
			newName = '';
			newDescription = '';
			newCriteria = {};
			await load();
		} catch (err: unknown) {
			error.set(errMessage(err));
		}
	}

	function startEdit(f: SavedFilter) {
		editingId = f.id;
		editName = f.name;
		editDescription = f.description ?? '';
		editCriteria = { ...(f.filters ?? {}) };
	}

	async function saveEdit(id: number) {
		try {
			await apiPutAuth(`/filters/${id}`, {
				name: editName,
				description: editDescription,
				filters: cleanCriteria(editCriteria)
			});
			editingId = null;
			await load();
		} catch (err: unknown) {
			error.set(errMessage(err));
		}
	}

	async function deleteFilter(id: number) {
		if (!confirm(tr('filters.confirmDelete'))) return;
		try {
			await apiDeleteAuth(`/filters/${id}`);
			await load();
		} catch (err: unknown) {
			error.set(errMessage(err));
		}
	}

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/user/login');
			return;
		}
		void loadProjectNames().then((n) => (projectNames = n));
		try {
			await load();
		} catch (err: unknown) {
			error.set(errMessage(err));
		} finally {
			loading.set(false);
		}
	});
</script>

<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">{$t('filters.title')}</h1>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="mb-4 max-w-none">
	<form onsubmit={create} class="flex flex-col gap-3">
		<div class="flex gap-2 flex-wrap">
			<Input
				type="text"
				bind:value={newName}
				placeholder={$t('filters.name')}
				required
				class="flex-1 min-w-36"
			/>
			<Input
				type="text"
				bind:value={newDescription}
				placeholder={$t('filters.descriptionOptional')}
				class="flex-1 min-w-36"
			/>
		</div>
		<CriteriaEditor bind:criteria={newCriteria} projects={projectOptions} idPrefix="new-crit" />
		<div><Button type="submit">{$t('filters.save')}</Button></div>
	</form>
</Card>

{#if $loading}
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else if $filters.length === 0}
	<div class="text-center py-12 text-gray-400">
		<FilterOutline class="w-12 h-12 mx-auto mb-3" />
		<p>{$t('filters.empty')}</p>
	</div>
{:else}
	<Card class="p-0 overflow-hidden max-w-none">
		{#each $filters as filter, i (filter.id)}
			{@const chips = describeCriteria(filter.filters, $t)}
			<div
				class="flex items-center gap-3 p-4 {i < $filters.length - 1
					? 'border-b border-gray-100 dark:border-gray-700'
					: ''}"
			>
				{#if editingId === filter.id}
					<form
						onsubmit={(e) => {
							e.preventDefault();
							saveEdit(filter.id);
						}}
						class="flex flex-col gap-3 flex-1"
					>
						<div class="flex gap-2 flex-wrap">
							<Input type="text" bind:value={editName} required class="flex-1 min-w-36" />
							<Input type="text" bind:value={editDescription} class="flex-1 min-w-36" />
						</div>
						<CriteriaEditor bind:criteria={editCriteria} projects={projectOptions} idPrefix="edit-crit" />
						<div class="flex gap-2">
							<Button type="submit" size="sm">{$t('common.save')}</Button>
							<Button type="button" color="light" size="sm" onclick={() => (editingId = null)}>
								{$t('common.cancel')}
							</Button>
						</div>
					</form>
				{:else}
					<div class="flex-1 min-w-0">
						<p class="font-medium text-gray-900 dark:text-white m-0">{filter.name}</p>
						{#if filter.description}<p class="text-sm text-gray-500 dark:text-gray-400 m-0">
								{filter.description}
							</p>{/if}
						{#if chips.length}
							<div class="flex gap-1 flex-wrap mt-1">
								{#each chips as chip (chip)}<Badge color="indigo">{chip}</Badge>{/each}
							</div>
						{/if}
					</div>
					<div class="flex gap-2 shrink-0">
						<Button size="sm" href="/tasks?filter={filter.id}">{$t('common.apply')}</Button>
						<Button size="sm" color="light" onclick={() => startEdit(filter)}>{$t('common.edit')}</Button>
						<Button size="sm" color="red" onclick={() => deleteFilter(filter.id)}>
							{$t('common.delete')}
						</Button>
					</div>
				{/if}
			</div>
		{/each}
	</Card>
{/if}
