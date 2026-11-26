<script lang="ts">
	import { Checkbox, Input, Label, Select } from 'flowbite-svelte';
	import { t, type MessageKey } from '#lib/i18n/index.js';
	import type { DuePreset, FilterCriteria, NodeStatus } from '#lib/types.js';
	import type { ProjectOption } from '#lib/types-views.js';

	interface Props {
		criteria: FilterCriteria;
		projects: ProjectOption[];
		/** Prefix for element ids so several editors can live on one page. */
		idPrefix?: string;
	}
	let { criteria = $bindable(), projects, idPrefix = 'crit' }: Props = $props();

	function patch(change: Partial<FilterCriteria>) {
		criteria = { ...criteria, ...change };
	}
	function selValue(e: Event): string {
		return (e.target as HTMLSelectElement).value;
	}
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
	<div>
		<Label for="{idPrefix}-status" class="mb-1 text-xs">{t('common.field.status')}</Label>
		<Select
			placeholder=""
			id="{idPrefix}-status"
			value={criteria.status ?? ''}
			onchange={(e) => patch({ status: (selValue(e) || undefined) as NodeStatus | undefined })}
		>
			<option value="">{t('filters.editor.anyStatus')}</option>
			<option value="open">{t('common.status.open')}</option>
			<option value="in_progress">{t('common.status.in_progress')}</option>
			<option value="done">{t('common.status.done')}</option>
		</Select>
	</div>
	<div>
		<Label for="{idPrefix}-priority" class="mb-1 text-xs">{t('common.field.priority')}</Label>
		<Select
			placeholder=""
			id="{idPrefix}-priority"
			value={criteria.priority !== undefined ? String(criteria.priority) : ''}
			onchange={(e) => patch({ priority: selValue(e) === '' ? undefined : Number(selValue(e)) })}
		>
			<option value="">{t('filters.editor.anyPriority')}</option>
			{#each [1, 2, 3, 4, 5] as i (i)}
				<option value={String(i)}>{t(`common.priority.${i}` as MessageKey)}</option>
			{/each}
		</Select>
	</div>
	<div>
		<Label for="{idPrefix}-project" class="mb-1 text-xs">{t('common.field.project')}</Label>
		<Select
			placeholder=""
			id="{idPrefix}-project"
			value={criteria.projectId !== undefined ? String(criteria.projectId) : ''}
			onchange={(e) => patch({ projectId: selValue(e) === '' ? undefined : Number(selValue(e)) })}
		>
			<option value="">{t('filters.editor.anyProject')}</option>
			{#each projects as p (p.id)}<option value={String(p.id)}>{p.name}</option>{/each}
		</Select>
	</div>
	<div>
		<Label for="{idPrefix}-search" class="mb-1 text-xs">{t('filters.editor.searchText')}</Label>
		<Input
			id="{idPrefix}-search"
			type="text"
			value={criteria.search ?? ''}
			oninput={(e) => patch({ search: (e.target as HTMLInputElement).value || undefined })}
			placeholder={t('filters.editor.searchPlaceholder')}
		/>
	</div>
	<div>
		<Label for="{idPrefix}-due" class="mb-1 text-xs">{t('common.field.dueDate')}</Label>
		<Select
			placeholder=""
			id="{idPrefix}-due"
			value={criteria.due ?? ''}
			onchange={(e) => patch({ due: (selValue(e) || undefined) as DuePreset | undefined })}
		>
			<option value="">{t('filters.editor.anyTime')}</option>
			<option value="overdue">{t('filters.editor.due.overdue')}</option>
			<option value="today">{t('filters.editor.due.today')}</option>
			<option value="week">{t('filters.editor.due.week')}</option>
			<option value="month">{t('filters.editor.due.month')}</option>
			<option value="none">{t('filters.editor.due.none')}</option>
		</Select>
	</div>
	<div class="flex items-end pb-2">
		<Checkbox
			checked={!!criteria.hideDone}
			onchange={(e) => patch({ hideDone: (e.target as HTMLInputElement).checked || undefined })}
		>
			{t('filters.editor.hideDone')}
		</Checkbox>
	</div>
</div>
