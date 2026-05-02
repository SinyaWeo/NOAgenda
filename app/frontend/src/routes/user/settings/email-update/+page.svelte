<script lang="ts">
    import { writable } from 'svelte/store';
    import { apiPostAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    let email = '';
    let password = '';
    const error = writable('');
    const success = writable('');
    const saving = writable(false);

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
        }
    });

    async function handleSave(e: Event) {
        e.preventDefault();
        saving.set(true);
        error.set('');
        success.set('');
        try {
            await apiPostAuth('/user/settings/email', { email, password });
            success.set('Email update request sent. Check your inbox.');
            email = '';
            password = '';
        } catch (e: any) {
            error.set(e.message);
        } finally {
            saving.set(false);
        }
    }
</script>

<div class="page-header">
    <a href="/user/settings" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">Update Email</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}
{#if $success}<div class="alert alert-success">{$success}</div>{/if}

<div class="card">
    <div class="card-body">
        <p class="text-sm text-muted mb-4">
            A confirmation link will be sent to the new address. You'll need to
            verify it before the change takes effect.
        </p>
        <form onsubmit={handleSave}>
            <div class="form-group">
                <label for="new-email" class="form-label"
                    >New Email Address</label
                >
                <input
                    id="new-email"
                    type="email"
                    bind:value={email}
                    required
                    class="form-input"
                />
            </div>
            <div class="form-group">
                <label for="email-pw" class="form-label">Current Password</label
                >
                <input
                    id="email-pw"
                    type="password"
                    bind:value={password}
                    required
                    class="form-input"
                />
            </div>
            <div
                style="padding-top:0.5rem;border-top:1px solid var(--na-border)"
            >
                <button
                    type="submit"
                    disabled={$saving}
                    class="btn btn-primary"
                >
                    {$saving ? 'Sending…' : 'Update Email'}
                </button>
            </div>
        </form>
    </div>
</div>
