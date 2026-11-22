<script lang="ts">
	import { t, tr, type MessageKey } from '$lib/i18n';
	import { page } from '$app/state';
	import {
		apiGetAuth,
		apiPostAuth,
		apiPutAuth,
		apiPatchAuth,
		apiDeleteAuth,
		apiFetchAuth,
		downloadAuthFile
	} from '$lib/api';
	import { authSession } from '$lib/auth';
	import { errMessage } from '$lib/errors';
	import { loadOnParamChange } from '$lib/param-loader.svelte';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { showToast } from '$lib/toast';
	import { announceRecurrence } from '$lib/recurrence';
	import type {
		Attachment,
		Comment,
		Label,
		Reminder,
		Task,
		TaskAssignee,
		TaskLabel,
		TaskRelation,
		UserSummary
	} from '$lib/types';
	import TaskDetailsTab from '$lib/components/task/TaskDetailsTab.svelte';
	import TaskWorkTab from '$lib/components/task/TaskWorkTab.svelte';
	import TaskActivityTab from '$lib/components/task/TaskActivityTab.svelte';
	import { Alert, Button } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';

	let task = $state<Task | null>(null);
	let comments = $state<Comment[]>([]);
	let assignees = $state<TaskAssignee[]>([]);
	/** People the creator may assign this task to (themselves + members of teams they own); the backend enforces who may actually assign. */
	let assignable = $state<UserSummary[]>([]);
	let taskLabels = $state<TaskLabel[]>([]);
	let allLabels = $state<Label[]>([]); // the user's own labels: the ones that can be attached
	let attachments = $state<Attachment[]>([]);
	let reminders = $state<Reminder[]>([]);
	let relations = $state<TaskRelation[]>([]);
	let subtasks = $state<Task[]>([]);
	const loading = writable(true);
	const error = writable('');

	const VALID_TABS = ['details', 'work', 'activity'] as const;
	type Tab = (typeof VALID_TABS)[number];
	let activeTab = $state<Tab>(
		(VALID_TABS.includes(page.url.searchParams.get('tab') as Tab)
			? page.url.searchParams.get('tab')
			: 'details') as Tab
	);

	function setTab(tab: Tab) {
		activeTab = tab;
		goto(`?tab=${tab}`, { replaceState: true, reset: false });
	}

	async function loadTask(id: string, isStale: () => boolean) {
		const [t, c, a, l, att, rem, rel, sub, mine, members] = await Promise.all([
			apiGetAuth<Task>(`/tasks/${id}`),
			apiGetAuth<Comment[]>(`/comments?taskId=${id}`),
			apiGetAuth<TaskAssignee[]>(`/tasks/${id}/assignees`),
			apiGetAuth<TaskLabel[]>(`/tasks/${id}/labels`),
			apiGetAuth<Attachment[]>(`/attachments?taskId=${id}`),
			apiGetAuth<Reminder[]>(`/tasks/${id}/reminders`).catch(() => []),
			apiGetAuth<TaskRelation[]>(`/tasks/${id}/relations`).catch(() => []),
			apiGetAuth<Task[]>(`/tasks?parentTaskId=${id}`).catch(() => []),
			apiGetAuth<Label[]>('/labels').catch((): Label[] => []),
			apiGetAuth<UserSummary[]>('/teams/assignable-users').catch((): UserSummary[] => [])
		]);
		if (isStale()) return; // the user already moved on to another task
		task = t;
		comments = c;
		assignees = a;
		taskLabels = l;
		attachments = att;
		reminders = rem;
		relations = rel;
		subtasks = sub;
		allLabels = mine;
		const me = $authSession.user;
		assignable =
			me && members.length
				? [{ id: me.id, username: me.username, name: me.name }, ...members.filter((m) => m.id !== me.id)]
				: [];
	}

	/** Assign the task to `userId`; the backend replaces the previous assignee (a task has exactly one). */
	async function assignTo(userId: number) {
		const id = page.params.id;
		try {
			await apiPostAuth(`/tasks/${id}/assignees`, { userId });
			assignees = await apiGetAuth<TaskAssignee[]>(`/tasks/${id}/assignees`);
		} catch (e: unknown) {
			fail(e);
		}
	}

	// Reloads when only the id changes (subtask / relation links keep this component mounted).
	// The tab components are unmounted while loading, so their inputs start empty for every task.
	loadOnParamChange(() => page.params.id ?? '', loadTask, loading, error);

	/** Failures of user actions are toasts: `error` is for load failures and replaces the page. */
	function fail(e: unknown) {
		showToast(errMessage(e), 'error');
	}

	async function addLabel(labelId: number) {
		const id = page.params.id;
		try {
			await apiPostAuth(`/tasks/${id}/labels`, { labelId });
			taskLabels = await apiGetAuth<TaskLabel[]>(`/tasks/${id}/labels`);
		} catch (e: unknown) {
			fail(e);
		}
	}
	async function removeLabel(labelId: number) {
		const id = page.params.id;
		try {
			await apiDeleteAuth(`/tasks/${id}/labels/${labelId}`);
			taskLabels = await apiGetAuth<TaskLabel[]>(`/tasks/${id}/labels`);
		} catch (e: unknown) {
			fail(e);
		}
	}

	let acting = $state(false);
	/** A copy lands next to the original (same project) and is opened right away. */
	async function duplicateTask() {
		if (!task || acting) return;
		acting = true;
		try {
			const copy = await apiPutAuth<Task>(`/tasks/${task.id}/duplicate`, {});
			showToast(tr('tasks.toast.duplicated'), 'success');
			await goto(`/tasks/${copy.id}`);
		} catch (e: unknown) {
			fail(e);
		} finally {
			acting = false;
		}
	}
	/** Archived tasks drop out of the lists but are kept; restoring brings them back. */
	async function toggleArchive() {
		if (!task || acting) return;
		acting = true;
		try {
			const archiving = !task.isArchived;
			task = await apiPatchAuth<Task>(`/nodes/${task.id}/${archiving ? 'archive' : 'unarchive'}`, {});
			showToast(tr(archiving ? 'tasks.toast.archived' : 'tasks.toast.restored'), 'success');
		} catch (e: unknown) {
			fail(e);
		} finally {
			acting = false;
		}
	}

	async function downloadAttachment(id: number, filename: string) {
		try {
			await downloadAuthFile(`/attachments/${id}/download`, filename);
		} catch (e: unknown) {
			showToast(errMessage(e, tr('tasks.toast.downloadFailed')), 'error');
		}
	}

	async function addReminder(localDateTime: string): Promise<boolean> {
		const id = page.params.id;
		try {
			await apiPostAuth(`/tasks/${id}/reminders`, {
				reminderDate: new Date(localDateTime).toISOString()
			});
			reminders = await apiGetAuth<Reminder[]>(`/tasks/${id}/reminders`);
			return true;
		} catch (e: unknown) {
			fail(e);
			return false;
		}
	}
	async function deleteReminder(reminderId: number) {
		const id = page.params.id;
		try {
			await apiDeleteAuth(`/tasks/${id}/reminders/${reminderId}`);
			reminders = await apiGetAuth<Reminder[]>(`/tasks/${id}/reminders`);
		} catch (e: unknown) {
			fail(e);
		}
	}
	async function addRelation(relatedTaskId: number, kind: string): Promise<boolean> {
		const id = page.params.id;
		try {
			await apiPostAuth(`/tasks/${id}/relations`, { relatedTaskId, kind });
			relations = await apiGetAuth<TaskRelation[]>(`/tasks/${id}/relations`);
			return true;
		} catch (e: unknown) {
			fail(e);
			return false;
		}
	}
	async function deleteRelation(kind: string, relatedTaskId: number) {
		const id = page.params.id;
		try {
			await apiDeleteAuth(`/tasks/${id}/relations/${kind}/${relatedTaskId}`);
			relations = await apiGetAuth<TaskRelation[]>(`/tasks/${id}/relations`);
		} catch (e: unknown) {
			fail(e);
		}
	}
	async function addSubtask(title: string): Promise<boolean> {
		const id = page.params.id;
		try {
			// The parent task is all the server needs; the project is found through the task tree.
			await apiPostAuth('/tasks', { title, parentTaskId: Number(id) });
			subtasks = await apiGetAuth<Task[]>(`/tasks?parentTaskId=${id}`);
			showToast(tr('tasks.toast.subtaskAdded'), 'success');
			return true;
		} catch (e: unknown) {
			fail(e);
			return false;
		}
	}
	async function updateTask(patch: Record<string, unknown>) {
		try {
			const before = task?.status;
			task = await apiPutAuth<Task>(`/tasks/${page.params.id}`, patch);
			announceRecurrence(patch.status, before, task);
		} catch (e: unknown) {
			fail(e);
		}
	}
	const updatePercentDone = (value: number) => updateTask({ percentDone: value });
	const updateStatus = (status: string) => updateTask({ status });
	function deferDueDate(days: number) {
		const base = task?.dueDate ? new Date(task.dueDate) : new Date();
		base.setDate(base.getDate() + days);
		return updateTask({ dueDate: base.toISOString() });
	}
	async function postComment(content: string): Promise<boolean> {
		const id = page.params.id;
		try {
			await apiPostAuth('/comments', { content, taskId: Number(id) });
			comments = await apiGetAuth<Comment[]>(`/comments?taskId=${id}`);
			showToast(tr('tasks.toast.commentPosted'), 'success');
			return true;
		} catch (e: unknown) {
			fail(e);
			return false;
		}
	}
	async function deleteComment(commentId: number) {
		try {
			await apiDeleteAuth(`/comments/${commentId}`);
			comments = await apiGetAuth<Comment[]>(`/comments?taskId=${page.params.id}`);
		} catch (e: unknown) {
			fail(e);
		}
	}
	async function uploadAttachment(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const id = page.params.id ?? '';
		const fd = new FormData();
		fd.append('file', file);
		try {
			// The task id goes in the query so the API can refuse before the file is written.
			const up = await apiFetchAuth(`/attachments/upload?taskId=${encodeURIComponent(id)}`, {
				method: 'POST',
				body: fd
			});
			if (!up.ok) {
				showToast(tr(up.status === 403 ? 'tasks.toast.uploadDisabled' : 'tasks.toast.uploadFailed'), 'error');
				return;
			}
			attachments = await apiGetAuth<Attachment[]>(`/attachments?taskId=${id}`);
			showToast(tr('tasks.toast.fileUploaded'), 'success');
		} catch (e: unknown) {
			fail(e);
		} finally {
			input.value = '';
		}
	}
</script>

{#if $loading}
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else if $error}
	<Alert color="red">{$error}</Alert>
{:else if task}
	<div class="flex items-start justify-between gap-4 mb-4">
		<div class="flex items-center gap-3">
			<a
				href={task.parent
					? `/${task.parent.type === 'project' ? 'projects' : 'tasks'}/${task.parent.id}`
					: '/tasks'}
				class="text-gray-400 hover:text-gray-600"
				><CaretLeftSolid class="w-4 h-4 inline mr-1" /> {$t('tasks.detail.back')}</a
			>
			<h1 class="text-xl font-bold text-gray-900 dark:text-white m-0">
				{task.title}
			</h1>
		</div>
		<div class="flex items-center gap-2 flex-wrap justify-end">
			<Button color="light" size="sm" disabled={acting} onclick={duplicateTask}
				>{$t('tasks.detail.duplicate')}</Button
			>
			<Button color="light" size="sm" disabled={acting} onclick={toggleArchive}
				>{task.isArchived ? $t('tasks.detail.restore') : $t('tasks.detail.archive')}</Button
			>
			<Button href="/tasks/{task.id}/edit" color="light" size="sm">{$t('tasks.detail.editTask')}</Button>
		</div>
	</div>
	{#if task.isArchived}
		<Alert color="yellow" class="mb-4">{$t('tasks.detail.archivedNotice')}</Alert>
	{/if}

	<!-- Tabs navigation -->
	<div
		role="tablist"
		aria-label={$t('tasks.detail.tabsLabel')}
		class="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700"
	>
		{#each [{ id: 'details', label: 'tasks.tab.details' }, { id: 'work', label: 'tasks.tab.work' }, { id: 'activity', label: 'tasks.tab.activity' }] as tab (tab.id)}
			<button
				role="tab"
				aria-selected={activeTab === tab.id}
				onclick={() => setTab(tab.id as Tab)}
				class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === tab.id
					? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
					: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
			>
				{$t(tab.label as MessageKey)}
			</button>
		{/each}
	</div>

	{#if activeTab === 'details'}
		<TaskDetailsTab
			{task}
			{taskLabels}
			{allLabels}
			{assignees}
			{assignable}
			onAssign={assignTo}
			onAddLabel={addLabel}
			onRemoveLabel={removeLabel}
			onStatus={updateStatus}
			onPercentDone={updatePercentDone}
			onDefer={deferDueDate}
		/>
	{:else if activeTab === 'work'}
		<TaskWorkTab
			taskId={task.id}
			{subtasks}
			{relations}
			onAddSubtask={addSubtask}
			onAddRelation={addRelation}
			onDeleteRelation={deleteRelation}
		/>
	{:else}
		<TaskActivityTab
			taskId={task.id}
			{reminders}
			{attachments}
			{comments}
			currentUserId={$authSession.user?.id}
			activityVersion={[
				task.updatedAt,
				comments.length,
				attachments.length,
				taskLabels.length,
				relations.length,
				assignees.length
			].join('-')}
			onAddReminder={addReminder}
			onDeleteReminder={deleteReminder}
			onDownload={downloadAttachment}
			onUpload={uploadAttachment}
			onPostComment={postComment}
			onDeleteComment={deleteComment}
		/>
	{/if}
{:else}
	<p class="text-gray-400">{$t('tasks.detail.notFound')}</p>
{/if}
