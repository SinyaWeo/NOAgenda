<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Checkbox, Dropdown, DropdownItem, Input } from 'flowbite-svelte';
	import { EditOutline, ForwardOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import { apiDeleteAuth, apiGetAuth, apiPatchAuth, apiPostAuth } from '$lib/api';
	import { confirmDialog } from '$lib/confirm';
	import { errMessage } from '$lib/errors';
	import { showToast } from '$lib/toast';
	import { t } from '$lib/i18n';
	import type { Note, NoteTarget } from '$lib/types-misc';

	/** Called after a note became a project/task/idea, so the page can refresh what it shows. */
	let { onconverted }: { onconverted?: () => void } = $props();

	const MAX_LEN = 255;
	const SHOW_DONE_KEY = 'noagenda.notes.showDone';

	let notes = $state<Note[]>([]);
	let loaded = $state(false);
	let text = $state('');
	let adding = $state(false);
	let editingId = $state<number | null>(null);
	let editText = $state('');
	let showDone = $state(false);

	let open = $derived(notes.filter((n) => !n.done));
	let done = $derived(notes.filter((n) => n.done));

	const targets: NoteTarget[] = ['task', 'project', 'idea'];

	onMount(() => {
		try {
			showDone = localStorage.getItem(SHOW_DONE_KEY) === '1';
		} catch {
			/* storage unavailable: keep the default */
		}
		void load();
	});

	async function load() {
		try {
			notes = await apiGetAuth<Note[]>('/notes');
		} catch (e) {
			showToast(errMessage(e, $t('dashboard.notes.loadFailed')), 'error');
		} finally {
			loaded = true;
		}
	}

	function toggleShowDone() {
		showDone = !showDone;
		try {
			localStorage.setItem(SHOW_DONE_KEY, showDone ? '1' : '0');
		} catch {
			/* ignore */
		}
	}

	async function add() {
		const value = text.trim();
		if (!value || adding) return;
		adding = true;
		try {
			const note = await apiPostAuth<Note>('/notes', { text: value });
			notes = [...notes.filter((n) => !n.done), note, ...notes.filter((n) => n.done)];
			text = '';
		} catch (e) {
			showToast(errMessage(e, $t('dashboard.notes.addFailed')), 'error');
		} finally {
			adding = false;
		}
	}

	function replace(note: Note) {
		notes = notes.map((n) => (n.id === note.id ? note : n));
	}

	async function setDone(note: Note, value: boolean) {
		try {
			const saved = await apiPatchAuth<Note>(`/notes/${note.id}`, { done: value });
			// Keep the order the server returns: open first, then completed (latest first).
			notes = value
				? [...notes.filter((n) => !n.done && n.id !== note.id), saved, ...notes.filter((n) => n.done)]
				: [...notes.filter((n) => !n.done), saved, ...notes.filter((n) => n.done && n.id !== note.id)];
		} catch (e) {
			showToast(errMessage(e, $t('dashboard.notes.saveFailed')), 'error');
			await load();
		}
	}

	function startEdit(note: Note) {
		editingId = note.id;
		editText = note.text;
	}

	async function saveEdit(note: Note) {
		const value = editText.trim();
		editingId = null;
		if (!value || value === note.text) return;
		try {
			replace(await apiPatchAuth<Note>(`/notes/${note.id}`, { text: value }));
		} catch (e) {
			showToast(errMessage(e, $t('dashboard.notes.saveFailed')), 'error');
		}
	}

	function onEditKey(e: KeyboardEvent, note: Note) {
		if (e.key === 'Enter') {
			e.preventDefault();
			void saveEdit(note);
		} else if (e.key === 'Escape') editingId = null;
	}

	async function remove(note: Note) {
		try {
			await apiDeleteAuth(`/notes/${note.id}`);
			notes = notes.filter((n) => n.id !== note.id);
		} catch (e) {
			showToast(errMessage(e, $t('dashboard.notes.deleteFailed')), 'error');
		}
	}

	async function clearDone() {
		if (!(await confirmDialog($t('dashboard.notes.clearConfirm')))) return;
		try {
			await apiDeleteAuth('/notes/completed');
			notes = notes.filter((n) => !n.done);
		} catch (e) {
			showToast(errMessage(e, $t('dashboard.notes.deleteFailed')), 'error');
		}
	}

	async function convert(note: Note, to: NoteTarget) {
		try {
			await apiPostAuth(`/notes/${note.id}/convert`, { to });
			notes = notes.filter((n) => n.id !== note.id);
			showToast($t(`dashboard.notes.converted.${to}`));
			onconverted?.();
		} catch (e) {
			showToast(errMessage(e, $t('dashboard.notes.convertFailed')), 'error');
		}
	}
</script>

{#snippet row(note: Note)}
	<li class="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
		<Checkbox
			checked={note.done}
			onchange={(e) => setDone(note, (e.currentTarget as HTMLInputElement).checked)}
			aria-label={note.text}
			class="shrink-0"
		/>
		{#if editingId === note.id}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				bind:value={editText}
				maxlength={MAX_LEN}
				onkeydown={(e) => onEditKey(e, note)}
				onblur={() => saveEdit(note)}
				aria-label={$t('common.edit')}
				autofocus
				class="flex-1 min-w-0 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-2 py-1"
			/>
		{:else}
			<span
				class="flex-1 min-w-0 text-sm break-words {note.done
					? 'line-through text-gray-400 dark:text-gray-500'
					: 'text-gray-800 dark:text-gray-200'}"
			>
				{note.text}
			</span>
			{#if note.done}
				<button
					type="button"
					class="shrink-0 p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
					title={$t('common.delete')}
					aria-label={$t('common.delete')}
					onclick={() => remove(note)}
				>
					<TrashBinOutline class="w-4 h-4" />
				</button>
			{:else}
				<button
					type="button"
					class="shrink-0 p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					title={$t('common.edit')}
					aria-label={$t('common.edit')}
					onclick={() => startEdit(note)}
				>
					<EditOutline class="w-4 h-4" />
				</button>
				<button
					type="button"
					id="note-convert-{note.id}"
					class="shrink-0 p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					title={$t('dashboard.notes.convert')}
					aria-label={$t('dashboard.notes.convert')}
				>
					<ForwardOutline class="w-4 h-4" />
				</button>
				<Dropdown triggeredBy="#note-convert-{note.id}" placement="bottom-end" class="w-44">
					{#each targets as to (to)}
						<DropdownItem onclick={() => convert(note, to)}>
							{$t(`dashboard.notes.convertTo.${to}`)}
						</DropdownItem>
					{/each}
				</Dropdown>
			{/if}
		{/if}
	</li>
{/snippet}

<Card class="max-w-none h-full">
	<h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">{$t('dashboard.notes.title')}</h2>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			void add();
		}}
		class="mb-3"
	>
		<Input
			type="text"
			bind:value={text}
			maxlength={MAX_LEN}
			disabled={adding}
			placeholder={$t('dashboard.notes.placeholder')}
			aria-label={$t('dashboard.notes.placeholder')}
			class="w-full"
		/>
	</form>

	{#if loaded && open.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400 m-0">{$t('dashboard.notes.empty')}</p>
	{/if}
	<ul class="list-none p-0 m-0">
		{#each open as note (note.id)}{@render row(note)}{/each}
	</ul>

	{#if done.length > 0}
		<div class="flex items-center justify-between mt-3">
			<button
				type="button"
				class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
				aria-expanded={showDone}
				onclick={toggleShowDone}
			>
				{showDone
					? $t('dashboard.notes.hideCompleted', { count: done.length })
					: $t('dashboard.notes.showCompleted', { count: done.length })}
			</button>
			{#if showDone}
				<button
					type="button"
					class="text-sm text-gray-500 dark:text-gray-400 hover:underline"
					onclick={clearDone}
				>
					{$t('dashboard.notes.clearCompleted')}
				</button>
			{/if}
		</div>
		{#if showDone}
			<ul class="list-none p-0 m-0 mt-1">
				{#each done as note (note.id)}{@render row(note)}{/each}
			</ul>
		{/if}
	{/if}
</Card>
