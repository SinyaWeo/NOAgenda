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
        <p class="state-msg">Loading…</p>
    {:else if $error}
        <p class="state-msg error">{$error}</p>
    {:else if $user}
        <div class="profile-card">
            <!-- Avatar -->
            <div class="avatar-wrap">
                {#if $user.avatarUrl}
                    <img
                        src={resolveUrl($user.avatarUrl)}
                        alt="Avatar"
                        class="avatar-img"
                    />
                {:else}
                    <div class="avatar-initials">{getInitials($user)}</div>
                {/if}
            </div>

            <!-- Identity -->
            <h1 class="display-name">{$user.name ?? $user.username}</h1>
            <p class="username">@{$user.username}</p>

            <!-- Details -->
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
                    <dd style="text-transform: capitalize">
                        {$user.theme ?? 'light'}
                    </dd>
                </div>
            </dl>

            <a href="/user/settings/general" class="edit-btn">Edit Profile</a>
        </div>
    {/if}
</div>

<style>
    .profile-page {
        max-width: 480px;
        margin: 2rem auto;
    }

    .state-msg {
        color: var(--na-text-muted, #64748b);
        text-align: center;
        padding: 2rem;
    }
    .state-msg.error {
        color: #ef4444;
    }

    .profile-card {
        background: var(--na-surface, #fff);
        border: 1px solid var(--na-border, #e2e8f0);
        border-radius: 12px;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .avatar-wrap {
        margin-bottom: 0.5rem;
    }

    .avatar-img {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
    }

    .avatar-initials {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: var(--na-primary, #6366f1);
        color: #fff;
        font-size: 1.6rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
    }

    .display-name {
        font-size: 1.4rem;
        font-weight: 700;
        margin: 0;
        color: var(--na-text, #1e293b);
    }

    .username {
        margin: 0;
        color: var(--na-text-muted, #64748b);
        font-size: 0.9rem;
    }

    .detail-list {
        width: 100%;
        margin: 1rem 0 0;
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 0.55rem 0;
        border-bottom: 1px solid var(--na-border, #e2e8f0);
        font-size: 0.875rem;
    }
    .detail-row:last-child {
        border-bottom: none;
    }

    dt {
        color: var(--na-text-muted, #64748b);
        font-weight: 500;
    }

    dd {
        margin: 0;
        color: var(--na-text, #1e293b);
    }

    .edit-btn {
        display: inline-block;
        margin-top: 1.25rem;
        padding: 0.5rem 1.5rem;
        background: var(--na-primary, #6366f1);
        color: #fff;
        border-radius: 6px;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        transition: opacity 0.15s;
    }
    .edit-btn:hover {
        opacity: 0.85;
    }
</style>
