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

<div class="auth-page">
  <div class="auth-card">
    <div style="text-align:center;margin-bottom:2rem">
      <div class="auth-title">NOAgenda</div>
      <p class="auth-subtitle">Create your account</p>
    </div>
    {#if $error}
      <div class="alert alert-error">{$error}</div>
    {/if}
    <form onsubmit={handleRegister}>
      <div class="form-group">
        <label for="reg-username" class="form-label">Username</label>
        <input
          id="reg-username"
          type="text"
          bind:value={$username}
          required
          class="form-input"
        />
      </div>
      <div class="form-group">
        <label for="reg-email" class="form-label">Email</label>
        <input
          id="reg-email"
          type="email"
          bind:value={$email}
          required
          class="form-input"
        />
      </div>
      <div class="form-group">
        <label for="reg-password" class="form-label"
          >Password <span class="text-xs text-muted">(min 8 characters)</span
          ></label
        >
        <div class="input-with-action">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            bind:value={$password}
            required
            minlength={8}
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
        {$loading ? 'Registering…' : 'Create account'}
      </button>
    </form>
    <div class="auth-footer">
      Already have an account? <a href="/login">Sign in</a>
    </div>
  </div>
</div>
