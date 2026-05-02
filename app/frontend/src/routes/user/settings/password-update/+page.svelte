<script lang="ts">
    import { writable } from 'svelte/store';
    import { apiPostAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';
    import { EyeOutline, EyeSlashOutline } from 'flowbite-svelte-icons';

    let oldPassword = $state('');
    let newPassword = $state('');
    let confirm = $state('');
    let showPasswords = $state(false);
    const error = writable('');
    const success = writable('');
    const saving = writable(false);

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) goto('/login');
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

<div class="flex items-center gap-3 mb-6">
    <a href="/user/settings" class="text-gray-400 hover:text-gray-600">← Back</a
    >
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
        Change Password
    </h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

<Card class="max-w-xl">
    <form onsubmit={handleSave} class="flex flex-col gap-4">
        <label
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
        >
            <input
                type="checkbox"
                bind:checked={showPasswords}
                class="rounded"
            />
            Show passwords
        </label>
        <div>
            <Label for="old-pw" class="mb-1">Current Password</Label>
            <div class="relative">
                <Input
                    id="old-pw"
                    type={showPasswords ? 'text' : 'password'}
                    bind:value={oldPassword}
                    required
                    class="pr-10"
                />
                <button
                    type="button"
                    onclick={() => (showPasswords = !showPasswords)}
                    class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    >{#if showPasswords}<EyeSlashOutline
                            class="w-4 h-4"
                        />{:else}<EyeOutline class="w-4 h-4" />{/if}</button
                >
            </div>
        </div>
        <div>
            <Label for="new-pw" class="mb-1"
                >New Password <span class="text-xs text-gray-400"
                    >(min 8 characters)</span
                ></Label
            >
            <Input
                id="new-pw"
                type={showPasswords ? 'text' : 'password'}
                bind:value={newPassword}
                required
                minlength={8}
            />
        </div>
        <div>
            <Label for="confirm-pw" class="mb-1">Confirm New Password</Label>
            <Input
                id="confirm-pw"
                type={showPasswords ? 'text' : 'password'}
                bind:value={confirm}
                required
            />
        </div>
        <div class="pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button type="submit" disabled={$saving}
                >{$saving ? 'Updating…' : 'Update Password'}</Button
            >
        </div>
    </form>
</Card>
