<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, API_BASE } from '$lib/api';

    function resolveUrl(path: string | undefined): string {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${API_BASE}${path}`;
    }

    const user = writable<any>(null);
    const loading = writable(true);
    const error = writable('');

    onMount(async () => {
        try {
            const me = await apiGetAuth<any>('/users/me');
            user.set(me);
        } catch (e: any) {
            error.set('Failed to load profile.');
        } finally {
            loading.set(false);
        }
    });

    function getInitials(u: any): string {
        const name: string = u.name ?? u.username ?? 'U';
        return name
            .split(' ')
            .map((w: string) => w[0] ?? '')
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    function formatDate(d: string | undefined): string {
        if (!d) return '—';
        return new Date(d).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }
</script>

<div class="profile-page">
    {#if $loading}
        <p class="text-muted text-center">Loading…</p>
    {:else if $error}
        <div class="alert alert-error">{$error}</div>
    {:else if $user}
        <div class="profile-card">
            <div class="profile-avatar-wrap">
                {#if $user.avatarUrl}
                    <img
                        src={resolveUrl($user.avatarUrl)}
                        alt="Avatar"
                        class="profile-avatar-img"
                    />
                {:else}
                    <div class="profile-avatar-initials">
                        {getInitials($user)}
                    </div>
                {/if}
            </div>

            <h1 class="profile-display-name">{$user.name ?? $user.username}</h1>
            <p class="profile-username">@{$user.username}</p>

            <dl class="detail-list">
                <div class="detail-row">
                    <dt>Email</dt>
                    <dd>{$user.email ?? '—'}</dd>
                </div>
                <div class="detail-row">
                    <dt>Member since</dt>
                    <dd>{formatDate($user.createdAt)}</dd>
                </div>
                <div class="detail-row">
                    <dt>Language</dt>
                    <dd>{$user.language ?? 'en'}</dd>
                </div>
                <div class="detail-row">
                    <dt>Timezone</dt>
                    <dd>{$user.timezone ?? 'UTC'}</dd>
                </div>
                <div class="detail-row">
                    <dt>Theme</dt>
                    <dd style="text-transform:capitalize">
                        {$user.theme ?? 'light'}
                    </dd>
                </div>
            </dl>

            <a
                href="/user/settings/general"
                class="btn btn-primary"
                style="margin-top:1.25rem">Edit Profile</a
            >
        </div>
    {/if}
</div>
