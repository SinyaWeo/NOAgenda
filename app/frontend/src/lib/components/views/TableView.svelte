<script lang="ts">
  import { PRIORITY_SHORT, STATUS_LABELS } from '$lib/constants';
  import type { Task } from '$lib/types';
  import {
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
  } from 'flowbite-svelte';
  import { CheckCircleOutline } from 'flowbite-svelte-icons';
  import { isOverdue } from './util';

  interface Props {
    tasks: Task[];
    /** Show "In Progress" instead of the raw status value (the global task page does). */
    friendlyStatus?: boolean;
    /** Larger empty-state icon + the global page's wording. */
    large?: boolean;
  }
  let { tasks, friendlyStatus = false, large = false }: Props = $props();
</script>

{#if tasks.length}
  <Table>
    <TableHead>
      <TableHeadCell>#</TableHeadCell>
      <TableHeadCell>Title</TableHeadCell>
      <TableHeadCell>Status</TableHeadCell>
      <TableHeadCell>Priority</TableHeadCell>
      <TableHeadCell>Due Date</TableHeadCell>
      <TableHeadCell>Created</TableHeadCell>
    </TableHead>
    <TableBody>
      {#each tasks as task (task.id)}
        <TableBodyRow>
          <TableBodyCell class="text-gray-400">{task.id}</TableBodyCell>
          <TableBodyCell
            ><a
              href="/tasks/{task.id}"
              class="font-medium text-gray-800 dark:text-gray-200 hover:underline"
              >{task.title}</a
            ></TableBodyCell
          >
          <TableBodyCell
            ><span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              data-status={task.status}
              >{friendlyStatus
                ? ((task.status && STATUS_LABELS[task.status]) ?? task.status)
                : (task.status ?? '—')}</span
            ></TableBodyCell
          >
          <TableBodyCell class="text-gray-400"
            >{(task.priority != null && PRIORITY_SHORT[task.priority]) ||
              '—'}</TableBodyCell
          >
          <TableBodyCell
            class={isOverdue(task) ? 'text-red-500' : 'text-gray-400'}
            >{task.dueDate
              ? new Date(task.dueDate).toLocaleDateString()
              : '—'}</TableBodyCell
          >
          <TableBodyCell class="text-gray-400"
            >{task.createdAt
              ? new Date(task.createdAt).toLocaleDateString()
              : '—'}</TableBodyCell
          >
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>
{:else}
  <div class="text-center {large ? 'py-12' : 'py-10'} text-gray-400">
    {#if large}<CheckCircleOutline class="w-12 h-12 mx-auto mb-3" />{/if}
    <p>{large ? 'No tasks found.' : 'No tasks to display.'}</p>
  </div>
{/if}
