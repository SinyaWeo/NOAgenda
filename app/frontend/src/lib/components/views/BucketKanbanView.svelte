<script lang="ts">
  import type { KanbanBucket, Task } from '$lib/types';
  import type { BucketMoveHandler } from '$lib/types-views';
  import { Select } from 'flowbite-svelte';

  interface Props {
    tasks: Task[];
    buckets: KanbanBucket[];
    onMove: BucketMoveHandler;
  }
  let { tasks, buckets, onMove }: Props = $props();
</script>

{#if buckets.length}
  <div class="board-cols">
    {#each buckets as bucket (bucket.id)}
      {@const bucketTasks = tasks.filter((t) => t.bucketId === bucket.id)}
      <div class="board-col">
        <div class="board-col-header">
          <h3
            class="text-sm font-semibold text-gray-700 dark:text-gray-300 m-0"
          >
            {bucket.title}
          </h3>
        </div>
        <div class="board-col-body">
          {#each bucketTasks as task (task.id)}
            <div class="board-card mb-2">
              <a
                href="/tasks/{task.id}"
                class="font-medium text-sm text-gray-800 dark:text-gray-200 hover:underline"
                >{task.title}</a
              >
              {#if task.dueDate}<div class="text-xs text-gray-400">
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>{/if}
              <Select
                value={task.bucketId}
                onchange={(e) =>
                  onMove(
                    task.id,
                    Number((e.target as HTMLSelectElement).value),
                  )}
                class="mt-2 text-xs"
              >
                {#each buckets as b (b.id)}<option value={b.id}>{b.title}</option
                  >{/each}
              </Select>
            </div>
          {/each}
          {#if !bucketTasks.length}
            <p class="text-xs text-gray-400 text-center m-0">Empty</p>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="text-center py-10 text-gray-400">
    <p>No buckets configured for this kanban view.</p>
  </div>
{/if}
