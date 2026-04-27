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

<div style="max-width:600px">
  <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
    <a
      href={$projectId ? `/projects/${$projectId}` : '/tasks'}
      style="color:#64748b;text-decoration:none;font-size:1.25rem">←</a
    >
    <h1 style="margin:0">Create Task</h1>
  </div>

  {#if $error}<p
      style="color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:0.6rem 1rem;margin-bottom:1rem"
    >
      {$error}
    </p>{/if}

  <form
    onsubmit={handleCreate}
    style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,0.04);display:flex;flex-direction:column;gap:1rem"
  >
    <div style="display:flex;flex-direction:column;gap:0.3rem">
      <label
        for="task-title"
        style="font-size:0.85rem;font-weight:500;color:#475569"
        >Title <span style="color:#ef4444">*</span></label
      >
      <input
        id="task-title"
        type="text"
        bind:value={$title}
        required
        style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem"
      />
    </div>
    <div style="display:flex;flex-direction:column;gap:0.3rem">
      <label
        for="task-desc"
        style="font-size:0.85rem;font-weight:500;color:#475569"
        >Description</label
      >
      <textarea
        id="task-desc"
        bind:value={$description}
        rows={3}
        style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem;resize:vertical"
      ></textarea>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div style="display:flex;flex-direction:column;gap:0.3rem">
        <label
          for="task-due"
          style="font-size:0.85rem;font-weight:500;color:#475569"
          >Due Date</label
        >
        <input
          id="task-due"
          type="date"
          bind:value={$dueDate}
          style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem"
        />
      </div>
      <div style="display:flex;flex-direction:column;gap:0.3rem">
        <label
          for="task-priority"
          style="font-size:0.85rem;font-weight:500;color:#475569"
          >Priority</label
        >
        <select
          id="task-priority"
          bind:value={$priority}
          style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem"
        >
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
      <div style="display:flex;flex-direction:column;gap:0.3rem">
        <label
          for="task-project"
          style="font-size:0.85rem;font-weight:500;color:#475569"
          >Project <span style="color:#ef4444">*</span></label
        >
        <select
          id="task-project"
          bind:value={$projectId}
          required
          style="padding:0.5rem 0.75rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.95rem"
        >
          <option value={undefined}>Select a project…</option>
          {#each $projects as p}
            <option value={p.id}>{p.name ?? p.title}</option>
          {/each}
        </select>
      </div>
    {/if}
    <div
      style="display:flex;gap:0.75rem;justify-content:flex-end;padding-top:0.5rem;border-top:1px solid #f1f5f9"
    >
      <a
        href={$projectId ? `/projects/${$projectId}` : '/tasks'}
        style="padding:0.5rem 1rem;border:1px solid #e2e8f0;border-radius:6px;text-decoration:none;color:#475569;font-size:0.9rem"
        >Cancel</a
      >
      <button
        type="submit"
        disabled={$loading}
        style="background:#6366f1;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:6px;cursor:pointer;font-size:0.9rem"
        >{$loading ? 'Creating…' : 'Create Task'}</button
      >
    </div>
  </form>
</div>
