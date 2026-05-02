<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, getToken, API_BASE } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';

    const avatarUrl = writable('');
    const error = writable('');
    const success = writable('');

    async function uploadAvatar(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('avatar', file);
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(API_BASE + '/user/settings/avatar/upload', {
            method: 'PUT',
            headers,
            body: fd,
        });
        if (!res.ok) {
            error.set('Upload failed');
            return;
        }
        const data = await res.json();
        avatarUrl.set(data.avatarUrl ?? '');
        success.set('Avatar updated.');
        input.value = '';
    }

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
            return;
        }
        try {
            const data = await apiGetAuth<any>('/user/settings/avatar');
            avatarUrl.set(data.avatarUrl ?? '');
        } catch (e: any) {
            error.set(e.message);
        }
    });
</script>

<div class="page-header">
    <a href="/user/settings" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">Avatar</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}
{#if $success}<div class="alert alert-success">{$success}</div>{/if}

<div class="card">
    <div class="card-body">
        <div class="flex-center gap-3 mb-4">
            {#if $avatarUrl}
                <img
                    src={$avatarUrl.startsWith('http')
                        ? $avatarUrl
                        : `${API_BASE}${$avatarUrl}`}
                    alt="Current avatar"
                    class="avatar-img"
                    style="width:72px;height:72px"
                />
            {:else}
                <span
                    class="avatar-initials"
                    style="width:72px;height:72px;font-size:1.75rem"
                >
                    <span class="icon">person</span>
                </span>
            {/if}
            <div>
                <p class="font-medium mb-0">Profile photo</p>
                <p class="text-xs text-muted mb-0">
                    JPG, PNG, GIF or WebP. Max 5 MB.
                </p>
            </div>
        </div>
        <label
            for="avatar-upload"
            class="btn btn-primary"
            style="cursor:pointer"
        >
            <span class="icon icon-sm">upload</span> Upload new photo
            <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onchange={uploadAvatar}
                class="sr-only"
            />
        </label>
    </div>
</div>
