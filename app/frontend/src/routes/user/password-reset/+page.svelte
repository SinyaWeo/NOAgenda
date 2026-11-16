<script lang="ts">
  import { errMessage } from '$lib/errors';
  import { writable } from 'svelte/store';
  import { apiPost } from '$lib/api';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';
  import { EyeOutline, EyeSlashOutline } from 'flowbite-svelte-icons';

  const password = writable('');
  const confirmPassword = writable('');
  const error = writable('');
  const success = writable(false);
  const loading = writable(false);
  let showPassword = $state(false);

  async function handleReset(event: SubmitEvent) {
    event.preventDefault();
    if ($password !== $confirmPassword) { error.set('Passwords do not match'); return; }
    loading.set(true);
    error.set('');
    success.set(false);
    try {
      const token = page.url.searchParams.get('token') ?? '';
      if (!token) throw new Error('This reset link is incomplete. Request a new one.');
      await apiPost('/auth/password/reset', { token, password: $password });
      success.set(true);
      setTimeout(() => goto('/user/login'), 2000);
    } catch (e: unknown) {
      error.set(errMessage(e, 'Reset failed'));
    } finally {
      loading.set(false);
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
  <Card class="w-full max-w-md">
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">NOAgenda</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Set a new password</p>
    </div>

    {#if $error}
      <Alert color="red" class="mb-4">{$error}</Alert>
    {/if}

    {#if $success}
      <Alert color="green">
        <p class="font-semibold">Password reset successful</p>
        <p class="text-sm mt-1">Redirecting to sign in…</p>
      </Alert>
    {:else}
      <form onsubmit={handleReset} class="flex flex-col gap-4">
        <div>
          <Label for="new-password" class="mb-1">New Password</Label>
          <div class="flex gap-2">
            <Input id="new-password" type={showPassword ? 'text' : 'password'} bind:value={$password} required minlength={8} class="flex-1" />
            <Button type="button" color="light" onclick={() => (showPassword = !showPassword)} class="shrink-0 px-3">
              {#if showPassword}<EyeSlashOutline class="w-4 h-4" />{:else}<EyeOutline class="w-4 h-4" />{/if}
            </Button>
          </div>
        </div>
        <div>
          <Label for="confirm-password" class="mb-1">Confirm Password</Label>
          <Input id="confirm-password" type="password" bind:value={$confirmPassword} required minlength={8} />
        </div>
        <Button type="submit" disabled={$loading} class="w-full">{$loading ? 'Resetting…' : 'Reset password'}</Button>
      </form>
    {/if}
  </Card>
</div>
