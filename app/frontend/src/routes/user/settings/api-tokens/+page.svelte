<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { apiGetAuth, apiPostAuth, apiDeleteAuth } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';
    import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';
    import { ApiKeyOutline } from 'flowbite-svelte-icons';

    const tokens = writable<any[]>([]);
    const loading = writable(true);
    const error = writable('');
    const success = writable('');
    let newTokenName = $state('');
    let newTokenExpiry = $state('');
    let createdToken = $state('');

    async function loadTokens() {
        tokens.set(await apiGetAuth<any[]>('/tokens'));
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
</script>

<div class="flex items-center gap-3 mb-6">
    <a href="/user/settings" class="text-gray-400 hover:text-gray-600">← Back</a
    >
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
        API Tokens
    </h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if createdToken}
    <Alert color="green" class="mb-4">
        <p class="font-bold mb-2">
            Token created — copy it now, it won't be shown again:
        </p>
        <code class="token-value break-all font-mono text-sm"
            >{createdToken}</code
        >
    </Alert>
{/if}

<Card class="mb-4">
    <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
        Create New Token
    </h2>
    <form onsubmit={createToken} class="flex flex-wrap gap-3 items-end">
        <div class="flex-1 min-w-40">
            <Label for="token-name" class="mb-1">Token Name</Label>
            <Input
                id="token-name"
                type="text"
                bind:value={newTokenName}
                placeholder="e.g. CI/CD token"
                required
            />
        </div>
        <div>
            <Label for="token-expiry" class="mb-1"
                >Expiry <span class="text-xs text-gray-400">(optional)</span
                ></Label
            >
            <Input id="token-expiry" type="date" bind:value={newTokenExpiry} />
        </div>
        <Button type="submit">Create</Button>
    </form>
</Card>

{#if $loading}
    <p class="text-gray-400">Loading…</p>
{:else if $tokens.length}
    <Card class="p-0 overflow-hidden">
        {#each $tokens as token, i}
            <div
                class="flex items-center gap-3 px-4 py-3 {i < $tokens.length - 1
                    ? 'border-b border-gray-100 dark:border-gray-700'
                    : ''}"
            >
                <div class="flex-1">
                    <p
                        class="font-bold text-sm text-gray-900 dark:text-white m-0"
                    >
                        {token.name}
                    </p>
                    <p class="text-xs text-gray-400 m-0">
                        Created {new Date(token.createdAt).toLocaleDateString()}
                        · Expires {token.expiresAt
                            ? new Date(token.expiresAt).toLocaleDateString()
                            : 'Never'}{#if token.lastUsedAt}
                            · Last used {new Date(
                                token.lastUsedAt,
                            ).toLocaleDateString()}{/if}
                    </p>
                </div>
                <Button
                    size="xs"
                    color="red"
                    onclick={() => deleteToken(token.id)}>Delete</Button
                >
            </div>
        {/each}
    </Card>
{:else}
    <div class="text-center py-10 text-gray-400">
        <ApiKeyOutline class="w-10 h-10 mx-auto mb-2" />
        <p>No API tokens yet. Create one above.</p>
    </div>
{/if}
