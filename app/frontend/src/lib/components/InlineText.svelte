<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button, Input, Textarea } from 'flowbite-svelte';
	import { EditOutline } from 'flowbite-svelte-icons';
	import { t } from '$lib/i18n';

	interface Props {
		value: string;
		/** Saves the new value; resolve to false to stay in edit mode (e.g. the save failed). */
		onSave: (value: string) => Promise<boolean | void> | boolean | void;
		/** What the pencil button says to screen readers, e.g. "Edit description". */
		label: string;
		multiline?: boolean;
		/** An empty value is not allowed (e.g. a title). */
		required?: boolean;
		maxlength?: number;
		/** The value as displayed; defaults to plain text. */
		display?: Snippet;
		/** Shown instead of the value while it is empty. */
		emptyText?: string;
	}
	let {
		value,
		onSave,
		label,
		multiline = false,
		required = false,
		maxlength,
		display,
		emptyText = ''
	}: Props = $props();

	let editing = $state(false);
	let draft = $state('');
	let saving = $state(false);

	function start() {
		draft = value;
		editing = true;
	}

	async function save(e: Event) {
		e.preventDefault();
		const next = multiline ? draft : draft.trim();
		if ((required && !next.trim()) || saving) return;
		if (next === value) {
			editing = false;
			return;
		}
		saving = true;
		try {
			if ((await onSave(next)) !== false) editing = false;
		} finally {
			saving = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') editing = false;
	}
</script>

{#if editing}
	<form onsubmit={save} class="flex flex-col gap-2 w-full">
		{#if multiline}
			<Textarea bind:value={draft} rows={5} {maxlength} aria-label={label} autofocus onkeydown={onKeydown} />
		{:else}
			<Input bind:value={draft} {required} {maxlength} aria-label={label} autofocus onkeydown={onKeydown} />
		{/if}
		<div class="flex gap-2">
			<Button type="submit" size="xs" disabled={saving || (required && !draft.trim())}>
				{saving ? $t('common.saving') : $t('common.save')}
			</Button>
			<Button type="button" size="xs" color="light" onclick={() => (editing = false)}>
				{$t('common.cancel')}
			</Button>
		</div>
	</form>
{:else}
	<div class="flex items-start gap-2 min-w-0">
		<div class="min-w-0">
			{#if display}
				{@render display()}
			{:else if value}
				<span class="block whitespace-pre-wrap break-words">{value}</span>
			{:else}
				<span class="block text-gray-500 dark:text-gray-400 italic">{emptyText}</span>
			{/if}
		</div>
		<button
			type="button"
			class="shrink-0 p-1 rounded text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
			aria-label={label}
			title={label}
			onclick={start}
		>
			<EditOutline class="w-4 h-4" />
		</button>
	</div>
{/if}
