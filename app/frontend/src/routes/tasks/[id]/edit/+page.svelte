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

<h1 style="margin-bottom:1.5rem">Edit Task</h1>
{#if $loading}
	<p>Loading...</p>
{:else}
	{#if $error}<p
			style="color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:0.6rem 1rem;margin-bottom:1rem"
		>
			{$error}
		</p>{/if}
	<form
		onsubmit={handleEdit}
		style="max-width:600px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,0.04);display:flex;flex-direction:column;gap:1rem"
	>
		<div style="display:flex;flex-direction:column;gap:0.3rem">
			<label
				for="edit-title"
				style="font-size:0.85rem;font-weight:500;color:#475569"
				>Title <span style="color:#ef4444">*</span></label
			>
			<input
				id="edit-title"
				type="text"
				bind:value={$title}
				required
				style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem"
			/>
		</div>
		<div style="display:flex;flex-direction:column;gap:0.3rem">
			<label
				for="edit-desc"
				style="font-size:0.85rem;font-weight:500;color:#475569"
				>Description</label
			>
			<textarea
				id="edit-desc"
				bind:value={$description}
				rows={3}
				style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem;resize:vertical"
			></textarea>
		</div>
		<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
			<div style="display:flex;flex-direction:column;gap:0.3rem">
				<label
					for="edit-start"
					style="font-size:0.85rem;font-weight:500;color:#475569"
					>Start Date</label
				>
				<input
					id="edit-start"
					type="date"
					bind:value={$startDate}
					style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem"
				/>
			</div>
			<div style="display:flex;flex-direction:column;gap:0.3rem">
				<label
					for="edit-due"
					style="font-size:0.85rem;font-weight:500;color:#475569"
					>Due Date</label
				>
				<input
					id="edit-due"
					type="date"
					bind:value={$dueDate}
					style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem"
				/>
			</div>
			<div style="display:flex;flex-direction:column;gap:0.3rem">
				<label
					for="edit-priority"
					style="font-size:0.85rem;font-weight:500;color:#475569"
					>Priority</label
				>
				<select
					id="edit-priority"
					bind:value={$priority}
					style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem"
				>
					<option value={0}>— Unset</option>
					<option value={1}>Low</option>
					<option value={2}>Medium</option>
					<option value={3}>High</option>
					<option value={4}>Urgent</option>
					<option value={5}>Do Now</option>
				</select>
			</div>
			<div style="display:flex;flex-direction:column;gap:0.3rem">
				<label
					for="edit-percent"
					style="font-size:0.85rem;font-weight:500;color:#475569"
					>Percent Done</label
				>
				<select
					id="edit-percent"
					bind:value={$percentDone}
					style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem"
				>
					{#each [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as p}
						<option value={p}>{p}%</option>
					{/each}
				</select>
			</div>
		</div>
		<fieldset
			style="border:1px solid #e2e8f0;border-radius:6px;padding:0.875rem;margin:0"
		>
			<legend
				style="font-size:0.85rem;font-weight:500;color:#475569;padding:0 0.25rem"
				>Repeat</legend
			>
			<div
				style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap"
			>
				<span style="font-size:0.9rem;color:#475569">Every</span>
				<input
					type="number"
					bind:value={$repeatAfter}
					min="0"
					style="width:64px;padding:0.4rem 0.5rem;border:1px solid #e2e8f0;border-radius:4px"
				/>
				<select
					bind:value={$repeatMode}
					style="padding:0.4rem 0.5rem;border:1px solid #e2e8f0;border-radius:4px;font-size:0.9rem"
				>
					<option value="default">periods</option>
					<option value="monthly">months</option>
					<option value="from_current_date"
						>periods from current date</option
					>
				</select>
			</div>
		</fieldset>
		<div
			style="display:flex;gap:0.75rem;justify-content:flex-end;padding-top:0.5rem;border-top:1px solid #f1f5f9"
		>
			<a
				href="/tasks/{$page.params.id}"
				style="padding:0.5rem 1rem;border:1px solid #e2e8f0;border-radius:6px;text-decoration:none;color:#475569;font-size:0.9rem"
				>Cancel</a
			>
			<button
				type="submit"
				disabled={$saving}
				style="background:#6366f1;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:6px;cursor:pointer;font-size:0.9rem"
				>{$saving ? 'Saving…' : 'Save Changes'}</button
			>
		</div>
	</form>
{/if}
