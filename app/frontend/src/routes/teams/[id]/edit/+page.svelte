<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { apiGetAuth, apiPutAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Alert, Button, Card, Input, Label, Select, Textarea } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

  const team = writable<any>(null);
  const members = writable<any[]>([]);
  const allUsers = writable<any[]>([]);
  const name = writable('');
  const description = writable('');
  const loading = writable(true);
  const error = writable('');
  const saving = writable(false);
  let newMemberUserId = $state('');

  async function loadTeam() {
    const id = page.params.id;
    const [t, m, users] = await Promise.all([
      apiGetAuth<any>(`/teams/${id}`), apiGetAuth<any[]>(`/team-members?teamId=${id}`), apiGetAuth<any[]>('/users').catch(() => []),
    ]);
    team.set(t); name.set(t.name ?? ''); description.set(t.description ?? ''); members.set(m); allUsers.set(users);
  }

  onMount(async () => {
    const me = await getCurrentUser(); if (!me) { goto('/login'); return; }
    try { await loadTeam(); } catch (e: any) { error.set(e.message); } finally { loading.set(false); }
  });

  async function handleSave(e: Event) {
    e.preventDefault(); saving.set(true);
    try { await apiPutAuth(`/teams/${page.params.id}`, { name: $name, description: $description }); goto(`/teams/${page.params.id}`); }
    catch (e: any) { error.set(e.message); } finally { saving.set(false); }
  }

  async function addMember(e: SubmitEvent) {
    e.preventDefault(); if (!newMemberUserId.trim()) return;
    try { await apiPostAuth('/team-members', { teamId: Number(page.params.id), userId: Number(newMemberUserId) }); newMemberUserId = ''; await loadTeam(); }
    catch (e: any) { error.set(e.message); }
  }

  async function removeMember(memberId: number) {
    try { await apiDeleteAuth(`/team-members/${memberId}`); await loadTeam(); }
    catch (e: any) { error.set(e.message); }
  }

  async function handleDelete() {
    if (!confirm('Delete this team?')) return;
    try { await apiDeleteAuth(`/teams/${page.params.id}`); goto('/teams'); }
    catch (e: any) { error.set(e.message); }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/teams/{page.params.id}" class="text-gray-400 hover:text-gray-600">← Back</a>
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Edit Team</h1>
</div>
{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else}
  <Card class="max-w-xl mb-4">
    <form onsubmit={handleSave} class="flex flex-col gap-4">
      <div>
        <Label for="team-name" class="mb-1">Name <span class="text-red-500">*</span></Label>
        <Input id="team-name" type="text" bind:value={$name} required />
      </div>
      <div>
        <Label for="team-desc" class="mb-1">Description</Label>
        <Textarea id="team-desc" bind:value={$description} rows={3} />
      </div>
      <div class="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button type="submit" disabled={$saving}>{$saving ? 'Saving…' : 'Save Changes'}</Button>
        <Button href="/teams/{page.params.id}" color="light">Cancel</Button>
      </div>
    </form>
  </Card>

  <Card class="max-w-xl mb-4">
    <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Members</h2>
    <form onsubmit={addMember} class="flex gap-2 mb-4">
      {#if $allUsers.length}
        <Select bind:value={newMemberUserId} class="flex-1">
          <option value="">Select user…</option>
          {#each $allUsers as u}<option value={String(u.id)}>{u.name || u.username || `User #${u.id}`}</option>{/each}
        </Select>
      {:else}
        <Input type="number" bind:value={newMemberUserId} placeholder="User ID" class="w-28" />
      {/if}
      <Button type="submit" size="sm">Add</Button>
    </form>
    {#if $members.length}
      {#each $members as member, i}
        <div class="flex items-center gap-3 py-2 {i < $members.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}">
          <span class="flex-1 text-sm text-gray-800 dark:text-gray-200">{member.user ? (member.user.name || member.user.username || `User #${member.user.id}`) : `Member #${member.id}`}</span>
          <Button size="xs" color="red" onclick={() => removeMember(member.id)}>Remove</Button>
        </div>
      {/each}
    {:else}
      <p class="text-sm text-gray-400">No members yet.</p>
    {/if}
  </Card>

  <div class="max-w-xl border-2 border-red-200 dark:border-red-900 rounded-lg p-4">
    <h2 class="flex items-center gap-2 text-base font-semibold text-red-600 mb-3">
      <ExclamationCircleOutline class="w-5 h-5" />Danger Zone
    </h2>
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-sm font-bold text-red-600 m-0">Delete Team</p>
        <p class="text-xs text-gray-500 m-0">Permanently removes this team and all its members.</p>
      </div>
      <Button color="red" size="sm" onclick={handleDelete}>Delete</Button>
    </div>
  </div>
{/if}
