<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiPost } from '$lib/api';
  import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';
  import { CaretLeftSolid } from 'flowbite-svelte-icons';

  const email = writable('');
  const error = writable('');
  const success = writable(false);
  const loading = writable(false);

  async function handleRequest(event: Event) {
    event.preventDefault();
    loading.set(true);
    error.set('');
    success.set(false);
    try {
      await apiPost('/auth/password/token', { email: $email });
      success.set(true);
    } catch (e: any) {
      error.set(e.message ?? 'Request failed');
    } finally {
      loading.set(false);
    }
  }
</script>

<div
  class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4"
>
  <Card class="w-full max-w-md">
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">NOAgenda</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Reset your password
      </p>
    </div>

    {#if $error}
      <Alert color="red" class="mb-4">{$error}</Alert>
    {/if}

    {#if $success}
      <Alert color="green" class="mb-4">
        <p class="font-semibold">Check your email</p>
        <p class="text-sm mt-1">
          If an account exists for that address, we've sent reset instructions.
        </p>
      </Alert>
      <p class="text-sm text-center mt-4">
        <a
          href="/user/login"
          class="text-primary-600 dark:text-primary-400 hover:underline"
          >Back to Sign in</a
        >
      </p>
    {:else}
      <form onsubmit={handleRequest} class="flex flex-col gap-4">
        <div>
          <Label for="reset-email" class="mb-1">Email address</Label>
          <Input id="reset-email" type="email" bind:value={$email} required />
        </div>
        <Button type="submit" disabled={$loading} class="w-full"
          >{$loading ? 'Sending…' : 'Send reset link'}</Button
        >
      </form>
      <p class="text-sm text-center mt-4">
        <a href="/user/login" class="text-gray-400 hover:underline"
          ><CaretLeftSolid class="w-4 h-4 inline mr-1" /> Back to Sign in</a
        >
      </p>
    {/if}
  </Card>
</div>
