<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { apiPostAuth, apiGetAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { writable, get } from 'svelte/store';
  import { onMount } from 'svelte';

  const title = writable('');
  const description = writable('');
  const projectId = writable<number | undefined>(undefined);
  const dueDate = writable('');
  const priority = writable(0);
  const error = writable('');
  const loading = writable(false);
  const projects = writable<any[]>([]);

  onMount(async () => {
    const me = await getCurrentUser();
    if (!me) {
      goto('/login');
      return;
    }
    const pid = $page.url.searchParams.get('projectId');
    if (pid) projectId.set(Number(pid));
    try {
      projects.set(await apiGetAuth<any[]>('/projects'));
    } catch (_) {
      /* non-critical */
    }
  });

  async function handleCreate(event: Event) {
    event.preventDefault();
    loading.set(true);
    error.set('');
    try {
      const pid = get(projectId);
      const task = await apiPostAuth<any>('/tasks', {
        title: get(title),
        description: get(description),
        ...(pid ? { project: { id: pid } } : {}),
        dueDate: get(dueDate)
          ? new Date(get(dueDate)).toISOString()
          : undefined,
        priority: Number(get(priority)),
      });
      goto(`/tasks/${task.id}`);
    } catch (e: any) {
      error.set(e.message);
    } finally {
      loading.set(false);
    }
  }
</script>

<div class="page-header">
  <a href={$projectId ? `/projects/${$projectId}` : '/tasks'} class="back-link"
    ><span class="icon icon-sm">arrow_back</span></a
  >
  <h1 class="page-title">Create Task</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}

<div class="card">
  <div class="card-body">
    <form onsubmit={handleCreate}>
      <div class="form-group">
        <label for="task-title" class="form-label"
          >Title <span class="text-danger">*</span></label
        >
        <input
          id="task-title"
          type="text"
          bind:value={$title}
          required
          class="form-input"
        />
      </div>
      <div class="form-group">
        <label for="task-desc" class="form-label">Description</label>
        <textarea
          id="task-desc"
          bind:value={$description}
          rows={3}
          class="form-textarea"
        ></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="task-due" class="form-label">Due Date</label>
          <input
            id="task-due"
            type="date"
            bind:value={$dueDate}
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="task-priority" class="form-label">Priority</label>
          <select id="task-priority" bind:value={$priority} class="form-select">
            <option value={0}>— Unset</option>
            <option value={1}>Low</option>
            <option value={2}>Medium</option>
            <option value={3}>High</option>
            <option value={4}>Urgent</option>
            <option value={5}>Do Now</option>
          </select>
        </div>
      </div>
      {#if !$projectId}
        <div class="form-group">
          <label for="task-project" class="form-label"
            >Project <span class="text-danger">*</span></label
          >
          <select
            id="task-project"
            bind:value={$projectId}
            required
            class="form-select"
          >
            <option value={undefined}>Select a project…</option>
            {#each $projects as p}
              <option value={p.id}>{p.name ?? p.title}</option>
            {/each}
          </select>
        </div>
      {/if}
      <div class="page-actions">
        <a
          href={$projectId ? `/projects/${$projectId}` : '/tasks'}
          class="btn btn-secondary">Cancel</a
        >
        <button type="submit" disabled={$loading} class="btn btn-primary"
          >{$loading ? 'Creating…' : 'Create Task'}</button
        >
      </div>
    </form>
  </div>
</div>
