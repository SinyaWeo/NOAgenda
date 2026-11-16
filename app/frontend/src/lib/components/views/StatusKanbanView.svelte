<script lang="ts">
  import { PRIORITY_SHORT } from '$lib/constants';
  import type { Task } from '$lib/types';
  import type { KanbanColumn } from '$lib/types-views';

  interface Props {
    tasks: Task[];
    columns: KanbanColumn[];
  }
  let { tasks, columns }: Props = $props();
</script>

<div class="board-cols">
  {#each columns as col (col.key)}
    {@const colTasks = tasks.filter((t) => t.status === col.key)}
    <div class="board-col">
      <div class="board-col-header">
        <h3
          class="text-sm font-semibold text-gray-700 dark:text-gray-300 m-0"
        >
          {col.label}
        </h3>
        <span class="text-xs text-gray-400">{colTasks.length}</span>
      </div>
      <div class="board-col-body">
        {#each colTasks as task (task.id)}
          <div class="board-card mb-2">
            <a
              href="/tasks/{task.id}"
              class="font-medium text-sm text-gray-800 dark:text-gray-200 hover:underline"
              >{task.title}</a
            >
            {#if task.dueDate}
              {@const overdue =
                new Date(task.dueDate) < new Date() && task.status !== 'done'}
              <div
                class="text-xs {overdue
                  ? 'text-red-500'
                  : 'text-gray-400'} mt-1"
              >
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            {/if}
            {#if task.priority && task.priority > 0}<div
                class="text-xs text-gray-400 mt-0.5"
              >
                {PRIORITY_SHORT[task.priority]}
              </div>{/if}
          </div>
        {/each}
        {#if !colTasks.length}
          <p class="text-xs text-gray-400 text-center m-0">Empty</p>
        {/if}
      </div>
    </div>
  {/each}
</div>
