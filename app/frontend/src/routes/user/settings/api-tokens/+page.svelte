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

<div class="page-header">
    <a href="/user/settings" class="back-link"
        ><span class="icon icon-sm">arrow_back</span></a
    >
    <h1 class="page-title">API Tokens</h1>
</div>

{#if $error}<div class="alert alert-error">{$error}</div>{/if}

{#if createdToken}
    <div class="alert alert-success">
        <p class="font-bold mb-2">
            Token created — copy it now, it won't be shown again:
        </p>
        <code class="token-value">{createdToken}</code>
    </div>
{/if}

<div class="card mb-4">
    <div class="card-header"><h2 class="card-title">Create New Token</h2></div>
    <div class="card-body">
        <form onsubmit={createToken} class="inline-form">
            <div class="form-group" style="flex:1;min-width:180px">
                <label for="token-name" class="form-label">Token Name</label>
                <input
                    id="token-name"
                    type="text"
                    bind:value={newTokenName}
                    placeholder="e.g. CI/CD token"
                    required
                    class="form-input"
                />
            </div>
            <div class="form-group">
                <label for="token-expiry" class="form-label"
                    >Expiry <span class="text-xs text-muted">(optional)</span
                    ></label
                >
                <input
                    id="token-expiry"
                    type="date"
                    bind:value={newTokenExpiry}
                    class="form-input"
                />
            </div>
            <button
                type="submit"
                class="btn btn-primary"
                style="align-self:flex-end">Create</button
            >
        </form>
    </div>
</div>

{#if $loading}
    <p class="text-muted">Loading…</p>
{:else if $tokens.length}
    <div class="list card">
        {#each $tokens as token}
            <div class="list-item">
                <div class="list-item-body">
                    <div class="font-bold">{token.name}</div>
                    <div class="text-xs text-muted">
                        Created {new Date(token.createdAt).toLocaleDateString()}
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
                    class="btn btn-sm btn-danger">Delete</button
                >
            </div>
        {/each}
    </div>
{:else}
    <div class="empty-state">
        <span class="icon">key</span>
        <p>No API tokens yet. Create one above to get started.</p>
    </div>
{/if}
