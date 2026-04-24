
<script lang="ts">

import { writable } from 'svelte/store';
import { apiFetch } from '$lib/api';

const username = writable('');
const email = writable('');
const password = writable('');
const error = writable('');
const loading = writable(false);

async function handleRegister(event: Event) {
  event.preventDefault();
  loading.set(true);
  error.set('');
  try {
    const response = await apiFetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $username, email: $email, password: $password })
    });
    if (!response.ok) {
      throw new Error('Registration failed');
    }
    // Redirect or update state on success
    // window.location.href = '/login';
  } catch (e) {
    if (e instanceof Error) {
      error.set(e.message);
    } else {
      error.set('Unknown error');
    }
  } finally {
    loading.set(false);
  }
}
</script>

<form onsubmit={handleRegister}>
  <h1>Register</h1>
  {#if $error}
    <p style="color: red">{$error}</p>
  {/if}
  <label>
    Username
    <input type="text" bind:value={$username} required />
  </label>
  <label>
    Email
    <input type="email" bind:value={$email} required />
  </label>
  <label>
    Password
    <input type="password" bind:value={$password} required />
  </label>
  <button type="submit" disabled={$loading}>{$loading ? 'Registering...' : 'Register'}</button>
</form>
