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
	<p style="color:#64748b">Loading…</p>
{:else if $error}
	<div
		style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;padding:0.75rem 1rem;border-radius:6px;font-size:0.875rem"
	>
		{$error}
	</div>
{:else if $task}
	<div style="max-width:800px">
		<!-- Header -->
		<div
			style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap"
		>
			<div>
				<a
					href="/projects/{$task.project?.id ?? ''}"
					style="font-size:0.8rem;color:#94a3b8;text-decoration:none"
					>← Project</a
				>
				<h1
					style="font-size:1.4rem;font-weight:700;color:#1e293b;margin:0.25rem 0 0"
				>
					{$task.title}
				</h1>
			</div>
			<a
				href="/tasks/{$task.id}/edit"
				style="padding:0.5rem 1rem;border:1px solid #d1d5db;border-radius:6px;color:#374151;text-decoration:none;font-size:0.875rem;background:#fff;white-space:nowrap"
				>Edit Task</a
			>
		</div>

		<!-- Main info card -->
		<div
			style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem;margin-bottom:1.25rem"
		>
			{#if $task.description}
				<p
					style="margin:0 0 1rem;color:#374151;font-size:0.95rem;white-space:pre-wrap"
				>
					{$task.description}
				</p>
			{/if}

			<div
				style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem;margin-bottom:1rem"
			>
				<div>
					<div
						style="font-size:0.75rem;font-weight:500;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.3rem"
					>
						Status
					</div>
					<select
						value={$task.status ?? 'open'}
						onchange={(e) =>
							updateStatus((e.target as HTMLSelectElement).value)}
						style="padding:0.4rem 0.6rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem;background:#fff;width:100%"
					>
						<option value="open">Open</option>
						<option value="in_progress">In Progress</option>
						<option value="done">Done</option>
					</select>
				</div>
				<div>
					<div
						style="font-size:0.75rem;font-weight:500;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.3rem"
					>
						Priority
					</div>
					<div style="font-size:0.875rem;color:#374151">
						{#if $task.priority !== undefined && $task.priority !== null}
							{['—', 'Low', 'Medium', 'High', 'Urgent', 'Do Now'][
								$task.priority
							] ?? $task.priority}
						{:else}—{/if}
					</div>
				</div>
				{#if $task.startDate}
					<div>
						<div
							style="font-size:0.75rem;font-weight:500;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.3rem"
						>
							Start Date
						</div>
						<div style="font-size:0.875rem;color:#374151">
							{new Date($task.startDate).toLocaleDateString()}
						</div>
					</div>
				{/if}
				{#if $task.dueDate}
					<div>
						<div
							style="font-size:0.75rem;font-weight:500;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.3rem"
						>
							Due Date
						</div>
						<div
							style="font-size:0.875rem;{new Date($task.dueDate) <
								new Date() && $task.status !== 'done'
								? 'color:#ef4444;font-weight:500'
								: 'color:#374151'}"
						>
							{new Date($task.dueDate).toLocaleDateString()}
						</div>
					</div>
				{/if}
			</div>

			<!-- Progress -->
			<div style="margin-bottom:1rem">
				<div
					style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem"
				>
					<span
						style="font-size:0.75rem;font-weight:500;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em"
						>Progress</span
					>
					<select
						value={$task.percentDone ?? 0}
						onchange={(e) =>
							updatePercentDone(
								Number((e.target as HTMLSelectElement).value),
							)}
						style="padding:2px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:0.8rem;background:#fff"
					>
						{#each [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as p}<option
								value={p}>{p}%</option
							>{/each}
					</select>
				</div>
				<div style="background:#e2e8f0;border-radius:4px;height:8px">
					<div
						style="background:#6366f1;height:8px;border-radius:4px;width:{$task.percentDone ??
							0}%;transition:width 0.3s"
					></div>
				</div>
			</div>

			<!-- Defer due date -->
			{#if $task.dueDate}
				<div
					style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap"
				>
					<span style="font-size:0.8rem;color:#94a3b8"
						>Defer due date:</span
					>
					<button
						onclick={() => deferDueDate(1)}
						style="padding:0.2rem 0.6rem;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:#f8fafc;font-size:0.8rem;color:#475569"
						>+1 day</button
					>
					<button
						onclick={() => deferDueDate(3)}
						style="padding:0.2rem 0.6rem;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:#f8fafc;font-size:0.8rem;color:#475569"
						>+3 days</button
					>
					<button
						onclick={() => deferDueDate(7)}
						style="padding:0.2rem 0.6rem;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:#f8fafc;font-size:0.8rem;color:#475569"
						>+1 week</button
					>
				</div>
			{/if}

			<!-- Labels & Assignees -->
			{#if $taskLabels.length || $assignees.length}
				<div
					style="margin-top:1rem;padding-top:1rem;border-top:1px solid #f1f5f9;display:flex;flex-wrap:wrap;gap:1rem"
				>
					{#if $taskLabels.length}
						<div>
							<span
								style="font-size:0.75rem;font-weight:500;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:0.3rem"
								>Labels</span
							>
							<div style="display:flex;flex-wrap:wrap;gap:0.3rem">
								{#each $taskLabels as tl}
									<span
										style="background:{tl.label?.color ??
											'#6366f1'};color:#fff;border-radius:4px;padding:2px 8px;font-size:0.8rem"
										>{tl.label?.title ?? tl.labelId}</span
									>
								{/each}
							</div>
						</div>
					{/if}
					{#if $assignees.length}
						<div>
							<span
								style="font-size:0.75rem;font-weight:500;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:0.3rem"
								>Assignees</span
							>
							<div style="font-size:0.875rem;color:#374151">
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

		<!-- Subtasks -->
		<div
			style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem;margin-bottom:1rem"
		>
			<h2
				style="font-size:1rem;font-weight:600;color:#1e293b;margin:0 0 0.75rem"
			>
				Subtasks
			</h2>
			{#if $subtasks.length}
				<div
					style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.75rem"
				>
					{#each $subtasks as sub}
						<div
							style="display:flex;align-items:center;gap:0.6rem;padding:0.4rem 0.6rem;background:#f8fafc;border-radius:5px"
						>
							<a
								href="/tasks/{sub.id}"
								style="flex:1;font-size:0.875rem;color:#1e293b;text-decoration:none"
								>{sub.title}</a
							>
							<span style="font-size:0.75rem;color:#94a3b8"
								>{sub.status ?? 'open'}</span
							>
						</div>
					{/each}
				</div>
			{:else}
				<p style="color:#94a3b8;font-size:0.875rem;margin:0 0 0.75rem">
					No subtasks.
				</p>
			{/if}
			<form onsubmit={addSubtask} style="display:flex;gap:0.5rem">
				<input
					type="text"
					bind:value={newSubtaskTitle}
					placeholder="Add subtask…"
					style="flex:1;padding:0.45rem 0.7rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem"
				/>
				<button
					type="submit"
					style="padding:0.45rem 0.9rem;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.875rem"
					>Add</button
				>
			</form>
		</div>

		<!-- Reminders -->
		<div
			style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem;margin-bottom:1rem"
		>
			<h2
				style="font-size:1rem;font-weight:600;color:#1e293b;margin:0 0 0.75rem"
			>
				Reminders
			</h2>
			{#if $reminders.length}
				<div
					style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.75rem"
				>
					{#each $reminders as rem}
						<div
							style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.6rem;background:#f8fafc;border-radius:5px"
						>
							<span style="font-size:0.875rem;color:#374151"
								>{new Date(
									rem.reminderDate,
								).toLocaleString()}</span
							>
							<button
								onclick={() => deleteReminder(rem.id)}
								style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1rem;padding:0"
								title="Delete">✕</button
							>
						</div>
					{/each}
				</div>
			{:else}
				<p style="color:#94a3b8;font-size:0.875rem;margin:0 0 0.75rem">
					No reminders.
				</p>
			{/if}
			<div style="display:flex;gap:0.5rem">
				<input
					type="datetime-local"
					bind:value={newReminderDate}
					style="flex:1;padding:0.45rem 0.7rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem"
				/>
				<button
					onclick={addReminder}
					style="padding:0.45rem 0.9rem;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.875rem"
					>Add</button
				>
			</div>
		</div>

		<!-- Relations -->
		<div
			style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem;margin-bottom:1rem"
		>
			<h2
				style="font-size:1rem;font-weight:600;color:#1e293b;margin:0 0 0.75rem"
			>
				Related Tasks
			</h2>
			{#if $relations.length}
				<div
					style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.75rem"
				>
					{#each $relations as rel}
						<div
							style="display:flex;align-items:center;gap:0.6rem;padding:0.4rem 0.6rem;background:#f8fafc;border-radius:5px"
						>
							<span
								style="font-size:0.75rem;background:#e0e7ff;color:#4f46e5;border-radius:3px;padding:1px 6px"
								>{rel.kind.replace(/_/g, ' ')}</span
							>
							<a
								href="/tasks/{rel.relatedTask?.id ??
									rel.relatedTaskId}"
								style="flex:1;font-size:0.875rem;color:#1e293b;text-decoration:none"
								>{rel.relatedTask?.title ??
									`Task #${rel.relatedTaskId}`}</a
							>
							<button
								onclick={() =>
									deleteRelation(
										rel.kind,
										rel.relatedTask?.id ??
											rel.relatedTaskId,
									)}
								style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1rem;padding:0"
								>✕</button
							>
						</div>
					{/each}
				</div>
			{:else}
				<p style="color:#94a3b8;font-size:0.875rem;margin:0 0 0.75rem">
					No relations.
				</p>
			{/if}
			<div style="display:flex;gap:0.5rem;flex-wrap:wrap">
				<input
					type="number"
					bind:value={newRelatedTaskId}
					placeholder="Task ID"
					style="width:100px;padding:0.45rem 0.7rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem"
				/>
				<select
					bind:value={newRelationKind}
					style="padding:0.45rem 0.7rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem;background:#fff"
				>
					{#each RELATION_KINDS as k}<option value={k}
							>{k.replace(/_/g, ' ')}</option
						>{/each}
				</select>
				<button
					onclick={addRelation}
					style="padding:0.45rem 0.9rem;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.875rem"
					>Add</button
				>
			</div>
		</div>

		<!-- Attachments -->
		<div
			style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem;margin-bottom:1rem"
		>
			<h2
				style="font-size:1rem;font-weight:600;color:#1e293b;margin:0 0 0.75rem"
			>
				Attachments
			</h2>
			{#if $attachments.length}
				<div
					style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.75rem"
				>
					{#each $attachments as att}
						<div
							style="display:flex;align-items:center;padding:0.4rem 0.6rem;background:#f8fafc;border-radius:5px"
						>
							<a
								href="{API_BASE}/attachments/{att.id}/download"
								target="_blank"
								style="font-size:0.875rem;color:#6366f1;text-decoration:none"
								>📎 {att.filename}</a
							>
						</div>
					{/each}
				</div>
			{:else}
				<p style="color:#94a3b8;font-size:0.875rem;margin:0 0 0.75rem">
					No attachments.
				</p>
			{/if}
			<label
				style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.45rem 0.9rem;background:#f8fafc;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:0.875rem;color:#374151"
			>
				+ Upload file
				<input
					type="file"
					onchange={uploadAttachment}
					style="display:none"
				/>
			</label>
		</div>

		<!-- Comments -->
		<div
			style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem"
		>
			<h2
				style="font-size:1rem;font-weight:600;color:#1e293b;margin:0 0 0.75rem"
			>
				Comments
			</h2>
			{#if $comments.length}
				<div
					style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1rem"
				>
					{#each $comments as comment}
						<div
							style="padding:0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px"
						>
							<div
								style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;margin-bottom:0.3rem"
							>
								<span
									style="font-size:0.8rem;font-weight:500;color:#6366f1"
									>{comment.author?.username ??
										'Unknown'}</span
								>
								<div
									style="display:flex;align-items:center;gap:0.5rem"
								>
									<span
										style="font-size:0.75rem;color:#94a3b8"
										>{new Date(
											comment.createdAt,
										).toLocaleString()}</span
									>
									<button
										onclick={() =>
											deleteComment(comment.id)}
										style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:0.8rem;padding:0"
										>Delete</button
									>
								</div>
							</div>
							<p
								style="margin:0;font-size:0.875rem;color:#374151;white-space:pre-wrap"
							>
								{comment.content}
							</p>
						</div>
					{/each}
				</div>
			{:else}
				<p style="color:#94a3b8;font-size:0.875rem;margin:0 0 0.75rem">
					No comments yet.
				</p>
			{/if}
			<form onsubmit={postComment} style="display:flex;gap:0.5rem">
				<input
					type="text"
					bind:value={newComment}
					placeholder="Add a comment…"
					style="flex:1;padding:0.5rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem"
				/>
				<button
					type="submit"
					disabled={addingComment}
					style="padding:0.5rem 0.9rem;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:{addingComment
						? 'not-allowed'
						: 'pointer'};opacity:{addingComment
						? 0.7
						: 1};font-size:0.875rem">Post</button
				>
			</form>
		</div>
	</div>
{:else}
	<p style="color:#64748b">Task not found.</p>
{/if}
