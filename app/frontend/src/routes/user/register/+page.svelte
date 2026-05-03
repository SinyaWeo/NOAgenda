<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiPost } from '$lib/api';
  import { goto } from '$app/navigation';
  import { Alert, Button, Card, Helper, Input, Label } from 'flowbite-svelte';
  import { EyeOutline, EyeSlashOutline } from 'flowbite-svelte-icons';

  const username = writable('');
  const email = writable('');
  const password = writable('');
  const error = writable('');
  const loading = writable(false);
  let showPassword = $state(false);

  async function handleRegister(event: SubmitEvent) {
    event.preventDefault();
    loading.set(true);
    error.set('');
    try {
      await apiPost('/users', { username: $username, email: $email, password: $password });
      goto('/login');
    } catch (e: any) {
      error.set(e.message ?? 'Registration failed');
    } finally {
      loading.set(false);
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
  <Card class="w-full max-w-md">
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">NOAgenda</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Create your account</p>
    </div>

    {#if $error}
      <Alert color="red" class="mb-4">{$error}</Alert>
    {/if}

    <form onsubmit={handleRegister} class="flex flex-col gap-4">
      <div>
        <Label for="reg-username" class="mb-1">Username</Label>
        <Input id="reg-username" type="text" bind:value={$username} required />
      </div>
      <div>
        <Label for="reg-email" class="mb-1">Email</Label>
        <Input id="reg-email" type="email" bind:value={$email} required />
      </div>
      <div>
        <Label for="reg-password" class="mb-1">Password</Label>
        <div class="flex gap-2">
          <Input id="reg-password" type={showPassword ? 'text' : 'password'} bind:value={$password} required minlength={8} class="flex-1" />
          <Button type="button" color="light" onclick={() => (showPassword = !showPassword)} class="shrink-0 px-3">
            {#if showPassword}<EyeSlashOutline class="w-4 h-4" />{:else}<EyeOutline class="w-4 h-4" />{/if}
          </Button>
        </div>
        <Helper class="mt-1">Minimum 8 characters</Helper>
      </div>
      <Button type="submit" disabled={$loading} class="w-full mt-1">{$loading ? 'Registering…' : 'Create account'}</Button>
    </form>

    <p class="text-sm text-center text-gray-500 mt-4">
      Already have an account? <a href="/login" class="text-primary-600 dark:text-primary-400 hover:underline">Sign in</a>
    </p>
  </Card>
</div>
