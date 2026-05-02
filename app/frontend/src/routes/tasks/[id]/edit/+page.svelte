<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiGetAuth, apiPutAuth } from '$lib/api';
	import { getCurrentUser } from '$lib/auth';
	import { writable } from 'svelte/store';

	const title = writable('');
	const description = writable('');
	const dueDate = writable('');
	const startDate = writable('');
	const priority = writable(0);
	const percentDone = writable(0);
	const repeatAfter = writable(0);
	const repeatMode = writable('default');
	const error = writable('');
	const loading = writable(true);
	const saving = writable(false);

	onMount(async () => {
		const me = await getCurrentUser();
		if (!me) {
			goto('/login');
			return;
		}
		try {
			const task = await apiGetAuth<any>(`/tasks/${$page.params.id}`);
			title.set(task.title ?? '');
			description.set(task.description ?? '');
			dueDate.set(task.dueDate ? task.dueDate.substring(0, 10) : '');
			startDate.set(
				task.startDate ? task.startDate.substring(0, 10) : '',
			);
			priority.set(task.priority ?? 0);
			percentDone.set(task.percentDone ?? 0);
			repeatAfter.set(task.repeatAfter ?? 0);
			repeatMode.set(task.repeatMode ?? 'default');
		} catch (e: any) {
			error.set(e.message);
		} finally {
			loading.set(false);
		}
	});

	async function handleEdit(event: Event) {
		event.preventDefault();
		saving.set(true);
		error.set('');
		try {
			await apiPutAuth(`/tasks/${$page.params.id}`, {
				title: $title,
				description: $description,
				dueDate: $dueDate ? new Date($dueDate).toISOString() : null,
				startDate: $startDate
					? new Date($startDate).toISOString()
					: null,
				priority: $priority,
				percentDone: $percentDone,
				repeatAfter: $repeatAfter || null,
				repeatMode: $repeatAfter ? $repeatMode : null,
			});
			goto(`/tasks/${$page.params.id}`);
		} catch (e: any) {
			error.set(e.message);
		} finally {
			saving.set(false);
		}
	}
</script>

<a href="/tasks/{$page.params.id}" class="back-link"
	><span class="icon icon-sm">arrow_back</span> Back to Task</a
>
<h1 class="page-title mb-4">Edit Task</h1>
{#if $loading}
	<p class="text-muted">Loading...</p>
{:else}
	{#if $error}<div class="alert alert-error mb-4">{$error}</div>{/if}
	<form onsubmit={handleEdit} class="card" style="max-width:600px">
		<div class="card-body">
			<div class="form-group">
				<label for="edit-title" class="form-label"
					>Title <span class="text-danger">*</span></label
				>
				<input
					id="edit-title"
					type="text"
					bind:value={$title}
					required
					class="form-input"
				/>
			</div>
			<div class="form-group">
				<label for="edit-desc" class="form-label">Description</label>
				<textarea
					id="edit-desc"
					bind:value={$description}
					rows={3}
					class="form-textarea"
				></textarea>
			</div>
			<div class="form-row">
				<div class="form-group">
					<label for="edit-start" class="form-label">Start Date</label
					>
					<input
						id="edit-start"
						type="date"
						bind:value={$startDate}
						class="form-input"
					/>
				</div>
				<div class="form-group">
					<label for="edit-due" class="form-label">Due Date</label>
					<input
						id="edit-due"
						type="date"
						bind:value={$dueDate}
						class="form-input"
					/>
				</div>
				<div class="form-group">
					<label for="edit-priority" class="form-label"
						>Priority</label
					>
					<select
						id="edit-priority"
						bind:value={$priority}
						class="form-select"
					>
						<option value={0}>— Unset</option>
						<option value={1}>Low</option>
						<option value={2}>Medium</option>
						<option value={3}>High</option>
						<option value={4}>Urgent</option>
						<option value={5}>Do Now</option>
					</select>
				</div>
				<div class="form-group">
					<label for="edit-percent" class="form-label"
						>Percent Done</label
					>
					<select
						id="edit-percent"
						bind:value={$percentDone}
						class="form-select"
					>
						{#each [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as p}
							<option value={p}>{p}%</option>
						{/each}
					</select>
				</div>
			</div>
			<fieldset
				class="card mb-0"
				style="border:1px solid var(--na-border,#e2e8f0)"
			>
				<legend class="form-label" style="padding:0 0.25rem"
					>Repeat</legend
				>
				<div class="flex-center gap-2 flex-wrap">
					<span class="text-sm text-muted">Every</span>
					<input
						type="number"
						bind:value={$repeatAfter}
						min="0"
						class="form-input"
						style="width:64px"
					/>
					<select
						bind:value={$repeatMode}
						class="form-select"
						style="width:auto"
					>
						<option value="default">periods</option>
						<option value="monthly">months</option>
						<option value="from_current_date"
							>periods from current date</option
						>
					</select>
				</div>
			</fieldset>
		</div>
		<div
			class="page-actions"
			style="padding:1rem;border-top:1px solid var(--na-border,#f1f5f9)"
		>
			<a href="/tasks/{$page.params.id}" class="btn btn-secondary"
				>Cancel</a
			>
			<button type="submit" disabled={$saving} class="btn btn-primary"
				>{$saving ? 'Saving…' : 'Save Changes'}</button
			>
		</div>
	</form>
{/if}
