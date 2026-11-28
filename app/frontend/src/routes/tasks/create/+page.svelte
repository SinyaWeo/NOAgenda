<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { t } from '#lib/i18n/index.js';
	import { dateInputToIso } from '#lib/dates.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { apiPostAuth, apiGetAuth } from '#lib/api.js';
	import { getCurrentUser, userTimeZone } from '#lib/auth.svelte.js';
	import { onMount } from 'svelte';
	import { Alert, Button, Card, Input, Label, Select, Textarea } from 'flowbite-svelte';
	import { showToast } from '#lib/toast.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import type { Project, Task, UserSummary } from '#lib/types.js';
	import { projectOptions } from '#lib/project-tree.js';

	let title = $state('');
	let description = $state('');
	let projectId = $state<number | undefined>(undefined);
	let dueDate = $state('');
	let priority = $state(0);
	let error = $state('');
	let loading = $state(false);
	let projects = $state<Project[]>([]);
	let assigneeId = $state<number | undefined>(undefined);
	let assignable = $state<UserSummary[]>([]);
	let me = $state<UserSummary | null>(null);

	// Members of the teams I manage; empty (so no picker) for everyone else. In a project only those
	// who can already see it: assigning someone never opens a project to them.
	$effect(() => {
		const self = me;
		const pid = projectId;
		if (!self) return;
		let stale = false;
		void (async () => {
			let members: UserSummary[] = [];
			try {
				members = await apiGetAuth<UserSummary[]>(`/teams/assignable-users${pid ? `?nodeId=${pid}` : ''}`);
			} catch {
				// no picker: the task is assigned to its creator
			}
			if (stale) return;
			assignable = members.length ? [self, ...members.filter((m) => m.id !== self.id)] : [];
			if (!assignable.some((u) => u.id === assigneeId)) assigneeId = self.id;
		})();
		return () => {
			stale = true;
		};
	});

	onMount(async () => {
		const user = await getCurrentUser();
		if (!user) {
			goto('/user/login');
			return;
		}
		assigneeId = user.id;
		me = { id: user.id, username: user.username, name: user.name };
		const pid = page.url.searchParams.get('projectId');
		if (pid) projectId = Number(pid);
		try {
			projects = await apiGetAuth<Project[]>('/projects');
		} catch {
			// the project list is optional; the select just stays empty
		}
	});

	async function handleCreate(event: Event) {
		event.preventDefault();
		loading = true;
		error = '';
		try {
			const pid = projectId;
			const task = await apiPostAuth<Task>('/tasks', {
				title,
				description,
				...(pid ? { project: { id: pid } } : {}),
				dueDate: dateInputToIso(dueDate, userTimeZone()) ?? undefined,
				priority: Number(priority),
				assigneeId
			});
			showToast(t('tasks.toast.created'), 'success');
			goto(`/tasks/${task.id}`);
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			loading = false;
		}
	}
</script>

<PageHeader
	title={t('tasks.form.createTitle')}
	back={{ href: projectId ? `/projects/${projectId}` : '/tasks', label: t('tasks.detail.back') }}
/>
{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}

<Card class="max-w-xl">
	<form onsubmit={handleCreate} class="flex flex-col gap-4">
		<div>
			<Label for="task-title" class="mb-1">
				{t('common.field.title')} <span class="text-red-500">*</span>
			</Label>
			<Input id="task-title" type="text" bind:value={title} required />
		</div>
		<div>
			<Label for="task-desc" class="mb-1">{t('common.field.description')}</Label>
			<Textarea id="task-desc" bind:value={description} rows={3} />
		</div>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<Label for="task-due" class="mb-1">{t('tasks.details.dueDate')}</Label>
				<Input id="task-due" type="date" bind:value={dueDate} />
			</div>
			<div>
				<Label for="task-priority" class="mb-1">{t('common.field.priority')}</Label>
				<Select placeholder="" id="task-priority" bind:value={priority}>
					<option value={0}>{t('tasks.form.priorityUnset')}</option>
					<option value={1}>{t('common.priority.1')}</option><option value={2}>
						{t('common.priority.2')}
					</option><option value={3}>{t('common.priority.3')}</option><option value={4}>
						{t('common.priority.4')}
					</option><option value={5}>{t('common.priority.5')}</option>
				</Select>
			</div>
		</div>
		<div>
			<Label for="task-project" class="mb-1">{t('common.field.project')}</Label>
			<Select placeholder="" id="task-project" bind:value={projectId}>
				<option value={undefined}>{t('tasks.form.noProject')}</option>
				{#each projectOptions(projects) as o (o.id)}<option value={o.id}>{o.label}</option>{/each}
			</Select>
		</div>
		{#if assignable.length > 1}
			<div>
				<Label for="task-assignee" class="mb-1">{t('tasks.form.assignee')}</Label>
				<Select placeholder="" id="task-assignee" bind:value={assigneeId}>
					{#each assignable as u (u.id)}
						<option value={u.id}>{u.name || u.username}</option>
					{/each}
				</Select>
			</div>
		{/if}
		<div class="flex gap-2">
			<Button type="submit" disabled={loading}>
				{loading ? t('tasks.form.creating') : t('tasks.form.createButton')}
			</Button>
			<Button href={projectId ? `/projects/${projectId}` : '/tasks'} color="light">
				{t('common.cancel')}
			</Button>
		</div>
	</form>
</Card>
