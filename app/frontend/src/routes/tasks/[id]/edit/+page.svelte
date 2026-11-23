<script lang="ts">
	import { t, tr } from '$lib/i18n';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { apiGetAuth, apiPutAuth } from '$lib/api';
	import { loadOnParamChange } from '$lib/param-loader.svelte';
	import { dateInputToIso, isoToDateInput } from '$lib/dates';
	import { writable } from 'svelte/store';
	import { Alert, Button, Card, Input, Label, Select, Textarea } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';
	import { showToast } from '$lib/toast';
	import { errMessage } from '$lib/errors';
	import type { Task } from '$lib/types';
	import { emptyRepeat, formFromTask, repeatPayload, type RepeatForm } from '$lib/repeat';
	import RepeatFields from '$lib/components/task/RepeatFields.svelte';

	const title = writable('');
	const description = writable('');
	const dueDate = writable('');
	const startDate = writable('');
	const priority = writable(0);
	const percentDone = writable(0);
	let repeat = $state<RepeatForm>(emptyRepeat());
	const error = writable('');
	const loading = writable(true);
	const saving = writable(false);

	async function loadTask(id: string, isStale: () => boolean) {
		const task = await apiGetAuth<Task>(`/tasks/${id}`);
		if (isStale()) return;
		title.set(task.title ?? '');
		description.set(task.description ?? '');
		dueDate.set(isoToDateInput(task.dueDate));
		startDate.set(isoToDateInput(task.startDate));
		priority.set(task.priority ?? 0);
		percentDone.set(task.percentDone ?? 0);
		repeat = formFromTask(task);
	}

	loadOnParamChange(() => page.params.id ?? '', loadTask, loading, error);

	async function handleEdit(event: Event) {
		event.preventDefault();
		saving.set(true);
		error.set('');
		try {
			await apiPutAuth(`/tasks/${page.params.id}`, {
				title: $title,
				description: $description,
				dueDate: dateInputToIso($dueDate),
				startDate: dateInputToIso($startDate),
				priority: $priority,
				percentDone: $percentDone,
				...repeatPayload(repeat)
			});
			showToast(tr('tasks.toast.saved'), 'success');
			goto(`/tasks/${page.params.id}`);
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			saving.set(false);
		}
	}
</script>

<div class="flex items-center gap-3 mb-6">
	<a href="/tasks/{page.params.id}" class="text-gray-400 hover:text-gray-600">
		<CaretLeftSolid class="w-4 h-4 inline mr-1" />
		{$t('tasks.form.backToTask')}
	</a>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
		{$t('tasks.form.editTitle')}
	</h1>
</div>

{#if $loading}
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else}
	{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
	<Card class="max-w-xl">
		<form onsubmit={handleEdit} class="flex flex-col gap-4">
			<div>
				<Label for="edit-title" class="mb-1">
					{$t('common.field.title')} <span class="text-red-500">*</span>
				</Label>
				<Input id="edit-title" type="text" bind:value={$title} required />
			</div>
			<div>
				<Label for="edit-desc" class="mb-1">{$t('common.field.description')}</Label>
				<Textarea id="edit-desc" bind:value={$description} rows={3} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="edit-start" class="mb-1">{$t('tasks.details.startDate')}</Label>
					<Input id="edit-start" type="date" bind:value={$startDate} />
				</div>
				<div>
					<Label for="edit-due" class="mb-1">{$t('tasks.details.dueDate')}</Label>
					<Input id="edit-due" type="date" bind:value={$dueDate} />
				</div>
				<div>
					<Label for="edit-priority" class="mb-1">{$t('common.field.priority')}</Label>
					<Select placeholder="" id="edit-priority" bind:value={$priority}>
						<option value={0}>{$t('tasks.form.priorityUnset')}</option>
						<option value={1}>{$t('common.priority.1')}</option><option value={2}>
							{$t('common.priority.2')}
						</option><option value={3}>{$t('common.priority.3')}</option><option value={4}>
							{$t('common.priority.4')}
						</option><option value={5}>{$t('common.priority.5')}</option>
					</Select>
				</div>
				<div>
					<Label for="edit-percent" class="mb-1">{$t('tasks.form.percentDone')}</Label>
					<Select placeholder="" id="edit-percent" bind:value={$percentDone}>
						{#each [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as p (p)}<option value={p}>
								{p}%
							</option>{/each}
					</Select>
				</div>
			</div>
			<RepeatFields bind:form={repeat} />
			<div class="flex gap-2">
				<Button type="submit" disabled={$saving}>
					{$saving ? $t('common.saving') : $t('tasks.form.saveChanges')}
				</Button>
				<Button href="/tasks/{page.params.id}" color="light">{$t('common.cancel')}</Button>
			</div>
		</form>
	</Card>
{/if}
