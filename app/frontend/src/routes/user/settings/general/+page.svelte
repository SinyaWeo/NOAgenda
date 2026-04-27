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

<div style="max-width:560px">
    <div
        style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"
    >
        <a
            href="/user/settings"
            style="color:#6b7280;text-decoration:none;font-size:1.2rem"
            >&#8592;</a
        >
        <h1 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0">
            General Settings
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

    {#if $loading}
        <p style="color:#64748b">Loading…</p>
    {:else}
        <div
            style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem"
        >
            <form
                onsubmit={handleSave}
                style="display:flex;flex-direction:column;gap:1.1rem"
            >
                <div>
                    <label
                        for="gen-name"
                        style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
                        >Display Name</label
                    >
                    <input
                        id="gen-name"
                        type="text"
                        bind:value={$name}
                        style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box"
                    />
                </div>
                <div>
                    <label
                        for="gen-language"
                        style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
                        >Language</label
                    >
                    <select
                        id="gen-language"
                        bind:value={$language}
                        style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box;background:#fff"
                    >
                        <option value="en">English</option>
                        <option value="de">German</option>
                        <option value="fr">French</option>
                        <option value="cs">Czech</option>
                    </select>
                </div>
                <div>
                    <label
                        for="gen-timezone"
                        style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
                        >Timezone</label
                    >
                    <input
                        id="gen-timezone"
                        type="text"
                        bind:value={$timezone}
                        placeholder="e.g. Europe/Prague"
                        style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box"
                    />
                </div>
                <div
                    style="display:grid;grid-template-columns:1fr 1fr;gap:1rem"
                >
                    <div>
                        <label
                            for="gen-theme"
                            style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
                            >Theme</label
                        >
                        <select
                            id="gen-theme"
                            bind:value={$theme}
                            style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box;background:#fff"
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System</option>
                        </select>
                    </div>
                    <div>
                        <label
                            for="gen-weekstart"
                            style="display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:0.3rem"
                            >Week starts on</label
                        >
                        <select
                            id="gen-weekstart"
                            bind:value={$weekStart}
                            style="width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;box-sizing:border-box;background:#fff"
                        >
                            <option value={0}>Sunday</option>
                            <option value={1}>Monday</option>
                        </select>
                    </div>
                </div>
                <div style="padding-top:0.5rem;border-top:1px solid #f1f5f9">
                    <button
                        type="submit"
                        disabled={$saving}
                        style="background:#6366f1;color:#fff;padding:0.6rem 1.25rem;border:none;border-radius:6px;font-size:0.9rem;font-weight:500;cursor:{$saving
                            ? 'not-allowed'
                            : 'pointer'};opacity:{$saving ? 0.7 : 1}"
                    >
                        {$saving ? 'Saving…' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    {/if}
</div>
