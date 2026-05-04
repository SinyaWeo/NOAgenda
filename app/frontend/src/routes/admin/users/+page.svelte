<script lang="ts">
    import { onMount } from 'svelte';
    import { apiGetAuth, apiPatchAuth } from '$lib/api';
    import { authSession } from '$lib/auth';
    import { derived, writable } from 'svelte/store';
    import {
        Alert,
        Badge,
        Button,
        Select,
        Table,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell,
    } from 'flowbite-svelte';
    import type { User } from '$lib/types';

    const currentUser = derived(authSession, ($s) => $s.user);
    const users = writable<User[]>([]);
    const error = writable('');
    const saving = writable<number | null>(null);

    onMount(async () => {
        await loadUsers();
    });

    async function loadUsers() {
        try {
            const list = await apiGetAuth<User[]>('/admin/users');
            users.set(list);
        } catch (_) {
            error.set('Failed to load users.');
        }
    }

    async function changeRole(user: User, newRole: string) {
        saving.set(user.id);
        try {
            const updated = await apiPatchAuth<User>(
                `/admin/users/${user.id}/role`,
                { role: newRole },
            );
            users.update((list) =>
                list.map((u) => (u.id === updated.id ? updated : u)),
            );
        } catch (_) {
            error.set(`Failed to update role for ${user.username}.`);
        } finally {
            saving.set(null);
        }
    }

    const roleOptions = [
        { value: 'user', name: 'User' },
        { value: 'admin', name: 'Admin' },
    ];
</script>

<svelte:head>
    <title>Admin — Users</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
        <a href="/admin" class="text-sm text-primary-600 dark:text-primary-400"
            >← Admin</a
        >
    </div>

    {#if $error}
        <Alert color="red" class="mb-4">{$error}</Alert>
    {/if}

    <Table striped>
        <TableHead>
            <TableHeadCell>Username</TableHeadCell>
            <TableHeadCell>Email</TableHeadCell>
            <TableHeadCell>Role</TableHeadCell>
            <TableHeadCell>Joined</TableHeadCell>
            <TableHeadCell></TableHeadCell>
        </TableHead>
        <TableBody>
            {#each $users as u}
                <TableBodyRow>
                    <TableBodyCell>
                        <span class="font-medium">{u.username}</span>
                        {#if u.name}<span class="text-gray-400 ml-1"
                                >({u.name})</span
                            >{/if}
                    </TableBodyCell>
                    <TableBodyCell>{u.email}</TableBodyCell>
                    <TableBodyCell>
                        <Badge color={u.role === 'admin' ? 'red' : 'blue'}
                            >{u.role}</Badge
                        >
                    </TableBodyCell>
                    <TableBodyCell>
                        {new Date(u.createdAt).toLocaleDateString()}
                    </TableBodyCell>
                    <TableBodyCell>
                        {#if $currentUser?.id !== u.id}
                            <Select
                                size="sm"
                                class="w-28"
                                items={roleOptions}
                                value={u.role}
                                disabled={$saving === u.id}
                                onchange={(e) =>
                                    changeRole(
                                        u,
                                        (e.target as HTMLSelectElement).value,
                                    )}
                            />
                        {:else}
                            <span class="text-xs text-gray-400">You</span>
                        {/if}
                    </TableBodyCell>
                </TableBodyRow>
            {/each}
        </TableBody>
    </Table>
</div>
