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

<div style="max-width:480px">
    <div
        style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"
    >
        <a
            href="/user/settings"
            style="color:#6b7280;text-decoration:none;font-size:1.2rem"
            >&#8592;</a
        >
        <h1 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0">
            Update Email
        </h1>
    </div>

    {#if $error}
        <div
            style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.875rem"
        >
            {$error}
        </div>
    {/if}
    {#if $success}
        <div
            style="background:#f0fdf4;border:1px solid #86efac;color:#166534;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.875rem"
        >
            {$success}
        </div>
    {/if}

    <div
        style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem"
    >
        <p style="margin:0 0 1rem;font-size:0.875rem;color:#64748b">
            A confirmation link will be sent to the new address. You'll need to
            verify it before the change takes effect.
        </p>
        <form
            onsubmit={handleSave}
            style="display:flex;flex-direction:column;gap:1.1rem"
        >
            <div>
                <label
                    for="new-email"
                    style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
                    >New Email Address</label
                >
                <input
                    id="new-email"
                    type="email"
                    bind:value={email}
                    required
                    style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box"
                />
            </div>
            <div>
                <label
                    for="email-pw"
                    style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
                    >Current Password</label
                >
                <input
                    id="email-pw"
                    type="password"
                    bind:value={password}
                    required
                    style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box"
                />
            </div>
            <div style="padding-top:0.5rem;border-top:1px solid #f1f5f9">
                <button
                    type="submit"
                    disabled={$saving}
                    style="background:#6366f1;color:#fff;padding:0.6rem 1.25rem;border:none;border-radius:6px;font-size:0.9rem;font-weight:500;cursor:{$saving
                        ? 'not-allowed'
                        : 'pointer'};opacity:{$saving ? 0.7 : 1}"
                >
                    {$saving ? 'Sending…' : 'Update Email'}
                </button>
            </div>
        </form>
    </div>
</div>
