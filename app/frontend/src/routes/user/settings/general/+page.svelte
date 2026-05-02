<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, apiPostAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';

    const name = writable('');
    const language = writable('en');
    const timezone = writable('UTC');
    const theme = writable('light');
    const weekStart = writable(1);
    const error = writable('');
    const success = writable('');
    const loading = writable(true);
    const saving = writable(false);

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
            return;
        }
        try {
            const settings = await apiGetAuth<any>('/user/settings/general');
            name.set(settings.name ?? '');
            language.set(settings.language ?? 'en');
            timezone.set(settings.timezone ?? 'UTC');
            theme.set(settings.theme ?? 'light');
            weekStart.set(settings.weekStart ?? 1);
        } catch (e: any) {
            error.set(e.message);
        } finally {
            loading.set(false);
        }
    });

    async function handleSave(e: Event) {
        e.preventDefault();
        saving.set(true);
        error.set('');
        success.set('');
        try {
            await apiPostAuth('/user/settings/general', {
                name: $name,
                language: $language,
                timezone: $timezone,
                theme: $theme,
                weekStart: $weekStart,
            });
            success.set('Settings saved.');
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
    <h1 class="page-title">General Settings</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}
{#if $success}<div class="alert alert-success">{$success}</div>{/if}

{#if $loading}
    <p class="text-muted">Loading…</p>
{:else}
    <div class="card">
        <div class="card-body">
            <form onsubmit={handleSave}>
                <div class="form-group">
                    <label for="gen-name" class="form-label">Display Name</label
                    >
                    <input
                        id="gen-name"
                        type="text"
                        bind:value={$name}
                        class="form-input"
                    />
                </div>
                <div class="form-group">
                    <label for="gen-language" class="form-label">Language</label
                    >
                    <select
                        id="gen-language"
                        bind:value={$language}
                        class="form-select"
                    >
                        <option value="en">English</option>
                        <option value="de">German</option>
                        <option value="fr">French</option>
                        <option value="cs">Czech</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="gen-timezone" class="form-label">Timezone</label
                    >
                    <input
                        id="gen-timezone"
                        type="text"
                        bind:value={$timezone}
                        placeholder="e.g. Europe/Prague"
                        class="form-input"
                    />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="gen-theme" class="form-label">Theme</label>
                        <select
                            id="gen-theme"
                            bind:value={$theme}
                            class="form-select"
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="gen-weekstart" class="form-label"
                            >Week starts on</label
                        >
                        <select
                            id="gen-weekstart"
                            bind:value={$weekStart}
                            class="form-select"
                        >
                            <option value={0}>Sunday</option>
                            <option value={1}>Monday</option>
                        </select>
                    </div>
                </div>
                <div
                    style="padding-top:0.5rem;border-top:1px solid var(--na-border)"
                >
                    <button
                        type="submit"
                        disabled={$saving}
                        class="btn btn-primary"
                    >
                        {$saving ? 'Saving…' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
