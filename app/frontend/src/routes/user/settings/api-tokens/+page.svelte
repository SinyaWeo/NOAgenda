<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';

    const tokens = writable<any[]>([]);
    const loading = writable(true);
    const error = writable('');
    const success = writable('');
    let newTokenName = '';
    let newTokenExpiry = '';
    let createdToken = '';

    async function loadTokens() {
        tokens.set(await apiGetAuth<any[]>('/tokens'));
    }

    async function createToken(e: Event) {
        e.preventDefault();
        error.set('');
        createdToken = '';
        try {
            const result = await apiPostAuth<any>('/tokens', {
                name: newTokenName,
                expiresAt: newTokenExpiry
                    ? new Date(newTokenExpiry).toISOString()
                    : null,
            });
            createdToken = result.rawToken ?? '';
            newTokenName = '';
            newTokenExpiry = '';
            await loadTokens();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    async function deleteToken(id: number) {
        try {
            await apiDeleteAuth(`/tokens/${id}`);
            await loadTokens();
        } catch (e: any) {
            error.set(e.message);
        }
    }

    onMount(async () => {
        const me = await getCurrentUser();
        if (!me) {
            goto('/login');
            return;
        }
        try {
            await loadTokens();
        } catch (e: any) {
            error.set(e.message);
        } finally {
            loading.set(false);
        }
    });
</script>

<div style="max-width:700px">
    <div
        style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"
    >
        <a
            href="/user/settings"
            style="color:#6b7280;text-decoration:none;font-size:1.2rem"
            >&#8592;</a
        >
        <h1 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0">
            API Tokens
        </h1>
    </div>

    {#if $error}
        <div
            style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.875rem"
        >
            {$error}
        </div>
    {/if}

    {#if createdToken}
        <div
            style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:1rem;margin-bottom:1.25rem"
        >
            <p
                style="margin:0 0 0.5rem;font-size:0.875rem;font-weight:600;color:#166534"
            >
                Token created — copy it now, it won't be shown again:
            </p>
            <code
                style="display:block;padding:0.5rem 0.75rem;background:#dcfce7;border-radius:5px;font-size:0.85rem;word-break:break-all;color:#15803d"
                >{createdToken}</code
            >
        </div>
    {/if}

    <div
        style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem;margin-bottom:1.5rem"
    >
        <h2
            style="font-size:0.95rem;font-weight:600;color:#374151;margin:0 0 1rem"
        >
            Create New Token
        </h2>
        <form
            onsubmit={createToken}
            style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:flex-end"
        >
            <div style="flex:1;min-width:180px">
                <label
                    for="token-name"
                    style="display:block;font-size:0.8rem;font-weight:500;color:#374151;margin-bottom:0.25rem"
                    >Token Name</label
                >
                <input
                    id="token-name"
                    type="text"
                    bind:value={newTokenName}
                    placeholder="e.g. CI/CD token"
                    required
                    style="width:100%;padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;box-sizing:border-box"
                />
            </div>
            <div>
                <label
                    for="token-expiry"
                    style="display:block;font-size:0.8rem;font-weight:500;color:#374151;margin-bottom:0.25rem"
                    >Expiry <span style="color:#9ca3af">(optional)</span></label
                >
                <input
                    id="token-expiry"
                    type="date"
                    bind:value={newTokenExpiry}
                    style="padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem"
                />
            </div>
            <button
                type="submit"
                style="padding:0.55rem 1.1rem;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:0.9rem;font-weight:500;cursor:pointer"
                >Create</button
            >
        </form>
    </div>

    {#if $loading}
        <p style="color:#64748b">Loading…</p>
    {:else if $tokens.length}
        <div style="display:flex;flex-direction:column;gap:0.6rem">
            {#each $tokens as token}
                <div
                    style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:0.9rem 1rem;display:flex;justify-content:space-between;align-items:center;gap:1rem"
                >
                    <div>
                        <div
                            style="font-size:0.9rem;font-weight:600;color:#1e293b"
                        >
                            {token.name}
                        </div>
                        <div
                            style="font-size:0.8rem;color:#64748b;margin-top:0.1rem"
                        >
                            Created {new Date(
                                token.createdAt,
                            ).toLocaleDateString()}
                            &middot; Expires {token.expiresAt
                                ? new Date(token.expiresAt).toLocaleDateString()
                                : 'Never'}
                            {#if token.lastUsedAt}&middot; Last used {new Date(
                                    token.lastUsedAt,
                                ).toLocaleDateString()}{/if}
                        </div>
                    </div>
                    <button
                        onclick={() => deleteToken(token.id)}
                        style="flex-shrink:0;padding:0.35rem 0.75rem;background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;border-radius:5px;cursor:pointer;font-size:0.8rem;font-weight:500"
                        >Delete</button
                    >
                </div>
            {/each}
        </div>
    {:else}
        <div
            style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:2rem;text-align:center"
        >
            <p style="color:#94a3b8;margin:0">
                No API tokens yet. Create one above to get started.
            </p>
        </div>
    {/if}
</div>
