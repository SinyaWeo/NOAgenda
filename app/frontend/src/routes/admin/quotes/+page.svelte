<script lang="ts">
    import { onMount } from 'svelte';
    import {
        apiGetAuth,
        apiPostAuth,
        apiPutAuth,
        apiDeleteAuth,
    } from '$lib/api';
    import { writable } from 'svelte/store';
    import {
        Badge,
        Button,
        Checkbox,
        Input,
        Label,
        Modal,
        Table,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell,
        Textarea,
    } from 'flowbite-svelte';
    import {
        PlusOutline,
        EditOutline,
        TrashBinOutline,
        QuoteOutline,
        CaretLeftSolid,
    } from 'flowbite-svelte-icons';
    import type { Quote } from '$lib/types';

    const quotes = writable<Quote[]>([]);
    const error = writable('');
    const loading = writable(true);
    const showModal = writable(false);
    const saving = writable(false);
    const editingId = writable<number | null>(null);

    let formText = $state('');
    let formAuthor = $state('');
    let formActive = $state(true);

    onMount(async () => {
        await loadQuotes();
    });

    async function loadQuotes() {
        loading.set(true);
        error.set('');
        try {
            const list = await apiGetAuth<Quote[]>('/quotes');
            quotes.set(list);
        } catch (_) {
            error.set('Could not load quotes. Try refreshing.');
        } finally {
            loading.set(false);
        }
    }

    function openNew() {
        editingId.set(null);
        formText = '';
        formAuthor = '';
        formActive = true;
        showModal.set(true);
    }

    function openEdit(q: Quote) {
        editingId.set(q.id);
        formText = q.text;
        formAuthor = q.author ?? '';
        formActive = q.isActive;
        showModal.set(true);
    }

    async function save() {
        saving.set(true);
        try {
            const body = {
                text: formText,
                author: formAuthor || undefined,
                isActive: formActive,
            };
            const id = $editingId;
            if (id) {
                const updated = await apiPutAuth<Quote>(`/quotes/${id}`, body);
                quotes.update((list) =>
                    list.map((q) => (q.id === updated.id ? updated : q)),
                );
            } else {
                const created = await apiPostAuth<Quote>('/quotes', body);
                quotes.update((list) => [...list, created]);
            }
            showModal.set(false);
        } catch (_) {
            error.set('Failed to save quote.');
        } finally {
            saving.set(false);
        }
    }

    async function remove(q: Quote) {
        if (!confirm(`Delete quote by ${q.author ?? 'unknown'}?`)) return;
        try {
            await apiDeleteAuth(`/quotes/${q.id}`);
            quotes.update((list) => list.filter((x) => x.id !== q.id));
        } catch (_) {
            error.set('Failed to delete quote.');
        }
    }
</script>

<svelte:head>
    <title>Admin — Quotes</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Motivational Quotes
        </h1>
        <div class="flex items-center gap-3">
            <a
                href="/admin"
                class="text-sm text-primary-600 dark:text-primary-400"
                ><CaretLeftSolid class="w-4 h-4 inline mr-1" /> Admin</a
            >
            <Button size="sm" onclick={openNew}>
                <PlusOutline class="w-4 h-4 mr-1" />New Quote
            </Button>
        </div>
    </div>

    {#if $loading}
        <p class="text-gray-400">Loading…</p>
    {:else if $error}
        <p class="text-sm text-gray-500 dark:text-gray-400">{$error}</p>
    {:else if $quotes.length === 0}
        <div class="text-center py-12 text-gray-400">
            <QuoteOutline class="w-12 h-12 mx-auto mb-3" />
            <p>
                No quotes yet.
                <button
                    type="button"
                    onclick={openNew}
                    class="text-primary-600 dark:text-primary-400 hover:underline"
                    >Create one.</button
                >
            </p>
        </div>
    {:else}
        <Table striped>
            <TableHead>
                <TableHeadCell>Quote</TableHeadCell>
                <TableHeadCell>Author</TableHeadCell>
                <TableHeadCell>Active</TableHeadCell>
                <TableHeadCell></TableHeadCell>
            </TableHead>
            <TableBody>
                {#each $quotes as q (q.id)}
                    <TableBodyRow>
                        <TableBodyCell class="max-w-sm">
                            <p class="line-clamp-2 text-sm">{q.text}</p>
                        </TableBodyCell>
                        <TableBodyCell>{q.author ?? '—'}</TableBodyCell>
                        <TableBodyCell>
                            <Badge color={q.isActive ? 'green' : 'gray'}
                                >{q.isActive ? 'Active' : 'Inactive'}</Badge
                            >
                        </TableBodyCell>
                        <TableBodyCell>
                            <div class="flex items-center gap-2">
                                <Button
                                    size="xs"
                                    color="light"
                                    onclick={() => openEdit(q)}
                                >
                                    <EditOutline class="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    size="xs"
                                    color="red"
                                    onclick={() => remove(q)}
                                >
                                    <TrashBinOutline class="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </TableBodyCell>
                    </TableBodyRow>
                {/each}
            </TableBody>
        </Table>
    {/if}
</div>

<Modal
    title={$editingId ? 'Edit Quote' : 'New Quote'}
    bind:open={$showModal}
    size="md"
>
    <div class="flex flex-col gap-4">
        <div>
            <Label for="q-text" class="mb-1">Quote text *</Label>
            <Textarea
                id="q-text"
                rows={4}
                bind:value={formText}
                placeholder="Enter the quote…"
                required
            />
        </div>
        <div>
            <Label for="q-author" class="mb-1">Author</Label>
            <Input
                id="q-author"
                bind:value={formAuthor}
                placeholder="e.g. Albert Einstein"
            />
        </div>
        <Checkbox bind:checked={formActive}>Active (show on dashboard)</Checkbox
        >
    </div>
    {#snippet footer()}
        <Button onclick={save} disabled={!formText.trim() || $saving}>
            {$saving ? 'Saving…' : 'Save'}
        </Button>
        <Button color="light" onclick={() => showModal.set(false)}
            >Cancel</Button
        >
    {/snippet}
</Modal>
