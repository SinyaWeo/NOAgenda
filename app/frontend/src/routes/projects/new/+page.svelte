<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { errMessage } from '#lib/errors.js';
	import { apiPostAuth } from '#lib/api.js';
	import type { Project } from '#lib/types.js';
	import { goto } from '$app/navigation';
	import { Alert, Button, Card, Input, Label, Textarea } from 'flowbite-svelte';
	import { showToast } from '#lib/toast.svelte.js';
	import { t } from '#lib/i18n/index.js';

	let name = $state('');
	let description = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		try {
			const project = await apiPostAuth<Project>('/projects', {
				name,
				description
			});
			showToast(t('projects.create.created'), 'success');
			goto(`/projects/${project.id}`);
		} catch (err: unknown) {
			error = errMessage(err, t('projects.create.failed'));
		} finally {
			loading = false;
		}
	}
</script>

<PageHeader title={t('projects.create.title')} back={{ href: '/projects', label: t('common.back') }} />

{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}

<Card class="max-w-xl">
	<form onsubmit={handleSubmit} class="flex flex-col gap-4">
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
		<div class="flex gap-2">
			<Button type="submit" disabled={loading}>
				{loading ? t('projects.create.submitting') : t('projects.create.submit')}
			</Button>
			<Button href="/projects" color="light">{t('common.cancel')}</Button>
		</div>
	</form>
</Card>
