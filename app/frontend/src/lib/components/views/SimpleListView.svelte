<script lang="ts">
  import { PRIORITY_SHORT } from '$lib/constants';
  import type { Task } from '$lib/types';
  import { Card } from 'flowbite-svelte';
  import { CheckCircleOutline } from 'flowbite-svelte-icons';
  import { isOverdue } from './util';

  interface Props {
    tasks: Task[];
  }
  let { tasks }: Props = $props();
</script>

{#if tasks.length}
  <Card class="p-0 overflow-hidden">
    {#each tasks as task, i (task.id)}
      <div
        class="flex items-center gap-3 px-4 py-3 {i < tasks.length - 1
          ? 'border-b border-gray-100 dark:border-gray-700'
          : ''}"
      >
        <a
          href="/tasks/{task.id}"
          class="flex-1 font-medium text-gray-800 dark:text-gray-200 hover:underline"
          >{task.title}</a
        >
        <span
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
          data-status={task.status}>{task.status ?? 'open'}</span
        >
        {#if task.dueDate}<span
            class="text-xs shrink-0 {isOverdue(task)
              ? 'text-red-500'
              : 'text-gray-400'}"
            >{new Date(task.dueDate).toLocaleDateString()}</span
          >{/if}
        {#if task.priority}<span
            class="text-xs shrink-0"
            data-priority={task.priority ?? 0}
            >{PRIORITY_SHORT[task.priority] ?? ''}</span
          >{/if}
      </div>
    {/each}
  </Card>
{:else}
  <div class="text-center py-10 text-gray-400">
    <CheckCircleOutline class="w-10 h-10 mx-auto mb-2" />
    <p>No tasks in this project yet.</p>
  </div>
{/if}
