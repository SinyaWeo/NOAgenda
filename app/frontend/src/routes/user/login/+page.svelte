<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { apiError, apiFetch, setToken } from '$lib/api';
  import { authSession, refreshCurrentUser } from '$lib/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';
  import { EyeOutline, EyeSlashOutline } from 'flowbite-svelte-icons';

  const username = writable('');
  const password = writable('');
  const error = writable('');
  const loading = writable(false);
  let showPassword = $state(false);
  let needsVerification = $state(false);
  let resendEmail = $state('');
  let resendStatus = $state('');

  /** Only ever go back to a page on this site (never an external URL or the login page itself). */
  function safeRedirect(target: string | null): string {
    if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return '/dashboard';
    if (target.startsWith('/user/login')) return '/dashboard';
    return target;
  }

  const expired = page.url.searchParams.get('reason') === 'expired';

  // Someone who is already signed in has no business on this page.
  $effect(() => {
    if ($authSession.status === 'authenticated' && !$loading) {
      goto(safeRedirect(page.url.searchParams.get('redirect')), { replaceState: true });
    }
  });

  let registrationEnabled = $state(true);
  onMount(async () => {
    const cfg: { registrationEnabled?: boolean } = await apiFetch('/auth/config')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    registrationEnabled = cfg.registrationEnabled !== false;
  });

  async function handleLogin(event: Event) {
    event.preventDefault();
    loading.set(true);
    error.set('');
    needsVerification = false;
    resendStatus = '';
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: $username, password: $password }),
      });
      if (!response.ok) {
        const data = await response.clone().json().catch(() => ({}));
        if (data.code === 'EMAIL_NOT_VERIFIED') needsVerification = true;
        // Same wording as everywhere else: friendly 429, validation arrays joined, no raw 5xx text.
        throw await apiError(response, 'Login failed');
      }
      const data = await response.json();
      setToken(data.access_token);
      const me = await refreshCurrentUser();
      if (!me) throw new Error('Unable to load your account');
      goto(safeRedirect(page.url.searchParams.get('redirect')), { replaceState: true });
    } catch (e) {
      error.set(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      loading.set(false);
    }
  }

  async function resendVerification(event: Event) {
    event.preventDefault();
    resendStatus = '';
    const res = await apiFetch('/auth/email/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resendEmail }),
    });
    resendStatus = res.ok
      ? 'If that address belongs to an unverified account, we sent a new link.'
      : 'Could not send the email. Try again in a minute.';
  }
</script>

<div
  class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4"
>
  <Card class="w-full max-w-md">
    <div class="text-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">NOAgenda</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Sign in to your account
      </p>
    </div>

    {#if expired && !$error}
      <Alert color="yellow" class="mb-4">Your session has expired. Please sign in again.</Alert>
    {/if}
    {#if $error}
      <Alert color="red" class="mb-4">{$error}</Alert>
    {/if}

    {#if needsVerification}
      <form onsubmit={resendVerification} class="flex flex-col gap-2 mb-4">
        <Label for="resend-email">Send the confirmation link again</Label>
        <div class="flex gap-2">
          <Input id="resend-email" type="email" bind:value={resendEmail} placeholder="you@example.com" required class="flex-1" />
          <Button type="submit" color="light" class="shrink-0">Resend</Button>
        </div>
        {#if resendStatus}<p class="text-xs text-gray-500">{resendStatus}</p>{/if}
      </form>
    {/if}

    <form onsubmit={handleLogin} class="flex flex-col gap-4">
      <div>
        <Label for="login-username" class="mb-1">Username</Label>
        <Input
          id="login-username"
          type="text"
          bind:value={$username}
          required
        />
      </div>
      <div>
        <Label for="login-password" class="mb-1">Password</Label>
        <div class="flex gap-2">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            bind:value={$password}
            required
            class="flex-1"
          />
          <Button
            type="button"
            color="light"
            onclick={() => (showPassword = !showPassword)}
            class="shrink-0 px-3"
          >
            {#if showPassword}<EyeSlashOutline
                class="w-4 h-4"
              />{:else}<EyeOutline class="w-4 h-4" />{/if}
          </Button>
        </div>
      </div>
      <Button type="submit" disabled={$loading} class="w-full mt-1"
        >{$loading ? 'Signing in…' : 'Sign in'}</Button
      >
    </form>

    {#if registrationEnabled}
      <p class="text-sm text-center text-gray-500 mt-4">
        Don't have an account? <a
          href="/user/register"
          class="text-primary-600 dark:text-primary-400 hover:underline"
          >Register</a
        >
      </p>
    {/if}
    <p class="text-sm text-center mt-1">
      <a
        href="/user/get-password-reset"
        class="text-gray-400 hover:underline text-xs">Forgot password?</a
      >
    </p>
    <p class="text-xs text-center text-gray-400 mt-4">
      <a href="/terms" class="hover:underline">Terms</a> ·
      <a href="/privacy" class="hover:underline">Privacy</a>
    </p>
  </Card>
</div>
