<script lang="ts">
	import { page } from '$app/stores';
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

	let newComment = '';
	let addingComment = false;
	let newReminderDate = '';
	let newRelatedTaskId = '';
	let newRelationKind = 'related';
	let newSubtaskTitle = '';

	const RELATION_KINDS = [
		'related',
		'subtask',
		'blocks',
		'blocked_by',
		'duplicate_of',
		'duplicated_by',
	];

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

	async function addReminder() {
		const id = $page.params.id;
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
		const id = $page.params.id;
		try {
			await apiDeleteAuth(`/tasks/${id}/reminders/${reminderId}`);
			reminders.set(await apiGetAuth<any[]>(`/tasks/${id}/reminders`));
		} catch (e: any) {
			error.set(e.message);
		}
	}

	async function addRelation() {
		const id = $page.params.id;
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
		const id = $page.params.id;
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
		const id = $page.params.id;
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
		const id = $page.params.id;
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
		const id = $page.params.id;
		try {
			const updated = await apiPutAuth<any>(`/tasks/${id}`, { status });
			task.set(updated);
		} catch (e: any) {
			error.set(e.message);
		}
	}

	async function deferDueDate(days: number) {
		const id = $page.params.id;
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
		const id = $page.params.id;
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
			const id = $page.params.id;
			comments.set(await apiGetAuth<any[]>(`/comments?taskId=${id}`));
		} catch (e: any) {
			error.set(e.message);
		}
	}

	async function uploadAttachment(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const id = $page.params.id ?? '';
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
		const fresh = await apiGetAuth<any[]>(`/attachments?taskId=${id}`);
		attachments.set(fresh);
		input.value = '';
	}

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/login');
			return;
		}
		const id = $page.params.id ?? '';
		try {
			await loadTask(id);
		} catch (e: any) {
			error.set(e.message);
		} finally {
			loading.set(false);
		}
	});
</script>

{#if $loading}
	<p class="text-muted">Loading…</p>
{:else if $error}
	<div class="alert alert-error">{$error}</div>
{:else if $task}
	<div class="page-header">
		<a href="/projects/{$task.project?.id ?? ''}" class="back-link"
			><span class="icon icon-sm">arrow_back</span></a
		>
		<h1 class="page-title">{$task.title}</h1>
		<div class="page-actions">
			<a href="/tasks/{$task.id}/edit" class="btn btn-secondary"
				>Edit Task</a
			>
		</div>
	</div>

	<div class="card mb-4">
		<div class="card-body">
			{#if $task.description}
				<p class="text-sm mb-4" style="white-space:pre-wrap">
					{$task.description}
				</p>
			{/if}

			<div class="form-row mb-4">
				<div class="form-group mb-0">
					<label
						for="task-status"
						class="form-label"
						style="text-transform:uppercase;font-size:0.75rem;letter-spacing:0.05em"
						>Status</label
					>
					<select
						id="task-status"
						value={$task.status ?? 'open'}
						onchange={(e) =>
							updateStatus((e.target as HTMLSelectElement).value)}
						class="form-select"
					>
						<option value="open">Open</option>
						<option value="in_progress">In Progress</option>
						<option value="done">Done</option>
					</select>
				</div>
				<div class="form-group mb-0">
					<span
						class="form-label"
						style="text-transform:uppercase;font-size:0.75rem;letter-spacing:0.05em"
						>Priority</span
					>
					<div class="text-sm">
						{$task.priority !== undefined && $task.priority !== null
							? ([
									'—',
									'Low',
									'Medium',
									'High',
									'Urgent',
									'Do Now',
								][$task.priority] ?? $task.priority)
							: '—'}
					</div>
				</div>
				{#if $task.startDate}
					<div class="form-group mb-0">
						<span
							class="form-label"
							style="text-transform:uppercase;font-size:0.75rem;letter-spacing:0.05em"
							>Start Date</span
						>
						<div class="text-sm">
							{new Date($task.startDate).toLocaleDateString()}
						</div>
					</div>
				{/if}
				{#if $task.dueDate}
					<div class="form-group mb-0">
						<span
							class="form-label"
							style="text-transform:uppercase;font-size:0.75rem;letter-spacing:0.05em"
							>Due Date</span
						>
						<div
							class="text-sm {new Date($task.dueDate) <
								new Date() && $task.status !== 'done'
								? 'text-danger font-bold'
								: ''}"
						>
							{new Date($task.dueDate).toLocaleDateString()}
						</div>
					</div>
				{/if}
			</div>

			<div class="mb-4">
				<div
					class="flex-center"
					style="justify-content:space-between;margin-bottom:0.4rem"
				>
					<span
						class="form-label mb-0"
						style="text-transform:uppercase;font-size:0.75rem;letter-spacing:0.05em"
						>Progress</span
					>
					<select
						value={$task.percentDone ?? 0}
						onchange={(e) =>
							updatePercentDone(
								Number((e.target as HTMLSelectElement).value),
							)}
						class="form-select"
						style="width:auto;padding:2px 6px;font-size:0.8rem"
					>
						{#each [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as p}<option
								value={p}>{p}%</option
							>{/each}
					</select>
				</div>
				<div
					style="background:var(--na-border,#e2e8f0);border-radius:4px;height:8px"
				>
					<div
						style="background:var(--na-primary,#6366f1);height:8px;border-radius:4px;width:{$task.percentDone ??
							0}%;transition:width 0.3s"
					></div>
				</div>
			</div>

			{#if $task.dueDate}
				<div class="flex-center gap-2 flex-wrap">
					<span class="text-xs text-muted">Defer due date:</span>
					<button
						onclick={() => deferDueDate(1)}
						class="btn btn-ghost btn-sm">+1 day</button
					>
					<button
						onclick={() => deferDueDate(3)}
						class="btn btn-ghost btn-sm">+3 days</button
					>
					<button
						onclick={() => deferDueDate(7)}
						class="btn btn-ghost btn-sm">+1 week</button
					>
				</div>
			{/if}

			{#if $taskLabels.length || $assignees.length}
				<div
					class="flex-center flex-wrap gap-4 mt-4"
					style="padding-top:1rem;border-top:1px solid var(--na-border,#f1f5f9)"
				>
					{#if $taskLabels.length}
						<div>
							<span
								class="text-xs text-muted"
								style="display:block;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.3rem"
								>Labels</span
							>
							<div class="flex-center gap-1 flex-wrap">
								{#each $taskLabels as tl}
									<span
										class="color-dot"
										style="--dot-color:{tl.label?.color ??
											'#6366f1'}"
									></span>
									<span class="tag text-xs"
										>{tl.label?.title ?? tl.labelId}</span
									>
								{/each}
							</div>
						</div>
					{/if}
					{#if $assignees.length}
						<div>
							<span
								class="text-xs text-muted"
								style="display:block;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.3rem"
								>Assignees</span
							>
							<div class="text-sm">
								{$assignees
									.map(
										(a: any) =>
											a.user?.username ??
											`User #${a.userId}`,
									)
									.join(', ')}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div class="card mb-4">
		<div class="card-header"><h2 class="card-title">Subtasks</h2></div>
		<div class="card-body">
			{#if $subtasks.length}
				<div class="list mb-3">
					{#each $subtasks as sub}
						<div class="list-item">
							<div class="list-item-body">
								<a
									href="/tasks/{sub.id}"
									class="text-sm font-medium">{sub.title}</a
								>
							</div>
							<span
								class="status-badge"
								data-status={sub.status ?? 'open'}
								>{sub.status ?? 'open'}</span
							>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted text-sm mb-3">No subtasks.</p>
			{/if}
			<form onsubmit={addSubtask} class="inline-form">
				<input
					type="text"
					bind:value={newSubtaskTitle}
					placeholder="Add subtask…"
					class="form-input"
					style="flex:1"
				/>
				<button type="submit" class="btn btn-primary btn-sm">Add</button
				>
			</form>
		</div>
	</div>

	<div class="card mb-4">
		<div class="card-header"><h2 class="card-title">Reminders</h2></div>
		<div class="card-body">
			{#if $reminders.length}
				<div class="list mb-3">
					{#each $reminders as rem}
						<div class="list-item">
							<div class="list-item-body text-sm">
								{new Date(rem.reminderDate).toLocaleString()}
							</div>
							<button
								onclick={() => deleteReminder(rem.id)}
								class="btn btn-ghost btn-sm btn-icon"
								title="Delete"
								><span class="icon icon-sm">close</span></button
							>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted text-sm mb-3">No reminders.</p>
			{/if}
			<div class="inline-form">
				<input
					type="datetime-local"
					bind:value={newReminderDate}
					class="form-input"
					style="flex:1"
				/>
				<button onclick={addReminder} class="btn btn-primary btn-sm"
					>Add</button
				>
			</div>
		</div>
	</div>

	<div class="card mb-4">
		<div class="card-header"><h2 class="card-title">Related Tasks</h2></div>
		<div class="card-body">
			{#if $relations.length}
				<div class="list mb-3">
					{#each $relations as rel}
						<div class="list-item">
							<span class="tag text-xs"
								>{rel.kind.replace(/_/g, ' ')}</span
							>
							<div class="list-item-body">
								<a
									href="/tasks/{rel.relatedTask?.id ??
										rel.relatedTaskId}"
									class="text-sm font-medium"
									>{rel.relatedTask?.title ??
										`Task #${rel.relatedTaskId}`}</a
								>
							</div>
							<button
								onclick={() =>
									deleteRelation(
										rel.kind,
										rel.relatedTask?.id ??
											rel.relatedTaskId,
									)}
								class="btn btn-ghost btn-sm btn-icon"
								><span class="icon icon-sm">close</span></button
							>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted text-sm mb-3">No relations.</p>
			{/if}
			<div class="inline-form flex-wrap">
				<input
					type="number"
					bind:value={newRelatedTaskId}
					placeholder="Task ID"
					class="form-input"
					style="width:100px"
				/>
				<select bind:value={newRelationKind} class="form-select">
					{#each RELATION_KINDS as k}<option value={k}
							>{k.replace(/_/g, ' ')}</option
						>{/each}
				</select>
				<button onclick={addRelation} class="btn btn-primary btn-sm"
					>Add</button
				>
			</div>
		</div>
	</div>

	<div class="card mb-4">
		<div class="card-header"><h2 class="card-title">Attachments</h2></div>
		<div class="card-body">
			{#if $attachments.length}
				<div class="list mb-3">
					{#each $attachments as att}
						<div class="list-item">
							<span class="icon icon-sm">attach_file</span>
							<div class="list-item-body">
								<a
									href="{API_BASE}/attachments/{att.id}/download"
									target="_blank"
									class="text-sm text-primary"
									>{att.filename}</a
								>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted text-sm mb-3">No attachments.</p>
			{/if}
			<label class="btn btn-secondary btn-sm">
				<span class="icon icon-sm">upload</span> Upload file
				<input
					type="file"
					onchange={uploadAttachment}
					class="sr-only"
				/>
			</label>
		</div>
	</div>

	<div class="card">
		<div class="card-header"><h2 class="card-title">Comments</h2></div>
		<div class="card-body">
			{#if $comments.length}
				<div class="list mb-4">
					{#each $comments as comment}
						<div
							class="list-item"
							style="flex-direction:column;align-items:stretch"
						>
							<div
								class="flex-center"
								style="justify-content:space-between;margin-bottom:0.3rem"
							>
								<span class="text-sm font-bold text-primary"
									>{comment.author?.username ??
										'Unknown'}</span
								>
								<div class="flex-center gap-2">
									<span class="text-xs text-muted"
										>{new Date(
											comment.createdAt,
										).toLocaleString()}</span
									>
									<button
										onclick={() =>
											deleteComment(comment.id)}
										class="btn btn-ghost btn-sm"
										>Delete</button
									>
								</div>
							</div>
							<p
								class="text-sm mb-0"
								style="white-space:pre-wrap"
							>
								{comment.content}
							</p>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted text-sm mb-4">No comments yet.</p>
			{/if}
			<form onsubmit={postComment} class="inline-form">
				<input
					type="text"
					bind:value={newComment}
					placeholder="Add a comment…"
					class="form-input"
					style="flex:1"
				/>
				<button
					type="submit"
					disabled={addingComment}
					class="btn btn-primary btn-sm">Post</button
				>
			</form>
		</div>
	</div>
{:else}
	<p class="text-muted">Task not found.</p>
{/if}
