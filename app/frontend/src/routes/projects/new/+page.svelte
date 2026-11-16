<script lang="ts">
	import { errMessage } from '$lib/errors';
	import { writable } from 'svelte/store';
	import { apiPostAuth } from '$lib/api';
	import type { Project } from '$lib/types';
	import { goto } from '$app/navigation';
	import { Alert, Button, Card, Input, Label, Textarea } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';
	import { showToast } from '$lib/toast';
	import { t, tr } from '$lib/i18n';

	const name = writable('');
	const description = writable('');
	const error = writable('');
	const loading = writable(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading.set(true);
		error.set('');
		try {
			const project = await apiPostAuth<Project>('/projects', {
				name: $name,
				description: $description
			});
			showToast(tr('projects.create.created'), 'success');
			goto(`/projects/${project.id}`);
		} catch (err: unknown) {
			error.set(errMessage(err, tr('projects.create.failed')));
		} finally {
			loading.set(false);
		}
	}
</script>

<div class="flex items-center gap-3 mb-6">
	<a href="/projects" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
		><CaretLeftSolid class="w-4 h-4 inline mr-1" /> {$t('common.back')}</a
	>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
		{$t('projects.create.title')}
	</h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="max-w-xl">
	<form onsubmit={handleSubmit} class="flex flex-col gap-4">
		<div>
			<Label for="proj-name" class="mb-1">{$t('common.field.name')} <span class="text-red-500">*</span></Label
			>
			<Input id="proj-name" type="text" bind:value={$name} required />
		</div>
		<div>
			<Label for="proj-desc" class="mb-1">{$t('common.field.description')}</Label>
			<Textarea id="proj-desc" bind:value={$description} rows={4} />
		</div>
		<div class="flex gap-2">
			<Button type="submit" disabled={$loading}
				>{$loading ? $t('projects.create.submitting') : $t('projects.create.submit')}</Button
			>
			<Button href="/projects" color="light">{$t('common.cancel')}</Button>
		</div>
	</form>
</Card>
