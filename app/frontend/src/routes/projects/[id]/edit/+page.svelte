<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { confirmDialog } from '#lib/confirm.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import { apiGetAuth, apiPutAuth, apiDeleteAuth } from '#lib/api.js';
	import { loadOnParamChange } from '#lib/param-loader.svelte.js';
	import type { Project } from '#lib/types.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Alert, Button, Card, Input, Label, Select, Textarea } from 'flowbite-svelte';
	import { descendantIds, projectOptions } from '#lib/project-tree.js';
	import { showToast } from '#lib/toast.svelte.js';
	import { singleUserMode } from '#lib/appConfig.svelte.js';
	import { t } from '#lib/i18n/index.js';

	let name = $state('');
	let description = $state('');
	let saving = $state(false);
	/** The parent as loaded ('' = top level) and as picked now. */
	let loadedParentId = $state('');
	let parentId = $state('');
	/** Deleting and moving are for the owner (or an owner above); a Manager may only edit. */
	let canRemove = $state(false);
	/** Sharing is managed (and the share list seen) by Managers and owners only. */
	let canShare = $state(false);
	/** Every project the user can see; the picker offers those they may write to, minus this one and its subprojects. */
	let allProjects = $state<Project[]>([]);
	const parentOptions = $derived.by(() => {
		const id = Number(page.params.id);
		const below = descendantIds(allProjects, id);
		return projectOptions(
			allProjects.filter(
				(p) =>
					p.id !== id &&
					!below.has(p.id) &&
					(p.access === 'write' || p.access === 'admin' || String(p.id) === loadedParentId)
			)
		);
	});

	const pageLoad = loadOnParamChange(
		() => page.params.id ?? '',
		async (id, isStale) => {
			const [p, all] = await Promise.all([
				apiGetAuth<Project>(`/projects/${id}`),
				apiGetAuth<Project[]>('/nodes?type=project&includeArchived=true').catch((): Project[] => [])
			]);
			if (isStale()) return;
			name = p.name ?? '';
			description = p.description ?? '';
			loadedParentId = p.parentId != null ? String(p.parentId) : '';
			parentId = loadedParentId;
			canRemove = p.canRemove === true;
			canShare = p.access === 'admin';
			allProjects = all;
		}
	);

	async function handleSave(e: SubmitEvent) {
		e.preventDefault();
		saving = true;
		pageLoad.error = '';
		try {
			await apiPutAuth(`/projects/${page.params.id}`, {
				name,
				description,
				...(parentId !== loadedParentId ? { parentId: parentId ? Number(parentId) : null } : {})
			});
			showToast(t('projects.edit.saved'), 'success');
			goto(`/projects/${page.params.id}`);
		} catch (e: unknown) {
			pageLoad.error = errMessage(e);
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!(await confirmDialog(t('projects.edit.confirmDelete')))) return;
		try {
			await apiDeleteAuth(`/projects/${page.params.id}`);
			goto('/projects');
		} catch (e: unknown) {
			pageLoad.error = errMessage(e);
		}
	}
</script>

{#if pageLoad.loading}
	<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
{:else}
	<PageHeader
		title={t('projects.edit.title')}
		back={{ href: `/projects/${page.params.id}`, label: t('common.back') }}
	/>

	{#if pageLoad.error}<Alert color="red" class="mb-4">{pageLoad.error}</Alert>{/if}

	<Card class="max-w-xl mb-6">
		<form onsubmit={handleSave} class="flex flex-col gap-4">
			<div>
				<Label for="proj-name" class="mb-1">
					{t('common.field.name')} <span class="text-red-500">*</span>
				</Label>
				<Input id="proj-name" type="text" bind:value={name} required />
			</div>
			<div>
				<Label for="proj-desc" class="mb-1">{t('common.field.description')}</Label>
				<Textarea id="proj-desc" bind:value={description} rows={4} />
			</div>
			{#if canRemove && (parentOptions.length || parentId)}
				<div>
					<Label for="proj-parent" class="mb-1">{t('projects.parent.label')}</Label>
					<Select id="proj-parent" placeholder="" bind:value={parentId}>
						<option value="">{t('projects.parent.none')}</option>
						{#each parentOptions as o (o.id)}
							<option value={String(o.id)}>{o.label}</option>
						{/each}
					</Select>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">{t('projects.parent.hint')}</p>
				</div>
			{/if}
			<div class="flex gap-2">
				<Button type="submit" disabled={saving}>
					{saving ? t('common.saving') : t('projects.edit.saveChanges')}
				</Button>
				<Button href="/projects/{page.params.id}" color="light">{t('common.cancel')}</Button>
			</div>
		</form>
	</Card>

	{#if !singleUserMode.current && canShare}
		<Card class="max-w-xl mb-6">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="font-medium text-gray-900 dark:text-white m-0">{t('projects.share.title')}</p>
					<p class="text-sm text-gray-500 dark:text-gray-400 m-0">{t('projects.share.desc')}</p>
				</div>
				<Button href="/projects/{page.params.id}/settings/share" size="sm" color="light">
					{t('projects.share.link')}
				</Button>
			</div>
		</Card>
	{/if}

	<div class="border border-red-300 dark:border-red-700 rounded-lg p-4 max-w-xl">
		<h2 class="text-base font-semibold text-red-600 dark:text-red-400 mb-3">
			{t('projects.edit.dangerZone')}
		</h2>
		<div class="flex flex-col gap-3">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium text-gray-900 dark:text-white m-0">
						{t('projects.edit.archiveRestore')}
					</p>
					<p class="text-sm text-gray-500 dark:text-gray-400 m-0">
						{t('projects.edit.archiveRestoreDesc')}
					</p>
				</div>
				<Button href="/projects/{page.params.id}/settings/archive" size="sm" color="light">
					{t('projects.edit.archive')}
				</Button>
			</div>
			<div class="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
				<div>
					<p class="font-medium text-gray-900 dark:text-white m-0">
						{t('projects.edit.duplicateTitle')}
					</p>
					<p class="text-sm text-gray-500 dark:text-gray-400 m-0">{t('projects.edit.duplicateDesc')}</p>
				</div>
				<Button href="/projects/{page.params.id}/settings/duplicate" size="sm" color="light">
					{t('projects.edit.duplicate')}
				</Button>
			</div>
			{#if canRemove}
				<div class="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
					<div>
						<p class="font-medium text-red-600 dark:text-red-400 m-0">
							{t('projects.edit.deleteTitle')}
						</p>
						<p class="text-sm text-gray-500 dark:text-gray-400 m-0">
							{t('projects.edit.deleteDesc')}
						</p>
					</div>
					<Button size="sm" color="red" onclick={handleDelete}>{t('common.delete')}</Button>
				</div>
			{/if}
		</div>
	</div>
{/if}
