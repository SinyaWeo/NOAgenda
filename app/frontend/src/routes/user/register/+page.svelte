<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiFetch, apiPost } from '$lib/api';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Alert, Button, Card, Checkbox, Helper, Input, Label } from 'flowbite-svelte';
  import { EyeOutline, EyeSlashOutline } from 'flowbite-svelte-icons';

  const username = writable('');
  const email = writable('');
  const password = writable('');
  const error = writable('');
  const loading = writable(false);
  let showPassword = $state(false);
  let checkEmail = $state(false);
  let acceptTerms = $state(false);
  let emailVerificationRequired = $state(false); // from the same /auth/config call as the other flags
  let registrationEnabled = $state(true);
  let inviteRequired = $state(false);
  let inviteCode = $state('');

  // The operator may close registration or require an invite code for a soft launch.
  onMount(async () => {
    const cfg: { registrationEnabled?: boolean; inviteRequired?: boolean; emailVerificationRequired?: boolean } = await apiFetch('/auth/config')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    registrationEnabled = cfg.registrationEnabled !== false;
    inviteRequired = cfg.inviteRequired === true;
    emailVerificationRequired = cfg.emailVerificationRequired === true;
  });

  async function handleRegister(event: SubmitEvent) {
    event.preventDefault();
    loading.set(true);
    error.set('');
    try {
      await apiPost('/users', {
        username: $username,
        email: $email,
        password: $password,
        acceptTerms,
        ...(inviteRequired ? { inviteCode: inviteCode.trim() } : {}),
      });
      if (emailVerificationRequired) {
        checkEmail = true;
      } else {
        goto('/user/login');
      }
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

    {#if !registrationEnabled}
      <Alert color="yellow" class="mb-4">
        <p class="font-semibold">Registration is closed</p>
        <p class="text-sm mt-1">New accounts cannot be created right now. If you already have an account you can sign in.</p>
      </Alert>
      <p class="text-sm text-center mt-4">
        <a href="/user/login" class="text-primary-600 dark:text-primary-400 hover:underline">Go to Sign in</a>
      </p>
    {:else if checkEmail}
      <Alert color="green" class="mb-4">
        <p class="font-semibold">Check your email</p>
        <p class="text-sm mt-1">
          We sent a confirmation link to {$email}. Open it to activate your account, then sign in.
        </p>
      </Alert>
      <p class="text-sm text-center mt-4">
        <a href="/user/login" class="text-primary-600 dark:text-primary-400 hover:underline">Go to Sign in</a>
      </p>
    {:else}
    <form onsubmit={handleRegister} class="flex flex-col gap-4">
      {#if inviteRequired}
        <div>
          <Label for="reg-invite" class="mb-1">Invite code</Label>
          <Input id="reg-invite" type="text" bind:value={inviteCode} required autocomplete="off" />
          <Helper class="mt-1">Registration is by invitation. Enter the code you were given.</Helper>
        </div>
      {/if}
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
      <div class="flex items-start gap-2">
        <Checkbox id="reg-terms" bind:checked={acceptTerms} required />
        <Label for="reg-terms" class="text-sm font-normal">
          I have read and agree to the
          <a href="/terms" target="_blank" rel="noopener" class="text-primary-600 dark:text-primary-400 hover:underline">Terms of Service</a>
          and the
          <a href="/privacy" target="_blank" rel="noopener" class="text-primary-600 dark:text-primary-400 hover:underline">Privacy Policy</a>.
        </Label>
      </div>
      <Button type="submit" disabled={$loading || !acceptTerms} class="w-full mt-1">{$loading ? 'Registering…' : 'Create account'}</Button>
    </form>

    <p class="text-sm text-center text-gray-500 mt-4">
      Already have an account? <a href="/user/login" class="text-primary-600 dark:text-primary-400 hover:underline">Sign in</a>
    </p>
    {/if}
  </Card>
</div>
