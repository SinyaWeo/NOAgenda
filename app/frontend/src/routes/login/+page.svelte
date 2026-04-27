<script lang="ts">
  import { writable } from 'svelte/store';
  import { apiFetch, setToken } from '$lib/api';
  import { goto } from '$app/navigation';

  const username = writable('');
  const password = writable('');
  const error = writable('');
  const loading = writable(false);
  let showPassword = false;

  async function handleLogin(event: Event) {
    event.preventDefault();
    loading.set(true);
    error.set('');
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: $username, password: $password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'Login failed');
      }
      const data = await response.json();
      setToken(data.access_token);
      goto('/dashboard');
    } catch (e) {
      error.set(e instanceof Error ? e.message : 'Unknown error');
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
        Sign in to your account
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
      onsubmit={handleLogin}
      style="display:flex;flex-direction:column;gap:1rem"
    >
      <div>
        <label
          for="login-username"
          style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
          >Username</label
        >
        <input
          id="login-username"
          type="text"
          bind:value={$username}
          required
          style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box"
        />
      </div>
      <div>
        <label
          for="login-password"
          style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
          >Password</label
        >
        <div style="display:flex;gap:0.5rem">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            bind:value={$password}
            required
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
        {$loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
    <div
      style="text-align:center;margin-top:1.5rem;font-size:0.875rem;color:#6b7280"
    >
      <p style="margin:0 0 0.4rem">
        Don't have an account? <a
          href="/register"
          style="color:#6366f1;text-decoration:none;font-weight:500">Register</a
        >
      </p>
      <a href="/get-password-reset" style="color:#94a3b8;text-decoration:none"
        >Forgot password?</a
      >
    </div>
  </div>
</div>
