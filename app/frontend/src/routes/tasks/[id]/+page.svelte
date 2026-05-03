<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import {
		apiGetAuth,
		apiPostAuth,
		apiPutAuth,
		apiDeleteAuth,
		getToken,
		API_BASE,
	} from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import {
		Alert,
		Button,
		Card,
		Input,
		Progressbar,
		Select,
		Textarea,
	} from 'flowbite-svelte';
	import { PaperClipOutline } from 'flowbite-svelte-icons';

	const task = writable<any>(null);
	const comments = writable<any[]>([]);
	const assignees = writable<any[]>([]);
	const taskLabels = writable<any[]>([]);
	const attachments = writable<any[]>([]);
	const reminders = writable<any[]>([]);
	const relations = writable<any[]>([]);
	const subtasks = writable<any[]>([]);
	const loading = writable(true);
	const error = writable('');

	let newComment = $state('');
	let addingComment = $state(false);
	let newReminderDate = $state('');
	let newRelatedTaskId = $state('');
	let newRelationKind = $state('related');
	let newSubtaskTitle = $state('');

	const RELATION_KINDS = [
		'related',
		'subtask',
		'blocks',
		'blocked_by',
		'duplicate_of',
		'duplicated_by',
	];
	const PRIORITY_LABELS = ['—', 'Low', 'Medium', 'High', 'Urgent', 'Do Now'];

	async function loadTask(id: string) {
		const [t, c, a, l, att, rem, rel, sub] = await Promise.all([
			apiGetAuth<any>(`/tasks/${id}`),
			apiGetAuth<any[]>(`/comments?taskId=${id}`),
			apiGetAuth<any[]>(`/tasks/${id}/assignees`),
			apiGetAuth<any[]>(`/tasks/${id}/labels`),
			apiGetAuth<any[]>(`/attachments?taskId=${id}`),
			apiGetAuth<any[]>(`/tasks/${id}/reminders`).catch(() => []),
			apiGetAuth<any[]>(`/tasks/${id}/relations`).catch(() => []),
			apiGetAuth<any[]>(`/tasks?parentTaskId=${id}`).catch(() => []),
		]);
		task.set(t);
		comments.set(c);
		assignees.set(a);
		taskLabels.set(l);
		attachments.set(att);
		reminders.set(rem);
		relations.set(rel);
		subtasks.set(sub);
	}

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/user/login');
			return;
		}
		try {
			await loadTask(page.params.id ?? '');
		} catch (e: any) {
			error.set(e.message);
		} finally {
			loading.set(false);
		}
	});

	async function addReminder() {
		const id = page.params.id;
		if (!newReminderDate) return;
		try {
			await apiPostAuth(`/tasks/${id}/reminders`, {
				reminderDate: new Date(newReminderDate).toISOString(),
			});
			reminders.set(await apiGetAuth<any[]>(`/tasks/${id}/reminders`));
			newReminderDate = '';
		} catch (e: any) {
			error.set(e.message);
		}
	}
	async function deleteReminder(reminderId: number) {
		const id = page.params.id;
		try {
			await apiDeleteAuth(`/tasks/${id}/reminders/${reminderId}`);
			reminders.set(await apiGetAuth<any[]>(`/tasks/${id}/reminders`));
		} catch (e: any) {
			error.set(e.message);
		}
	}
	async function addRelation() {
		const id = page.params.id;
		if (!newRelatedTaskId) return;
		try {
			await apiPostAuth(`/tasks/${id}/relations`, {
				relatedTaskId: Number(newRelatedTaskId),
				kind: newRelationKind,
			});
			relations.set(await apiGetAuth<any[]>(`/tasks/${id}/relations`));
			newRelatedTaskId = '';
		} catch (e: any) {
			error.set(e.message);
		}
	}
	async function deleteRelation(kind: string, relatedTaskId: number) {
		const id = page.params.id;
		try {
			await apiDeleteAuth(
				`/tasks/${id}/relations/${kind}/${relatedTaskId}`,
			);
			relations.set(await apiGetAuth<any[]>(`/tasks/${id}/relations`));
		} catch (e: any) {
			error.set(e.message);
		}
	}
	async function addSubtask(e: SubmitEvent) {
		e.preventDefault();
		const id = page.params.id;
		if (!newSubtaskTitle.trim()) return;
		const t = $task;
		try {
			await apiPostAuth('/tasks', {
				title: newSubtaskTitle,
				parentTaskId: Number(id),
				project: { id: t?.project?.id },
			});
			subtasks.set(await apiGetAuth<any[]>(`/tasks?parentTaskId=${id}`));
			newSubtaskTitle = '';
		} catch (e: any) {
			error.set(e.message);
		}
	}
	async function updatePercentDone(value: number) {
		const id = page.params.id;
		try {
			const updated = await apiPutAuth<any>(`/tasks/${id}`, {
				percentDone: value,
			});
			task.set(updated);
		} catch (e: any) {
			error.set(e.message);
		}
	}
	async function updateStatus(status: string) {
		const id = page.params.id;
		try {
			const updated = await apiPutAuth<any>(`/tasks/${id}`, { status });
			task.set(updated);
		} catch (e: any) {
			error.set(e.message);
		}
	}
	async function deferDueDate(days: number) {
		const id = page.params.id;
		const t = $task;
		const base = t?.dueDate ? new Date(t.dueDate) : new Date();
		base.setDate(base.getDate() + days);
		try {
			const updated = await apiPutAuth<any>(`/tasks/${id}`, {
				dueDate: base.toISOString(),
			});
			task.set(updated);
		} catch (e: any) {
			error.set(e.message);
		}
	}
	async function postComment(e: SubmitEvent) {
		e.preventDefault();
		const id = page.params.id;
		if (!newComment.trim()) return;
		addingComment = true;
		try {
			await apiPostAuth('/comments', {
				content: newComment,
				taskId: Number(id),
			});
			newComment = '';
			comments.set(await apiGetAuth<any[]>(`/comments?taskId=${id}`));
		} catch (e: any) {
			error.set(e.message);
		} finally {
			addingComment = false;
		}
	}
	async function deleteComment(commentId: number) {
		try {
			await apiDeleteAuth(`/comments/${commentId}`);
			comments.set(
				await apiGetAuth<any[]>(`/comments?taskId=${page.params.id}`),
			);
		} catch (e: any) {
			error.set(e.message);
		}
	}
	async function uploadAttachment(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const id = page.params.id ?? '';
		const fd = new FormData();
		fd.append('file', file);
		fd.append('taskId', id);
		const token = getToken();
		const headers: Record<string, string> = {};
		if (token) headers['Authorization'] = `Bearer ${token}`;
		await fetch(API_BASE + '/attachments/upload', {
			method: 'POST',
			headers,
			body: fd,
		});
		attachments.set(await apiGetAuth<any[]>(`/attachments?taskId=${id}`));
		input.value = '';
	}
</script>

{#if $loading}
	<p class="text-gray-400">Loading…</p>
{:else if $error}
	<Alert color="red">{$error}</Alert>
{:else if $task}
	<div class="flex items-start justify-between gap-4 mb-4">
		<div class="flex items-center gap-3">
			<a
				href="/projects/{$task.project?.id ?? ''}"
				class="text-gray-400 hover:text-gray-600">← Back</a
			>
			<h1 class="text-xl font-bold text-gray-900 dark:text-white m-0">
				{$task.title}
			</h1>
		</div>
		<Button href="/tasks/{$task.id}/edit" color="light" size="sm"
			>Edit Task</Button
		>
	</div>

	<Card class="mb-4">
		{#if $task.description}<p
				class="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 mb-4"
			>
				{$task.description}
			</p>{/if}

		<div class="grid grid-cols-2 gap-4 mb-4 sm:grid-cols-4">
			<div>
				<p
					class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1"
				>
					Status
				</p>
				<Select
					value={$task.status ?? 'open'}
					onchange={(e) =>
						updateStatus((e.target as HTMLSelectElement).value)}
					class="w-full"
				>
					<option value="open">Open</option><option
						value="in_progress">In Progress</option
					><option value="done">Done</option>
				</Select>
			</div>
			<div>
				<p
					class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1"
				>
					Priority
				</p>
				<p
					class="text-sm text-gray-900 dark:text-white"
					data-priority={$task.priority}
				>
					{PRIORITY_LABELS[$task.priority] ?? '—'}
				</p>
			</div>
			{#if $task.startDate}
				<div>
					<p
						class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1"
					>
						Start Date
					</p>
					<p class="text-sm text-gray-900 dark:text-white">
						{new Date($task.startDate).toLocaleDateString()}
					</p>
				</div>
			{/if}
			{#if $task.dueDate}
				<div>
					<p
						class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1"
					>
						Due Date
					</p>
					<p
						class="text-sm {new Date($task.dueDate) < new Date() &&
						$task.status !== 'done'
							? 'text-red-600 font-bold'
							: 'text-gray-900 dark:text-white'}"
					>
						{new Date($task.dueDate).toLocaleDateString()}
					</p>
				</div>
			{/if}
		</div>

		<div class="mb-4">
			<div class="flex items-center justify-between mb-2">
				<p
					class="text-xs font-medium text-gray-500 uppercase tracking-wide m-0"
				>
					Progress
				</p>
				<Select
					value={$task.percentDone ?? 0}
					onchange={(e) =>
						updatePercentDone(
							Number((e.target as HTMLSelectElement).value),
						)}
					class="w-auto"
				>
					{#each [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as p}<option
							value={p}>{p}%</option
						>{/each}
				</Select>
			</div>
			<Progressbar progress={$task.percentDone ?? 0} />
		</div>

		{#if $task.dueDate}
			<div class="flex items-center gap-2 flex-wrap">
				<span class="text-xs text-gray-400">Defer due date:</span>
				<Button size="xs" color="light" onclick={() => deferDueDate(1)}
					>+1 day</Button
				>
				<Button size="xs" color="light" onclick={() => deferDueDate(3)}
					>+3 days</Button
				>
				<Button size="xs" color="light" onclick={() => deferDueDate(7)}
					>+1 week</Button
				>
			</div>
		{/if}

		{#if $taskLabels.length || $assignees.length}
			<div
				class="flex gap-6 flex-wrap mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"
			>
				{#if $taskLabels.length}
					<div>
						<p
							class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1"
						>
							Labels
						</p>
						<div class="flex items-center gap-1.5 flex-wrap">
							{#each $taskLabels as tl}
								<span
									class="color-dot"
									style="--dot-color:{tl.label?.color ??
										'#6366f1'}"
								></span>
								<span
									class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
									>{tl.label?.title ?? tl.labelId}</span
								>
							{/each}
						</div>
					</div>
				{/if}
				{#if $assignees.length}
					<div>
						<p
							class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1"
						>
							Assignees
						</p>
						<p class="text-sm text-gray-700 dark:text-gray-300 m-0">
							{$assignees
								.map(
									(a: any) =>
										a.user?.username ?? `User #${a.userId}`,
								)
								.join(', ')}
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</Card>

	<!-- Subtasks -->
	<Card class="mb-4">
		<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
			Subtasks
		</h2>
		{#if $subtasks.length}
			<div class="mb-3">
				{#each $subtasks as sub, i}
					<div
						class="flex items-center gap-3 py-2 {i <
						$subtasks.length - 1
							? 'border-b border-gray-100 dark:border-gray-700'
							: ''}"
					>
						<a
							href="/tasks/{sub.id}"
							class="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 hover:underline"
							>{sub.title}</a
						>
						<span
							class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
							data-status={sub.status ?? 'open'}
							>{sub.status ?? 'open'}</span
						>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-gray-400 mb-3">No subtasks.</p>
		{/if}
		<form onsubmit={addSubtask} class="flex gap-2">
			<Input
				type="text"
				bind:value={newSubtaskTitle}
				placeholder="Add subtask…"
				class="flex-1"
			/>
			<Button type="submit" size="sm">Add</Button>
		</form>
	</Card>

	<!-- Reminders -->
	<Card class="mb-4">
		<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
			Reminders
		</h2>
		{#if $reminders.length}
			<div class="mb-3">
				{#each $reminders as rem, i}
					<div
						class="flex items-center gap-3 py-2 {i <
						$reminders.length - 1
							? 'border-b border-gray-100 dark:border-gray-700'
							: ''}"
					>
						<span
							class="flex-1 text-sm text-gray-700 dark:text-gray-300"
							>{new Date(rem.reminderDate).toLocaleString()}</span
						>
						<Button
							size="xs"
							color="light"
							onclick={() => deleteReminder(rem.id)}>✕</Button
						>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-gray-400 mb-3">No reminders.</p>
		{/if}
		<div class="flex gap-2">
			<Input
				type="datetime-local"
				bind:value={newReminderDate}
				class="flex-1"
			/>
			<Button size="sm" onclick={addReminder}>Add</Button>
		</div>
	</Card>

	<!-- Related Tasks -->
	<Card class="mb-4">
		<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
			Related Tasks
		</h2>
		{#if $relations.length}
			<div class="mb-3">
				{#each $relations as rel, i}
					<div
						class="flex items-center gap-3 py-2 {i <
						$relations.length - 1
							? 'border-b border-gray-100 dark:border-gray-700'
							: ''}"
					>
						<span
							class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 shrink-0"
							>{rel.kind.replace(/_/g, ' ')}</span
						>
						<a
							href="/tasks/{rel.relatedTask?.id ??
								rel.relatedTaskId}"
							class="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 hover:underline"
							>{rel.relatedTask?.title ??
								`Task #${rel.relatedTaskId}`}</a
						>
						<Button
							size="xs"
							color="light"
							onclick={() =>
								deleteRelation(
									rel.kind,
									rel.relatedTask?.id ?? rel.relatedTaskId,
								)}>✕</Button
						>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-gray-400 mb-3">No relations.</p>
		{/if}
		<div class="flex gap-2 flex-wrap">
			<Input
				type="number"
				bind:value={newRelatedTaskId}
				placeholder="Task ID"
				class="w-28"
			/>
			<Select bind:value={newRelationKind} class="w-auto">
				{#each RELATION_KINDS as k}<option value={k}
						>{k.replace(/_/g, ' ')}</option
					>{/each}
			</Select>
			<Button size="sm" onclick={addRelation}>Add</Button>
		</div>
	</Card>

	<!-- Attachments -->
	<Card class="mb-4">
		<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
			Attachments
		</h2>
		{#if $attachments.length}
			<div class="mb-3">
				{#each $attachments as att, i}
					<div
						class="flex items-center gap-2 py-2 {i <
						$attachments.length - 1
							? 'border-b border-gray-100 dark:border-gray-700'
							: ''}"
					>
						<PaperClipOutline
							class="w-4 h-4 text-gray-400 shrink-0"
						/>
						<a
							href="{API_BASE}/attachments/{att.id}/download"
							target="_blank"
							class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
							>{att.filename}</a
						>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-gray-400 mb-3">No attachments.</p>
		{/if}
		<label
			class="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
		>
			Upload file
			<input type="file" onchange={uploadAttachment} class="sr-only" />
		</label>
	</Card>

	<!-- Comments -->
	<Card>
		<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
			Comments
		</h2>
		{#if $comments.length}
			<div class="mb-4">
				{#each $comments as comment, i}
					<div
						class="flex flex-col gap-1 py-3 {i <
						$comments.length - 1
							? 'border-b border-gray-100 dark:border-gray-700'
							: ''}"
					>
						<div class="flex items-center justify-between">
							<span
								class="text-sm font-bold text-primary-600 dark:text-primary-400"
								>{comment.author?.username ?? 'Unknown'}</span
							>
							<div class="flex items-center gap-2">
								<span class="text-xs text-gray-400"
									>{new Date(
										comment.createdAt,
									).toLocaleString()}</span
								>
								<Button
									size="xs"
									color="light"
									onclick={() => deleteComment(comment.id)}
									>Delete</Button
								>
							</div>
						</div>
						<p
							class="text-sm text-gray-700 dark:text-gray-300 m-0 whitespace-pre-wrap"
						>
							{comment.content}
						</p>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-gray-400 mb-4">No comments yet.</p>
		{/if}
		<form onsubmit={postComment} class="flex gap-2">
			<Input
				type="text"
				bind:value={newComment}
				placeholder="Add a comment…"
				class="flex-1"
			/>
			<Button type="submit" size="sm" disabled={addingComment}
				>Post</Button
			>
		</form>
	</Card>
{:else}
	<p class="text-gray-400">Task not found.</p>
{/if}
