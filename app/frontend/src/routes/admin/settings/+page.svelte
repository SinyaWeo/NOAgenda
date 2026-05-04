<script lang="ts">
    import { onMount } from 'svelte';
    import { apiGetAuth, apiPatchAuth } from '$lib/api';
    import { writable } from 'svelte/store';
    import { Alert, Button, Input, Label, Toggle } from 'flowbite-svelte';

    const settings = writable<Record<string, string>>({});
    const error = writable('');
    const success = writable('');
    const saving = writable(false);

    let appName = $state('');
    let allowRegistration = $state(true);

    onMount(async () => {
        try {
            const data =
                await apiGetAuth<Record<string, string>>('/admin/settings');
            settings.set(data);
            appName = data['appName'] ?? 'NOAgenda';
            allowRegistration =
                (data['allowRegistration'] ?? 'true') === 'true';
        } catch (_) {
            error.set('Failed to load settings.');
        }
    });

    async function save() {
        saving.set(true);
        error.set('');
        success.set('');
        try {
            await apiPatchAuth('/admin/settings', {
                appName,
                allowRegistration: String(allowRegistration),
            });
            success.set('Settings saved.');
        } catch (_) {
            error.set('Failed to save settings.');
        } finally {
            saving.set(false);
        }
    }
</script>

<svelte:head>
    <title>Admin — Settings</title>
</svelte:head>

<div class="max-w-xl mx-auto">
    <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            App Settings
        </h1>
        <a href="/admin" class="text-sm text-primary-600 dark:text-primary-400"
            >← Admin</a
        >
    </div>

    {#if $error}
        <Alert color="red" class="mb-4">{$error}</Alert>
    {/if}
    {#if $success}
        <Alert color="green" class="mb-4">{$success}</Alert>
    {/if}

    <form
        onsubmit={(e) => {
            e.preventDefault();
            save();
        }}
        class="flex flex-col gap-5"
    >
        <div>
            <Label for="app-name" class="mb-1">App Name</Label>
            <Input id="app-name" bind:value={appName} placeholder="NOAgenda" />
        </div>
        <div class="flex items-center gap-3">
            <Toggle bind:checked={allowRegistration} />
            <span class="text-sm text-gray-700 dark:text-gray-300"
                >Allow new user registration</span
            >
        </div>
        <Button type="submit" disabled={$saving}>
            {$saving ? 'Saving…' : 'Save Settings'}
        </Button>
    </form>
</div>
