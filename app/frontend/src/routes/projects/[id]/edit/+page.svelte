<script lang="ts">
	import { errMessage } from '$lib/errors';
	import { writable } from 'svelte/store';
	import { apiGetAuth, apiPutAuth, apiDeleteAuth } from '$lib/api';
	import { loadOnParamChange } from '$lib/param-loader.svelte';
	import type { Project } from '$lib/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Alert, Button, Card, Input, Label, Textarea } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';
	import { showToast } from '$lib/toast';
	import { t, tr } from '$lib/i18n';

	const project = writable<Project | null>(null);
	const name = writable('');
	const description = writable('');
	const error = writable('');
	const loading = writable(true);
	const saving = writable(false);

	loadOnParamChange(
		() => page.params.id ?? '',
		async (id, isStale) => {
			const p = await apiGetAuth<Project>(`/projects/${id}`);
			if (isStale()) return;
			project.set(p);
			name.set(p.name ?? '');
			description.set(p.description ?? '');
		},
		loading,
		error
	);

	async function handleSave(e: SubmitEvent) {
		e.preventDefault();
		saving.set(true);
		error.set('');
		try {
			await apiPutAuth(`/projects/${page.params.id}`, {
				name: $name,
				description: $description
			});
			showToast(tr('projects.edit.saved'), 'success');
			goto(`/projects/${page.params.id}`);
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			saving.set(false);
		}
	}

	async function handleDelete() {
		if (!confirm(tr('projects.edit.confirmDelete'))) return;
		try {
			await apiDeleteAuth(`/projects/${page.params.id}`);
			goto('/projects');
		} catch (e: unknown) {
			error.set(errMessage(e));
		}
	}
</script>

{#if $loading}
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else}
	<div class="flex items-center gap-3 mb-6">
		<a href="/projects/{page.params.id}" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
			<CaretLeftSolid class="w-4 h-4 inline mr-1" />
			{$t('common.back')}
		</a>
		<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
			{$t('projects.edit.title')}
		</h1>
	</div>

	{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

	<Card class="max-w-xl mb-6">
		<form onsubmit={handleSave} class="flex flex-col gap-4">
			<div>
				<Label for="proj-name" class="mb-1">
					{$t('common.field.name')} <span class="text-red-500">*</span>
				</Label>
				<Input id="proj-name" type="text" bind:value={$name} required />
			</div>
			<div>
				<Label for="proj-desc" class="mb-1">{$t('common.field.description')}</Label>
				<Textarea id="proj-desc" bind:value={$description} rows={4} />
			</div>
			<div class="flex gap-2">
				<Button type="submit" disabled={$saving}>
					{$saving ? $t('common.saving') : $t('projects.edit.saveChanges')}
				</Button>
				<Button href="/projects/{page.params.id}" color="light">{$t('common.cancel')}</Button>
			</div>
		</form>
	</Card>

	<div class="border border-red-300 dark:border-red-700 rounded-lg p-4 max-w-xl">
		<h2 class="text-base font-semibold text-red-600 dark:text-red-400 mb-3">
			{$t('projects.edit.dangerZone')}
		</h2>
		<div class="flex flex-col gap-3">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium text-gray-900 dark:text-white m-0">
						{$t('projects.edit.archiveRestore')}
					</p>
					<p class="text-sm text-gray-500 m-0">
						{$t('projects.edit.archiveRestoreDesc')}
					</p>
				</div>
				<Button href="/projects/{page.params.id}/settings/archive" size="sm" color="light">
					{$t('projects.edit.archive')}
				</Button>
			</div>
			<div class="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
				<div>
					<p class="font-medium text-gray-900 dark:text-white m-0">
						{$t('projects.edit.duplicateTitle')}
					</p>
					<p class="text-sm text-gray-500 m-0">{$t('projects.edit.duplicateDesc')}</p>
				</div>
				<Button href="/projects/{page.params.id}/settings/duplicate" size="sm" color="light">
					{$t('projects.edit.duplicate')}
				</Button>
			</div>
			<div class="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
				<div>
					<p class="font-medium text-red-600 dark:text-red-400 m-0">
						{$t('projects.edit.deleteTitle')}
					</p>
					<p class="text-sm text-gray-500 m-0">
						{$t('projects.edit.deleteDesc')}
					</p>
				</div>
				<Button size="sm" color="red" onclick={handleDelete}>{$t('common.delete')}</Button>
			</div>
		</div>
	</div>
{/if}
