<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { apiGetAuth, API_BASE } from '$lib/api';
  import { Alert, Button, Card } from 'flowbite-svelte';
  import type { User } from '$lib/types';

  const user = writable<User | null>(null);
  const loading = writable(true);
  const error = writable('');

  function resolveUrl(path: string | undefined): string {
    if (!path) return '';
    return path.startsWith('http') ? path : `${API_BASE}${path}`;
  }
  function getInitials(u: User): string {
    const name: string = u.name ?? u.username ?? 'U';
    return name
      .split(' ')
      .map((w: string) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  function formatDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  onMount(async () => {
    try {
      user.set(await apiGetAuth<User>('/users/me'));
    } catch (e: unknown) {
      error.set('Failed to load profile.');
    } finally {
      loading.set(false);
    }
  });
</script>

{#if $loading}
  <p class="text-gray-400 text-center py-8">Loading…</p>
{:else if $error}
  <Alert color="red">{$error}</Alert>
{:else if $user}
  <div class="max-w-md mx-auto">
    <Card>
      <div class="flex flex-col items-center gap-3 mb-6">
        {#if $user.avatarUrl}
          <img
            src={resolveUrl($user.avatarUrl)}
            alt="Avatar"
            class="w-20 h-20 rounded-full object-cover"
          />
        {:else}
          <div
            class="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl font-bold text-primary-700 dark:text-primary-300"
          >
            {getInitials($user)}
          </div>
        {/if}
        <div class="text-center">
          <h1 class="text-xl font-bold text-gray-900 dark:text-white m-0">
            {$user.name ?? $user.username}
          </h1>
          <p class="text-sm text-gray-400 m-0">@{$user.username}</p>
        </div>
      </div>
      <dl class="divide-y divide-gray-100 dark:divide-gray-700">
        {#each [['Email', $user.email ?? '—'], ['Member since', formatDate($user.createdAt)], ['Language', $user.language ?? 'en'], ['Timezone', $user.timezone ?? 'UTC'], ['Theme', $user.theme ?? 'light']] as [label, value]}
          <div class="flex justify-between py-2.5 text-sm">
            <dt class="font-medium text-gray-500">{label}</dt>
            <dd class="text-gray-800 dark:text-gray-200">{value}</dd>
          </div>
        {/each}
      </dl>
      <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Button href="/user/settings/general" class="w-full"
          >Edit Profile</Button
        >
      </div>
    </Card>
  </div>
{/if}
