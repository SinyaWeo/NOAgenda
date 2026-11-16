<script lang="ts">
	import { errMessage } from '$lib/errors';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { apiGetAuth, apiPostAuth, apiPutAuth, apiDeleteAuth } from '$lib/api';
	import type { Label } from '$lib/types';
	import { Alert, Button, Card, Input } from 'flowbite-svelte';
	import { TagOutline } from 'flowbite-svelte-icons';
	import { t, tr } from '$lib/i18n';

	const labels = writable<Label[]>([]);
	const loading = writable(true);
	const error = writable('');
	let newTitle = $state('');
	let newColor = $state('#6366f1');
	let creating = $state(false);
	let editId = $state<number | null>(null);
	let editTitle = $state('');
	let editColor = $state('');

	async function loadLabels() {
		labels.set(await apiGetAuth<Label[]>('/labels'));
	}

	async function createLabel() {
		if (!newTitle.trim()) return;
		creating = true;
		try {
			await apiPostAuth('/labels', { title: newTitle, color: newColor });
			newTitle = '';
			await loadLabels();
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			creating = false;
		}
	}

	async function saveEdit(id: number) {
		try {
			await apiPutAuth(`/labels/${id}`, { title: editTitle, color: editColor });
			editId = null;
			await loadLabels();
		} catch (e: unknown) {
			error.set(errMessage(e));
		}
	}

	async function deleteLabel(id: number) {
		if (!confirm(tr('labels.confirmDelete'))) return;
		try {
			await apiDeleteAuth(`/labels/${id}`);
			await loadLabels();
		} catch (e: unknown) {
			error.set(errMessage(e));
		}
	}

	function startEdit(label: Label) {
		editId = label.id;
		editTitle = label.title;
		editColor = label.color ?? '#6366f1';
	}

	onMount(async () => {
		try {
			await loadLabels();
		} catch (e: unknown) {
			error.set(errMessage(e));
		}
		loading.set(false);
	});
</script>

<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">{$t('labels.title')}</h1>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="mb-4">
	<form
		onsubmit={(e) => {
			e.preventDefault();
			createLabel();
		}}
		class="flex gap-2 items-center flex-wrap"
	>
		<Input
			type="text"
			bind:value={newTitle}
			placeholder={$t('labels.newPlaceholder')}
			required
			class="flex-1 min-w-36"
		/>
		<input
			type="color"
			bind:value={newColor}
			class="w-9 h-9 p-0.5 border border-gray-300 dark:border-gray-600 rounded cursor-pointer bg-white dark:bg-gray-700"
			title={$t('labels.pickColor')}
		/>
		<Button type="submit" disabled={creating}>{creating ? $t('labels.adding') : $t('labels.add')}</Button>
	</form>
</Card>

{#if $loading}
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else if $labels.length === 0}
	<div class="text-center py-12 text-gray-400">
		<TagOutline class="w-12 h-12 mx-auto mb-3" />
		<p>{$t('labels.empty')}</p>
	</div>
{:else}
	<Card class="p-0 overflow-hidden">
		{#each $labels as label, i (label.id)}
			<div
				class="flex items-center gap-3 p-4 {i < $labels.length - 1
					? 'border-b border-gray-100 dark:border-gray-700'
					: ''}"
			>
				{#if editId === label.id}
					<Input type="text" bind:value={editTitle} class="flex-1" />
					<input
						type="color"
						bind:value={editColor}
						class="w-9 h-9 p-0.5 border border-gray-300 dark:border-gray-600 rounded cursor-pointer bg-white dark:bg-gray-700"
					/>
					<Button size="sm" onclick={() => saveEdit(label.id)}>{$t('common.save')}</Button>
					<Button size="sm" color="light" onclick={() => (editId = null)}>{$t('common.cancel')}</Button>
				{:else}
					<span class="color-dot shrink-0" style="--dot-color:{label.color ?? '#6366f1'}"></span>
					<span class="flex-1 font-medium text-gray-900 dark:text-white">{label.title}</span>
					<div class="flex gap-2 shrink-0">
						<Button size="sm" color="light" onclick={() => startEdit(label)}>{$t('common.edit')}</Button>
						<Button size="sm" color="red" onclick={() => deleteLabel(label.id)}>{$t('common.delete')}</Button>
					</div>
				{/if}
			</div>
		{/each}
	</Card>
{/if}
