<script lang="ts">

import { writable } from 'svelte/store';
import { apiFetch } from '$lib/api';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';

const username = writable('');
const password = writable('');
const error = writable('');
const loading = writable(false);
async function handleLogin(event: Event) {
  event.preventDefault();
  loading.set(true);
  error.set('');
  try {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $username, password: $password })
    });
    if (!response.ok) {
      throw new Error('Login failed');
    }
    // Redirect to dashboard on success
    goto('/dashboard');
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

<form onsubmit={handleLogin}>
	<h1>Login</h1>
 {#if $error}
   <p style="color: red">{$error}</p>
 {/if}
 <label>
   Username
   <input type="text" bind:value={$username} required />
 </label>
 <label>
   Password
   <input type="password" bind:value={$password} required />
 </label>
 <button type="submit" disabled={$loading}>{$loading ? 'Logging in...' : 'Login'}</button>
</form>
