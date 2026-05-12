<script lang="ts">
  import { onMount } from 'svelte';
  import { derived, writable } from 'svelte/store';
  import { apiGetAuth, apiPostAuth, apiGet } from '$lib/api';
  import { authSession, initializeAuth } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { Alert, Badge, Button, Card, Input, Select } from 'flowbite-svelte';
  import {
    ExclamationCircleOutline,
    CaretRightSolid,
  } from 'flowbite-svelte-icons';
  import type { Quote } from '$lib/types';

  const user = derived(authSession, ($authSession) => $authSession.user);
  const projects = writable<any[]>([]);
  const upcomingTasks = writable<any[]>([]);
  const overdueTasks = writable<any[]>([]);
  const loading = writable(true);
  const quote = writable<Quote | null>(null);

  let quickTitle = $state('');
  let quickProjectId = $state('');
  let addingTask = $state(false);

  const STATUS_DOTS: Record<string, string> = {
    open: 'bg-indigo-500',
    in_progress: 'bg-amber-400',
    done: 'bg-green-500',
  };

  onMount(async () => {
    const me = $user ?? (await initializeAuth());
    if (!me) {
      goto('/user/login');
      return;
    }
    await refresh();
    try {
      const q = await apiGet<Quote | null>('/quotes/random');
      quote.set(q);
    } catch (_) {}
  });

  async function refresh() {
    try {
      const [p, t] = await Promise.all([
        apiGetAuth<any[]>('/projects'),
        apiGetAuth<any[]>('/tasks'),
      ]);
      projects.set(p.slice(0, 5));
      const now = new Date();
      const pending = t.filter((task: any) => task.status !== 'done');
      overdueTasks.set(
        pending
          .filter((task: any) => task.dueDate && new Date(task.dueDate) < now)
          .sort(
            (a: any, b: any) =>
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
          )
          .slice(0, 5),
      );
      upcomingTasks.set(
        pending
          .sort((a: any, b: any) => {
            const aOver = a.dueDate && new Date(a.dueDate) < now;
            const bOver = b.dueDate && new Date(b.dueDate) < now;
            if (aOver && !bOver) return -1;
            if (!aOver && bOver) return 1;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return (
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            );
          })
          .slice(0, 8),
      );
    } catch (_) {
    } finally {
      loading.set(false);
    }
  }

  async function quickAddTask() {
    if (!quickTitle.trim() || !quickProjectId) return;
    addingTask = true;
    try {
      await apiPostAuth('/tasks', {
        title: quickTitle,
        project: { id: Number(quickProjectId) },
      });
      quickTitle = '';
      await refresh();
    } catch (_) {
    } finally {
      addingTask = false;
    }
  }
</script>

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else}
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
    Welcome{$user?.name
      ? `, ${$user.name}`
      : $user?.username
        ? `, ${$user.username}`
        : ''}!
  </h1>
  <p class="text-gray-500 dark:text-gray-400 mt-0 mb-6">
    {new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}
  </p>

  {#if $quote}
    <blockquote
      class="relative bg-white dark:bg-gray-800 border-l-4 border-primary-500 rounded-lg px-5 py-4 mb-6 shadow-sm"
    >
      <p class="text-gray-700 dark:text-gray-200 italic m-0">“{$quote.text}”</p>
      {#if $quote.author}
        <footer class="mt-2 text-sm text-gray-400">— {$quote.author}</footer>
      {/if}
    </blockquote>
  {/if}

  <!-- Stat cards -->
  <div
    class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 mb-6 items-stretch"
  >
    <Card class="p-4 h-full">
      <p class="text-xs font-medium text-gray-500 uppercase tracking-wide m-0">
        Projects
      </p>
      <p class="text-4xl font-bold text-gray-900 dark:text-white mt-1 mb-1">
        {$projects.length}
      </p>
      <a
        href="/projects"
        class="text-xs text-primary-600 dark:text-primary-400 no-underline hover:underline"
        >View all <CaretRightSolid class="w-3 h-3 inline ml-0.5" /></a
      >
    </Card>
    <Card class="p-4 h-full">
      <p class="text-xs font-medium text-gray-500 uppercase tracking-wide m-0">
        Upcoming
      </p>
      <p class="text-4xl font-bold text-gray-900 dark:text-white mt-1 mb-1">
        {$upcomingTasks.length}
      </p>
      <a
        href="/upcoming"
        class="text-xs text-primary-600 dark:text-primary-400 no-underline hover:underline"
        >View all <CaretRightSolid class="w-3 h-3 inline ml-0.5" /></a
      >
    </Card>
    {#if $overdueTasks.length > 0}
      <Card
        class="p-4 h-full border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
      >
        <p
          class="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide m-0"
        >
          Overdue
        </p>
        <p class="text-4xl font-bold text-red-600 dark:text-red-400 mt-1 mb-1">
          {$overdueTasks.length}
        </p>
        <a
          href="/upcoming"
          class="text-xs text-red-500 no-underline hover:underline"
          >Review <CaretRightSolid class="w-3 h-3 inline ml-0.5" /></a
        >
      </Card>
    {/if}
  </div>

  <!-- Quick-add task -->
  {#if $projects.length > 0}
    <Card class="mb-4">
      <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
        Quick Add Task
      </h2>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          quickAddTask();
        }}
        class="flex gap-2 flex-wrap"
      >
        <Input
          type="text"
          bind:value={quickTitle}
          placeholder="Task title…"
          class="flex-1 min-w-36"
        />
        <Select bind:value={quickProjectId} class="flex-1 min-w-36">
          <option value="">Select project…</option>
          {#each $projects as p}<option value={p.id}>{p.name}</option>{/each}
        </Select>
        <Button
          type="submit"
          disabled={addingTask || !quickTitle.trim() || !quickProjectId}
        >
          {addingTask ? 'Adding…' : '+ Add'}
        </Button>
      </form>
    </Card>
  {/if}

  <div class="grid grid-cols-2 gap-6 items-stretch">
    <!-- Overdue -->
    {#if $overdueTasks.length > 0}
      <Card
        class="h-full border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10"
      >
        <div class="flex items-center gap-2 mb-3">
          <ExclamationCircleOutline class="w-4 h-4 text-red-500" />
          <h2
            class="text-base font-semibold text-red-600 dark:text-red-400 m-0"
          >
            Overdue
          </h2>
        </div>
        {#each $overdueTasks as task}
          <div
            class="flex justify-between items-center py-1.5 border-b border-red-100 dark:border-red-800 last:border-0"
          >
            <a
              href="/tasks/{task.id}"
              class="text-sm truncate text-gray-800 dark:text-gray-200 hover:underline"
              >{task.title}</a
            >
            <span class="text-xs text-red-500 shrink-0 ml-2"
              >{new Date(task.dueDate).toLocaleDateString()}</span
            >
          </div>
        {/each}
      </Card>
    {/if}

    <!-- Upcoming tasks -->
    <Card class={$overdueTasks.length === 0 ? 'col-span-2 h-full' : 'h-full'}>
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white m-0">
          Upcoming Tasks
        </h2>
        <a
          href="/upcoming"
          class="text-sm text-primary-600 dark:text-primary-400 no-underline hover:underline"
          >View all <CaretRightSolid class="w-3 h-3 inline ml-0.5" /></a
        >
      </div>
      {#if $upcomingTasks.length === 0}
        <p class="text-gray-400 text-sm m-0">No pending tasks.</p>
      {:else}
        {#each $upcomingTasks as task}
          {@const isOverdue =
            task.dueDate && new Date(task.dueDate) < new Date()}
          <div
            class="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <span
              class="w-2 h-2 rounded-full shrink-0 {STATUS_DOTS[task.status] ??
                'bg-gray-400'}"
            ></span>
            <a
              href="/tasks/{task.id}"
              class="text-sm flex-1 truncate text-gray-800 dark:text-gray-200 hover:underline"
              >{task.title}</a
            >
            {#if task.dueDate}<span
                class="text-xs shrink-0 {isOverdue
                  ? 'text-red-500'
                  : 'text-gray-400'}"
                >{new Date(task.dueDate).toLocaleDateString()}</span
              >{/if}
          </div>
        {/each}
      {/if}
    </Card>

    <!-- Recent projects -->
    <Card class="col-span-2">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white m-0">
          Recent Projects
        </h2>
        <a
          href="/projects"
          class="text-sm text-primary-600 dark:text-primary-400 no-underline hover:underline"
          >View all <CaretRightSolid class="w-3 h-3 inline ml-0.5" /></a
        >
      </div>
      {#if $projects.length === 0}
        <p class="text-gray-400 text-sm m-0">
          No projects yet. <a
            href="/projects/new"
            class="text-primary-600 hover:underline">Create one</a
          >.
        </p>
      {:else}
        <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {#each $projects as project}
            <a
              href="/projects/{project.id}"
              class="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 font-medium no-underline hover:border-primary-500 transition-colors"
              >{project.name}</a
            >
          {/each}
        </div>
      {/if}
    </Card>
  </div>
{/if}
