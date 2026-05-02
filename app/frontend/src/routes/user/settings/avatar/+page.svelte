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
            Avatar
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
        <div
            style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1.25rem"
        >
            {#if $avatarUrl}
                <img
                    src={$avatarUrl.startsWith('http')
                        ? $avatarUrl
                        : `${API_BASE}${$avatarUrl}`}
                    alt="Current avatar"
                    style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0"
                />
            {:else}
                <div
                    style="width:72px;height:72px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:1.75rem;color:#94a3b8"
                >
                    &#128100;
                </div>
            {/if}
            <div>
                <p
                    style="margin:0 0 0.25rem;font-size:0.9rem;font-weight:500;color:#374151"
                >
                    Profile photo
                </p>
                <p style="margin:0;font-size:0.8rem;color:#94a3b8">
                    JPG, PNG, GIF or WebP. Max 5 MB.
                </p>
            </div>
        </div>
        <label
            for="avatar-upload"
            style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.6rem 1.1rem;background:#6366f1;color:#fff;border-radius:6px;cursor:pointer;font-size:0.9rem;font-weight:500"
        >
            &#8593; Upload new photo
            <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onchange={uploadAvatar}
                style="display:none"
            />
        </label>
    </div>
</div>
