<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { confirmDialog } from '#lib/confirm.svelte.js';
	import { t, type MessageKey } from '#lib/i18n/index.js';
	import { page } from '$app/state';
	import {
		apiGetAuth,
		apiPostAuth,
		apiPutAuth,
		apiPatchAuth,
		apiDeleteAuth,
		apiFetchAuth,
		downloadAuthFile
	} from '#lib/api.js';
	import { authSession, userTimeZone } from '#lib/auth.svelte.js';
	import { addDaysKey, dayKeyOf, moveToDay } from '#lib/calendar.js';
	import { errMessage } from '#lib/errors.js';
	import { loadOnParamChange } from '#lib/param-loader.svelte.js';
	import { goto } from '$app/navigation';
	import { showToast } from '#lib/toast.svelte.js';
	import { announceRecurrence } from '#lib/recurrence.js';
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
	} from '#lib/types.js';
	import TaskDetailsTab from '#lib/components/task/TaskDetailsTab.svelte';
	import TaskActivityTab from '#lib/components/task/TaskActivityTab.svelte';
	import TaskComments from '#lib/components/task/TaskComments.svelte';
	import type { NewReminder } from '#lib/components/task/TaskReminderEditor.svelte';
	import InlineText from '#lib/components/InlineText.svelte';
	import { Alert, Button } from 'flowbite-svelte';

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

	// An old `?tab=work` link (subtasks and relations are on Details now) falls back to Details.
	const VALID_TABS = ['details', 'activity'] as const;
	type Tab = (typeof VALID_TABS)[number];
	let activeTab = $state<Tab>(
		(VALID_TABS.includes(page.url.searchParams.get('tab') as Tab)
			? page.url.searchParams.get('tab')
			: 'details') as Tab
	);

	function setTab(tab: Tab) {
		activeTab = tab;
		goto(`?tab=${tab}`, { replace: true, reset: false });
	}

	async function loadTask(id: string, isStale: () => boolean) {
		const [t, c, a, l, att, rem, rel, sub, mine] = await Promise.all([
			apiGetAuth<Task>(`/tasks/${id}`),
			apiGetAuth<Comment[]>(`/comments?taskId=${id}`),
			// Refused in single-user mode (no assignees there): the task still loads.
			apiGetAuth<TaskAssignee[]>(`/tasks/${id}/assignees`).catch((): TaskAssignee[] => []),
			apiGetAuth<TaskLabel[]>(`/tasks/${id}/labels`),
			apiGetAuth<Attachment[]>(`/attachments?taskId=${id}`),
			apiGetAuth<Reminder[]>(`/tasks/${id}/reminders`).catch(() => []),
			apiGetAuth<TaskRelation[]>(`/tasks/${id}/relations`).catch(() => []),
			apiGetAuth<Task[]>(`/tasks?parentTaskId=${id}`).catch(() => []),
			apiGetAuth<Label[]>('/labels').catch((): Label[] => [])
		]);
		if (isStale()) return; // the user already moved on to another task
		// Assigning gives access only to a top-level personal task; anywhere else the assignee must
		// already see the task, so the picker offers only them.
		const members = await apiGetAuth<UserSummary[]>(
			`/teams/assignable-users${t.parentId != null ? `?nodeId=${id}` : ''}`
		).catch((): UserSummary[] => []);
		if (isStale()) return;
		task = t;
		comments = c;
		assignees = a;
		taskLabels = l;
		attachments = att;
		reminders = rem;
		relations = rel;
		subtasks = sub;
		allLabels = mine;
		const me = authSession.user;
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
	const pageLoad = loadOnParamChange(() => page.params.id ?? '', loadTask);

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
			showToast(t('tasks.toast.duplicated'), 'success');
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
			showToast(t(archiving ? 'tasks.toast.archived' : 'tasks.toast.restored'), 'success');
		} catch (e: unknown) {
			fail(e);
		} finally {
			acting = false;
		}
	}

	/** Soft delete: the task and its subtasks go to the trash and can be restored from there. */
	async function deleteTask() {
		if (!task || acting || !(await confirmDialog(t('tasks.detail.confirmDelete')))) return;
		acting = true;
		try {
			const parent = task.parent;
			await apiDeleteAuth(`/tasks/${task.id}`);
			showToast(t('tasks.toast.deleted'), 'success');
			await goto(parent ? `/${parent.type === 'project' ? 'projects' : 'tasks'}/${parent.id}` : '/tasks');
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
			showToast(errMessage(e, t('tasks.toast.downloadFailed')), 'error');
		}
	}

	/** Deleting a file is permanent, so it is confirmed first. */
	async function deleteAttachment(att: Attachment) {
		if (!(await confirmDialog(t('tasks.attachments.confirmRemove', { name: att.filename })))) return;
		try {
			await apiDeleteAuth(`/attachments/${att.id}`);
			attachments = await apiGetAuth<Attachment[]>(`/attachments?taskId=${page.params.id}`);
			showToast(t('tasks.toast.fileDeleted'), 'success');
		} catch (e: unknown) {
			fail(e);
		}
	}

	async function addReminder(reminder: NewReminder): Promise<boolean> {
		const id = page.params.id;
		try {
			await apiPostAuth(`/tasks/${id}/reminders`, reminder);
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
			showToast(t('tasks.toast.subtaskAdded'), 'success');
			return true;
		} catch (e: unknown) {
			fail(e);
			return false;
		}
	}
	/** Save some fields of the task; false when it failed (the error is shown as a toast). */
	async function updateTask(patch: Record<string, unknown>): Promise<boolean> {
		try {
			const before = task?.status;
			task = await apiPutAuth<Task>(`/tasks/${page.params.id}`, patch);
			announceRecurrence(patch.status, before, task);
			// Reminders set relative to the due date have moved with it (so has a new cycle's due date).
			if ('dueDate' in patch || 'status' in patch) {
				reminders = await apiGetAuth<Reminder[]>(`/tasks/${page.params.id}/reminders`).catch(() => reminders);
			}
			return true;
		} catch (e: unknown) {
			fail(e);
			return false;
		}
	}
	const updatePercentDone = (value: number) => updateTask({ percentDone: value });
	const updateStatus = (status: string) => updateTask({ status });
	/** Move the due date (or today) by whole days in the profile zone, keeping its time of day there. */
	function deferDueDate(days: number) {
		const zone = userTimeZone();
		const base = task?.dueDate ? new Date(task.dueDate) : new Date();
		const target = addDaysKey(dayKeyOf(base, zone), days);
		return updateTask({ dueDate: moveToDay(base, target, zone).toISOString() });
	}
	async function postComment(content: string): Promise<boolean> {
		const id = page.params.id;
		try {
			await apiPostAuth('/comments', { content, taskId: Number(id) });
			comments = await apiGetAuth<Comment[]>(`/comments?taskId=${id}`);
			showToast(t('tasks.toast.commentPosted'), 'success');
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
				showToast(t(up.status === 403 ? 'tasks.toast.uploadDisabled' : 'tasks.toast.uploadFailed'), 'error');
				return;
			}
			attachments = await apiGetAuth<Attachment[]>(`/attachments?taskId=${id}`);
			showToast(t('tasks.toast.fileUploaded'), 'success');
		} catch (e: unknown) {
			fail(e);
		} finally {
			input.value = '';
		}
	}
</script>

{#if pageLoad.loading}
	<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
{:else if pageLoad.error}
	<Alert color="red">{pageLoad.error}</Alert>
{:else if task}
	{@const current = task}
	<div>
		<PageHeader
			title={task.title ?? ''}
			back={{
				href: task.parent
					? `/${task.parent.type === 'project' ? 'projects' : 'tasks'}/${task.parent.id}`
					: '/tasks',
				label: t('tasks.detail.back')
			}}
		>
			{#snippet titleContent()}
				<InlineText
					value={current.title ?? ''}
					required
					maxlength={255}
					label={t('tasks.detail.editTitle')}
					onSave={(v) => updateTask({ title: v })}
				>
					{#snippet display()}
						<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0 break-words">{current.title}</h1>
					{/snippet}
				</InlineText>
			{/snippet}
			{#snippet actions()}
				<Button color="light" size="sm" disabled={acting} onclick={duplicateTask}>
					{t('tasks.detail.duplicate')}
				</Button>
				<Button color="light" size="sm" disabled={acting} onclick={toggleArchive}>
					{current.isArchived ? t('tasks.detail.restore') : t('tasks.detail.archive')}
				</Button>
				<Button color="red" outline size="sm" disabled={acting} onclick={deleteTask}>
					{t('tasks.detail.delete')}
				</Button>
			{/snippet}
		</PageHeader>
		{#if task.isArchived}
			<Alert color="yellow" class="mb-4">{t('tasks.detail.archivedNotice')}</Alert>
		{/if}

		<!-- Tabs navigation -->
		<div
			role="tablist"
			aria-label={t('tasks.detail.tabsLabel')}
			class="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700"
		>
			{#each [{ id: 'details', label: 'tasks.tab.details' }, { id: 'activity', label: 'tasks.tab.activity' }] as tab (tab.id)}
				<button
					role="tab"
					aria-selected={activeTab === tab.id}
					onclick={() => setTab(tab.id as Tab)}
					class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === tab.id
						? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
						: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
				>
					{t(tab.label as MessageKey)}
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
				onUpdate={updateTask}
				{subtasks}
				{relations}
				onAddSubtask={addSubtask}
				onAddRelation={addRelation}
				onDeleteRelation={deleteRelation}
				{reminders}
				onAddReminder={addReminder}
				onDeleteReminder={deleteReminder}
				{attachments}
				onDownload={downloadAttachment}
				onUpload={uploadAttachment}
				onDeleteAttachment={deleteAttachment}
			/>
			<TaskComments
				taskId={task.id}
				{comments}
				currentUserId={authSession.user?.id}
				onPostComment={postComment}
				onDeleteComment={deleteComment}
			/>
		{:else}
			<TaskActivityTab
				taskId={task.id}
				activityVersion={[
					task.updatedAt,
					comments.length,
					attachments.length,
					taskLabels.length,
					relations.length,
					assignees.length
				].join('-')}
				onRestored={(restored) => (task = restored)}
			/>
		{/if}
	</div>
{:else}
	<p class="text-gray-500 dark:text-gray-400">{t('tasks.detail.notFound')}</p>
{/if}
