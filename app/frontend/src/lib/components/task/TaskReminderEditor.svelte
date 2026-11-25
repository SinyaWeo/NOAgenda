<script lang="ts" module>
	export type NewReminder = { reminderDate: string } | { daysBefore: number; atTime: string };
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { t } from '$lib/i18n';
	import type { Reminder } from '$lib/types';
	import { Button, Input, Select } from 'flowbite-svelte';

	let {
		reminders,
		hasDueDate,
		describe,
		onAdd,
		onDelete
	}: {
		reminders: Reminder[];
		/** The task has a due date, so reminders relative to it can be added. */
		hasDueDate: boolean;
		/** How a reminder reads (the same as in the field's value). */
		describe: Snippet<[Reminder]>;
		onAdd: (reminder: NewReminder) => Promise<boolean>;
		onDelete: (id: number) => void;
	} = $props();

	const LABEL = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1';

	let kind = $state<'date' | 'before'>('date');
	let reminderDate = $state('');
	let daysBefore = $state(1);
	let atTime = $state('09:00');
	let saving = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (saving) return;
		let reminder: NewReminder;
		if (kind === 'before') {
			if (!hasDueDate || !atTime || !Number.isInteger(daysBefore) || daysBefore < 0) return;
			reminder = { daysBefore, atTime };
		} else {
			if (!reminderDate) return;
			reminder = { reminderDate: new Date(reminderDate).toISOString() };
		}
		saving = true;
		try {
			if ((await onAdd(reminder)) && kind === 'date') reminderDate = '';
		} finally {
			saving = false;
		}
	}
</script>

{#if reminders.length}
	<ul class="m-0 p-0 list-none flex flex-col gap-1">
		{#each reminders as rem (rem.id)}
			<li class="flex items-start gap-2 text-sm">
				<span class="flex-1 min-w-0 text-gray-700 dark:text-gray-300">
					{@render describe(rem)}
				</span>
				<button
					type="button"
					class="shrink-0 bg-transparent border-0 p-0 leading-none cursor-pointer text-gray-500 dark:text-gray-400 hover:text-red-600"
					aria-label={$t('tasks.reminders.remove')}
					title={$t('tasks.reminders.remove')}
					onclick={() => onDelete(rem.id)}
				>
					✕
				</button>
			</li>
		{/each}
	</ul>
{/if}
<form onsubmit={submit} class="flex flex-col gap-2">
	<div>
		<label for="reminder-kind" class={LABEL}>{$t('tasks.reminders.kind')}</label>
		<Select id="reminder-kind" placeholder="" size="sm" bind:value={kind}>
			<option value="date">{$t('tasks.reminders.kindDate')}</option>
			<option value="before" disabled={!hasDueDate}>{$t('tasks.reminders.kindBefore')}</option>
		</Select>
	</div>
	{#if kind === 'before'}
		<div class="flex gap-2">
			<div class="w-20">
				<label for="reminder-days" class={LABEL}>{$t('tasks.reminders.daysBefore')}</label>
				<Input id="reminder-days" type="number" size="sm" min="0" max="365" bind:value={daysBefore} />
			</div>
			<div class="flex-1">
				<label for="reminder-time" class={LABEL}>{$t('tasks.reminders.atTime')}</label>
				<Input id="reminder-time" type="time" size="sm" bind:value={atTime} required />
			</div>
		</div>
	{:else}
		<div>
			<label for="reminder-date" class={LABEL}>{$t('tasks.reminders.date')}</label>
			<Input id="reminder-date" type="datetime-local" size="sm" bind:value={reminderDate} />
		</div>
	{/if}
	{#if !hasDueDate}
		<p class="text-xs text-gray-500 dark:text-gray-400 m-0">{$t('tasks.reminders.needsDueDate')}</p>
	{/if}
	<p class="text-xs text-gray-500 dark:text-gray-400 m-0">{$t('tasks.reminders.hint')}</p>
	<div>
		<Button type="submit" size="xs" disabled={saving}>{$t('common.add')}</Button>
	</div>
</form>
