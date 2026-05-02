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

<div class="auth-page">
  <div class="auth-card">
    <div style="text-align:center;margin-bottom:2rem">
      <div class="auth-title">NOAgenda</div>
      <p class="auth-subtitle">Sign in to your account</p>
    </div>
    {#if $error}
      <div class="alert alert-error">{$error}</div>
    {/if}
    <form onsubmit={handleLogin} class="form-group" style="gap:1rem">
      <div class="form-group">
        <label for="login-username" class="form-label">Username</label>
        <input
          id="login-username"
          type="text"
          bind:value={$username}
          required
          class="form-input"
        />
      </div>
      <div class="form-group">
        <label for="login-password" class="form-label">Password</label>
        <div class="input-with-action">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            bind:value={$password}
            required
            class="form-input"
          />
          <button
            type="button"
            onclick={() => (showPassword = !showPassword)}
            class="btn-show-hide"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={$loading}
        class="btn btn-primary"
        style="width:100%"
      >
        {$loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
    <div class="auth-footer">
      <p class="mb-2">
        Don't have an account? <a href="/register">Register</a>
      </p>
      <a href="/get-password-reset" class="text-muted">Forgot password?</a>
    </div>
  </div>
</div>
