<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { apiGetAuth, getToken, API_BASE } from '$lib/api';
  import { getCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { Alert, Button, Card } from 'flowbite-svelte';
  import { UserCircleOutline } from 'flowbite-svelte-icons';

  const avatarUrl = writable('');
  const error = writable(''); const success = writable('');

  onMount(async () => {
    const me = await getCurrentUser(); if (!me) { goto('/login'); return; }
    try { const data = await apiGetAuth<any>('/user/settings/avatar'); avatarUrl.set(data.avatarUrl ?? ''); }
    catch (e: any) { error.set(e.message); }
  });

  async function uploadAvatar(e: Event) {
    const input = e.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append('avatar', file);
    const token = getToken(); const headers: Record<string, string> = {}; if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API_BASE + '/user/settings/avatar/upload', { method: 'PUT', headers, body: fd });
    if (!res.ok) { error.set('Upload failed'); return; }
    const data = await res.json(); avatarUrl.set(data.avatarUrl ?? ''); success.set('Avatar updated.'); input.value = '';
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/user/settings" class="text-gray-400 hover:text-gray-600">← Back</a>
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">Avatar</h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

<Card class="max-w-sm">
  <div class="flex items-center gap-4 mb-5">
    {#if $avatarUrl}
      <img src={$avatarUrl.startsWith('http') ? $avatarUrl : `${API_BASE}${$avatarUrl}`} alt="Current avatar" class="w-18 h-18 rounded-full object-cover" style="width:72px;height:72px" />
    {:else}
      <div class="w-18 h-18 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center" style="width:72px;height:72px">
        <UserCircleOutline class="w-10 h-10 text-gray-400" />
      </div>
    {/if}
    <div>
      <p class="font-medium text-gray-900 dark:text-white m-0">Profile photo</p>
      <p class="text-xs text-gray-400 m-0">JPG, PNG, GIF or WebP. Max 5 MB.</p>
    </div>
  </div>
  <label class="inline-flex items-center gap-2 cursor-pointer px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
    Upload new photo
    <input type="file" accept="image/*" onchange={uploadAvatar} class="sr-only" />
  </label>
</Card>
