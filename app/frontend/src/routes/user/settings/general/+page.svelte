<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { apiGetAuth, apiPostAuth } from '$lib/api';
  import { getCurrentUser, refreshCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { Alert, Button, Card, Input, Label, Select } from 'flowbite-svelte';
  import { CaretLeftSolid } from 'flowbite-svelte-icons';

  const name = writable('');
  const language = writable('en');
  const timezone = writable('UTC');
  const theme = writable('light');
  const weekStart = writable(1);
  const error = writable('');
  const success = writable('');
  const loading = writable(true);
  const saving = writable(false);

  onMount(async () => {
    const me = await getCurrentUser();
    if (!me) {
      goto('/user/login');
      return;
    }
    try {
      const s = await apiGetAuth<any>('/user/settings/general');
      name.set(s.name ?? '');
      language.set(s.language ?? 'en');
      timezone.set(s.timezone ?? 'UTC');
      theme.set(s.theme ?? 'light');
      weekStart.set(s.weekStart ?? 1);
    } catch (e: any) {
      error.set(e.message);
    } finally {
      loading.set(false);
    }
  });

  async function handleSave(e: Event) {
    e.preventDefault();
    saving.set(true);
    error.set('');
    success.set('');
    try {
      await apiPostAuth('/user/settings/general', {
        name: $name,
        timezone: $timezone,
        theme: $theme,
        weekStart: $weekStart,
      });
      await refreshCurrentUser(); // header name, avatar and theme follow at once
      success.set('Settings saved.');
    } catch (e: any) {
      error.set(e.message);
    } finally {
      saving.set(false);
    }
  }
</script>

<div class="flex items-center gap-3 mb-6">
  <a href="/user/settings" class="text-gray-400 hover:text-gray-600"
    ><CaretLeftSolid class="w-4 h-4 inline mr-1" /> Back</a
  >
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
    General Settings
  </h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

{#if $loading}
  <p class="text-gray-400">Loading…</p>
{:else}
  <Card class="max-w-xl">
    <form onsubmit={handleSave} class="flex flex-col gap-4">
      <div>
        <Label for="gen-name" class="mb-1">Display Name</Label>
        <Input id="gen-name" type="text" bind:value={$name} />
      </div>
      <div>
        <Label for="gen-timezone" class="mb-1">Timezone</Label>
        <Input
          id="gen-timezone"
          type="text"
          bind:value={$timezone}
          placeholder="e.g. Europe/Prague"
        />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="gen-theme" class="mb-1">Theme</Label>
          <Select id="gen-theme" bind:value={$theme}>
            <option value="light">Light</option><option value="dark"
              >Dark</option
            ><option value="system">System</option>
          </Select>
        </div>
        <div>
          <Label for="gen-weekstart" class="mb-1">Week starts on</Label>
          <Select id="gen-weekstart" bind:value={$weekStart}>
            <option value={0}>Sunday</option><option value={1}>Monday</option>
          </Select>
        </div>
      </div>
      <div class="pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button type="submit" disabled={$saving}
          >{$saving ? 'Saving…' : 'Save Settings'}</Button
        >
      </div>
    </form>
  </Card>
{/if}
