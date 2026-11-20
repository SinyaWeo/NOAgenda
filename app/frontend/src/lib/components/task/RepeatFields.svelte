<script lang="ts">
	import { t } from '$lib/i18n';
	import { REPEAT_KINDS, toggleWeekday, weekdayName, type RepeatEnd, type RepeatForm } from '$lib/repeat';
	import { Input, Select } from 'flowbite-svelte';

	let { form = $bindable() }: { form: RepeatForm } = $props();

	const kindLabel = (kind: (typeof REPEAT_KINDS)[number]) =>
		({
			none: $t('tasks.repeat.kind.none'),
			default: $t('tasks.repeat.periods'),
			weekly: $t('tasks.repeat.kind.weekly'),
			monthly: $t('tasks.repeat.months'),
			monthly_weekday: $t('tasks.repeat.kind.monthlyWeekday'),
			month_end: $t('tasks.repeat.kind.monthEnd'),
			from_current_date: $t('tasks.repeat.fromCurrent')
		})[kind];

	const ENDS: RepeatEnd[] = ['never', 'until', 'count'];
	const endLabel = (end: RepeatEnd) => $t(`tasks.repeat.end.${end}`);
	const repeats = $derived(form.kind !== 'none');
</script>

<fieldset class="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
	<legend class="text-sm font-medium text-gray-700 dark:text-gray-300 px-1"
		>{$t('tasks.repeat.legend')}</legend
	>
	<div class="flex items-center gap-2 flex-wrap">
		{#if repeats}<span class="text-sm text-gray-500">{$t('tasks.repeat.every')}</span>
			<Input
				type="number"
				bind:value={form.every}
				min={1}
				max={1000}
				class="w-20"
				aria-label={$t('tasks.repeat.every')}
			/>{/if}
		<Select bind:value={form.kind} class="w-auto" aria-label={$t('tasks.repeat.legend')}>
			{#each REPEAT_KINDS as kind (kind)}<option value={kind}>{kindLabel(kind)}</option>{/each}
		</Select>
	</div>

	{#if form.kind === 'weekly'}
		<div class="mt-3">
			<div class="flex items-center gap-2 flex-wrap" role="group" aria-label={$t('tasks.repeat.weekdays')}>
				<span class="text-sm text-gray-500">{$t('tasks.repeat.weekdays')}</span>
				{#each [1, 2, 3, 4, 5, 6, 7] as day (day)}
					<button
						type="button"
						aria-pressed={form.weekdays.includes(day)}
						onclick={() => (form.weekdays = toggleWeekday(form.weekdays, day))}
						class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors {form.weekdays.includes(
							day
						)
							? 'bg-primary-600 border-primary-600 text-white'
							: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
						>{weekdayName(day)}</button
					>
				{/each}
			</div>
			<p class="text-xs text-gray-400 mt-1 mb-0">{$t('tasks.repeat.weekdaysHint')}</p>
		</div>
	{/if}

	{#if repeats}
		<div class="flex items-center gap-2 flex-wrap mt-3">
			<span class="text-sm text-gray-500">{$t('tasks.repeat.ends')}</span>
			<Select bind:value={form.end} class="w-auto" aria-label={$t('tasks.repeat.ends')}>
				{#each ENDS as end (end)}<option value={end}>{endLabel(end)}</option>{/each}
			</Select>
			{#if form.end === 'until'}
				<Input type="date" bind:value={form.until} class="w-auto" aria-label={$t('tasks.repeat.end.until')} />
			{:else if form.end === 'count'}
				<Input
					type="number"
					bind:value={form.count}
					min={1}
					max={100000}
					class="w-24"
					aria-label={$t('tasks.repeat.end.count')}
				/>
				<span class="text-sm text-gray-500">{$t('tasks.repeat.occurrences')}</span>
			{/if}
		</div>
		<p class="text-xs text-gray-400 mt-3 mb-0">{$t('tasks.repeat.hint')}</p>
	{/if}
</fieldset>
