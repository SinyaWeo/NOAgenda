<script lang="ts">
  import { Checkbox, Input, Label, Select } from 'flowbite-svelte';
  import { PRIORITY_LABELS } from '$lib/constants';
  import type { DuePreset, FilterCriteria, NodeStatus } from '$lib/types';
  import type { ProjectOption } from '$lib/types-views';

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
    <Label for="{idPrefix}-status" class="mb-1 text-xs">Status</Label>
    <Select
      id="{idPrefix}-status"
      value={criteria.status ?? ''}
      onchange={(e) => patch({ status: (selValue(e) || undefined) as NodeStatus | undefined })}
    >
      <option value="">Any status</option>
      <option value="open">Open</option>
      <option value="in_progress">In Progress</option>
      <option value="done">Done</option>
    </Select>
  </div>
  <div>
    <Label for="{idPrefix}-priority" class="mb-1 text-xs">Priority</Label>
    <Select
      id="{idPrefix}-priority"
      value={criteria.priority !== undefined ? String(criteria.priority) : ''}
      onchange={(e) => patch({ priority: selValue(e) === '' ? undefined : Number(selValue(e)) })}
    >
      <option value="">Any priority</option>
      {#each PRIORITY_LABELS as label, i (i)}
        {#if i > 0}<option value={String(i)}>{label}</option>{/if}
      {/each}
    </Select>
  </div>
  <div>
    <Label for="{idPrefix}-project" class="mb-1 text-xs">Project</Label>
    <Select
      id="{idPrefix}-project"
      value={criteria.projectId !== undefined ? String(criteria.projectId) : ''}
      onchange={(e) => patch({ projectId: selValue(e) === '' ? undefined : Number(selValue(e)) })}
    >
      <option value="">Any project</option>
      {#each projects as p (p.id)}<option value={String(p.id)}>{p.name}</option>{/each}
    </Select>
  </div>
  <div>
    <Label for="{idPrefix}-search" class="mb-1 text-xs">Search text</Label>
    <Input
      id="{idPrefix}-search"
      type="text"
      value={criteria.search ?? ''}
      oninput={(e) => patch({ search: (e.target as HTMLInputElement).value || undefined })}
      placeholder="Title contains…"
    />
  </div>
  <div>
    <Label for="{idPrefix}-due" class="mb-1 text-xs">Due date</Label>
    <Select
      id="{idPrefix}-due"
      value={criteria.due ?? ''}
      onchange={(e) => patch({ due: (selValue(e) || undefined) as DuePreset | undefined })}
    >
      <option value="">Any time</option>
      <option value="overdue">Overdue</option>
      <option value="today">Today</option>
      <option value="week">Next 7 days</option>
      <option value="month">Next 30 days</option>
      <option value="none">No due date</option>
    </Select>
  </div>
  <div class="flex items-end pb-2">
    <Checkbox
      checked={!!criteria.hideDone}
      onchange={(e) => patch({ hideDone: (e.target as HTMLInputElement).checked || undefined })}
      >Hide done</Checkbox
    >
  </div>
</div>
