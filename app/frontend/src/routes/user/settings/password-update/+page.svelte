<script lang="ts">
    import { writable } from 'svelte/store';
    import { apiPostAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    let oldPassword = '';
    let newPassword = '';
    let confirm = '';
    const error = writable('');
    const success = writable('');
    const saving = writable(false);
    let showPasswords = false;

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
        }
    });

    async function handleSave(e: Event) {
        e.preventDefault();
        if (newPassword !== confirm) {
            error.set('Passwords do not match');
            return;
        }
        saving.set(true);
        error.set('');
        success.set('');
        try {
            await apiPostAuth('/user/settings/password', {
                oldPassword,
                newPassword,
            });
            success.set('Password updated.');
            oldPassword = '';
            newPassword = '';
            confirm = '';
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
    <h1 class="page-title">Change Password</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}
{#if $success}<div class="alert alert-success">{$success}</div>{/if}

<div class="card">
    <div class="card-body">
        <div class="form-group">
            <label class="filter-label">
                <input type="checkbox" bind:checked={showPasswords} />
                Show passwords
            </label>
        </div>
        <form onsubmit={handleSave}>
            <div class="form-group">
                <label for="old-pw" class="form-label">Current Password</label>
                <input
                    id="old-pw"
                    type={showPasswords ? 'text' : 'password'}
                    bind:value={oldPassword}
                    required
                    class="form-input"
                />
            </div>
            <div class="form-group">
                <label for="new-pw" class="form-label"
                    >New Password <span class="text-xs text-muted"
                        >(min 8 characters)</span
                    ></label
                >
                <input
                    id="new-pw"
                    type={showPasswords ? 'text' : 'password'}
                    bind:value={newPassword}
                    required
                    minlength={8}
                    class="form-input"
                />
            </div>
            <div class="form-group">
                <label for="confirm-pw" class="form-label"
                    >Confirm New Password</label
                >
                <input
                    id="confirm-pw"
                    type={showPasswords ? 'text' : 'password'}
                    bind:value={confirm}
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
                    {$saving ? 'Updating…' : 'Update Password'}
                </button>
            </div>
        </form>
    </div>
</div>
