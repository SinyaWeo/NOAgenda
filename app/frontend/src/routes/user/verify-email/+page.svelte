<script lang="ts">
  import { errMessage } from '$lib/errors';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { apiPost } from '$lib/api';
  import { Alert, Button, Card, Spinner } from 'flowbite-svelte';

  let status = $state<'working' | 'ok' | 'error'>('working');
  let message = $state('');

  onMount(async () => {
    const token = page.url.searchParams.get('token');
    if (!token) {
      status = 'error';
      message = 'This confirmation link is incomplete.';
      return;
    }
    try {
      await apiPost('/auth/email/verify', { token });
      status = 'ok';
    } catch (e: unknown) {
      status = 'error';
      message = errMessage(e, 'Could not confirm your email address.');
    }
  });
</script>

<svelte:head><title>Confirm email – NOAgenda</title></svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
  <Card class="w-full max-w-md">
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">NOAgenda</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Confirm your email address</p>
    </div>

    {#if status === 'working'}
      <div class="flex justify-center py-6"><Spinner /></div>
    {:else if status === 'ok'}
      <Alert color="green" class="mb-4">
        <p class="font-semibold">Email confirmed</p>
        <p class="text-sm mt-1">Thanks! You can sign in now.</p>
      </Alert>
      <Button href="/user/login" class="w-full">Go to Sign in</Button>
    {:else}
      <Alert color="red" class="mb-4">
        <p class="font-semibold">Link not valid</p>
        <p class="text-sm mt-1">{message} It may have expired or already been used.</p>
      </Alert>
      <p class="text-sm text-center">
        <a href="/user/login" class="text-primary-600 dark:text-primary-400 hover:underline">
          Sign in to request a new link
        </a>
      </p>
    {/if}
  </Card>
</div>
