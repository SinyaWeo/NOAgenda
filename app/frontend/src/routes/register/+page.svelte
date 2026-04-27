<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiPost } from '$lib/api';
  import { goto } from '$app/navigation';

  const username = writable('');
  const email = writable('');
  const password = writable('');
  const error = writable('');
  const loading = writable(false);
  let showPassword = false;

  async function handleRegister(event: SubmitEvent) {
    event.preventDefault();
    loading.set(true);
    error.set('');
    try {
      await apiPost('/users', {
        username: $username,
        email: $email,
        password: $password,
      });
      goto('/login');
    } catch (e: any) {
      error.set(e.message ?? 'Registration failed');
    } finally {
      loading.set(false);
    }
  }
</script>

<div
  style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;padding:1rem"
>
  <div
    style="background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:2.5rem;width:100%;max-width:400px"
  >
    <div style="text-align:center;margin-bottom:2rem">
      <div
        style="font-size:1.8rem;font-weight:700;color:#1e293b;margin-bottom:0.25rem"
      >
        NOAgenda
      </div>
      <h1 style="font-size:1.2rem;font-weight:600;color:#475569;margin:0">
        Create your account
      </h1>
    </div>
    {#if $error}
      <div
        style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1.25rem;font-size:0.875rem"
      >
        {$error}
      </div>
    {/if}
    <form
      onsubmit={handleRegister}
      style="display:flex;flex-direction:column;gap:1rem"
    >
      <div>
        <label
          for="reg-username"
          style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
          >Username</label
        >
        <input
          id="reg-username"
          type="text"
          bind:value={$username}
          required
          style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box"
        />
      </div>
      <div>
        <label
          for="reg-email"
          style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
          >Email</label
        >
        <input
          id="reg-email"
          type="email"
          bind:value={$email}
          required
          style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box"
        />
      </div>
      <div>
        <label
          for="reg-password"
          style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
          >Password <span style="font-size:0.8rem;color:#9ca3af"
            >(min 8 characters)</span
          ></label
        >
        <div style="display:flex;gap:0.5rem">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            bind:value={$password}
            required
            minlength={8}
            style="flex:1;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem"
          />
          <button
            type="button"
            onclick={() => (showPassword = !showPassword)}
            style="padding:0.5rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;background:#f9fafb;cursor:pointer;font-size:0.8rem;color:#6b7280;white-space:nowrap"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={$loading}
        style="background:#6366f1;color:#fff;padding:0.65rem 1rem;border:none;border-radius:6px;font-size:0.95rem;font-weight:500;cursor:{$loading
          ? 'not-allowed'
          : 'pointer'};opacity:{$loading ? 0.7 : 1};margin-top:0.25rem"
      >
        {$loading ? 'Registering…' : 'Create account'}
      </button>
    </form>
    <p
      style="text-align:center;margin-top:1.5rem;font-size:0.875rem;color:#6b7280;margin-bottom:0"
    >
      Already have an account? <a
        href="/login"
        style="color:#6366f1;text-decoration:none;font-weight:500">Sign in</a
      >
    </p>
  </div>
</div>
