<script lang="ts">
	import { t, tr } from '$lib/i18n';
	import { dateInputToIso } from '$lib/dates';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { apiPostAuth, apiGetAuth } from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { writable, get } from 'svelte/store';
	import { onMount } from 'svelte';
	import { Alert, Button, Card, Input, Label, Select, Textarea } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';
	import { showToast } from '$lib/toast';
	import { errMessage } from '$lib/errors';
	import type { Project, Task, UserSummary } from '$lib/types';

	const title = writable('');
	const description = writable('');
	const projectId = writable<number | undefined>(undefined);
	const dueDate = writable('');
	const priority = writable(0);
	const error = writable('');
	const loading = writable(false);
	const projects = writable<Project[]>([]);
	const assigneeId = writable<number | undefined>(undefined);
	const assignable = writable<UserSummary[]>([]);

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/user/login');
			return;
		}
		assigneeId.set(me.id);
		try {
			// Members of the teams I own; empty (so no picker) for everyone else.
			const members = await apiGetAuth<UserSummary[]>('/teams/assignable-users');
			if (members.length) {
				assignable.set([
					{ id: me.id, username: me.username, name: me.name },
					...members.filter((m) => m.id !== me.id)
				]);
			}
		} catch {
			// no picker: the task is assigned to its creator
		}
		const pid = page.url.searchParams.get('projectId');
		if (pid) projectId.set(Number(pid));
		try {
			projects.set(await apiGetAuth<Project[]>('/projects'));
			// No project given in the link: start in the user's default one (if they can still open it).
			const def = me.defaultProjectId;
			if (!pid && def && get(projects).some((p) => p.id === def)) projectId.set(def);
		} catch {
			// the project list is optional; the select just stays empty
		}
	});

	async function handleCreate(event: Event) {
		event.preventDefault();
		loading.set(true);
		error.set('');
		try {
			const pid = get(projectId);
			const task = await apiPostAuth<Task>('/tasks', {
				title: get(title),
				description: get(description),
				...(pid ? { project: { id: pid } } : {}),
				dueDate: dateInputToIso(get(dueDate)) ?? undefined,
				priority: Number(get(priority)),
				assigneeId: get(assigneeId)
			});
			showToast(tr('tasks.toast.created'), 'success');
			goto(`/tasks/${task.id}`);
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			loading.set(false);
		}
	}
</script>

<div class="flex items-center gap-3 mb-6">
	<a href={$projectId ? `/projects/${$projectId}` : '/tasks'} class="text-gray-400 hover:text-gray-600"
		><CaretLeftSolid class="w-4 h-4 inline mr-1" /> {$t('tasks.detail.back')}</a
	>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
		{$t('tasks.form.createTitle')}
	</h1>
</div>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

<Card class="max-w-xl">
	<form onsubmit={handleCreate} class="flex flex-col gap-4">
		<div>
			<Label for="task-title" class="mb-1"
				>{$t('common.field.title')} <span class="text-red-500">*</span></Label
			>
			<Input id="task-title" type="text" bind:value={$title} required />
		</div>
		<div>
			<Label for="task-desc" class="mb-1">{$t('common.field.description')}</Label>
			<Textarea id="task-desc" bind:value={$description} rows={3} />
		</div>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<Label for="task-due" class="mb-1">{$t('tasks.details.dueDate')}</Label>
				<Input id="task-due" type="date" bind:value={$dueDate} />
			</div>
			<div>
				<Label for="task-priority" class="mb-1">{$t('common.field.priority')}</Label>
				<Select id="task-priority" bind:value={$priority}>
					<option value={0}>{$t('tasks.form.priorityUnset')}</option>
					<option value={1}>{$t('common.priority.1')}</option><option value={2}
						>{$t('common.priority.2')}</option
					><option value={3}>{$t('common.priority.3')}</option><option value={4}
						>{$t('common.priority.4')}</option
					><option value={5}>{$t('common.priority.5')}</option>
				</Select>
			</div>
		</div>
		{#if !$projectId}
			<div>
				<Label for="task-project" class="mb-1"
					>{$t('common.field.project')} <span class="text-red-500">*</span></Label
				>
				<Select id="task-project" bind:value={$projectId} required>
					<option value={undefined}>{$t('tasks.form.selectProject')}</option>
					{#each $projects as p (p.id)}<option value={p.id}>{p.name ?? p.title}</option>{/each}
				</Select>
			</div>
		{/if}
		{#if $assignable.length > 1}
			<div>
				<Label for="task-assignee" class="mb-1">{$t('tasks.form.assignee')}</Label>
				<Select id="task-assignee" bind:value={$assigneeId}>
					{#each $assignable as u (u.id)}
						<option value={u.id}>{u.name || u.username}</option>
					{/each}
				</Select>
			</div>
		{/if}
		<div class="flex gap-2">
			<Button type="submit" disabled={$loading}
				>{$loading ? $t('tasks.form.creating') : $t('tasks.form.createButton')}</Button
			>
			<Button href={$projectId ? `/projects/${$projectId}` : '/tasks'} color="light"
				>{$t('common.cancel')}</Button
			>
		</div>
	</form>
</Card>
