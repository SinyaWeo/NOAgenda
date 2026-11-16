<script lang="ts">
	import { errMessage } from '$lib/errors';
	import { onMount } from 'svelte';
	import { t, tr, fmt, type MessageKey } from '$lib/i18n';
	import { apiGetAuth, apiPatchAuth } from '$lib/api';
	import { authSession } from '$lib/auth';
	import { derived, writable } from 'svelte/store';
	import {
		Alert,
		Badge,
		Select,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';
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
			error.set(tr('admin.users.loadFailed'));
		}
	}

	async function changeRole(user: User, select: HTMLSelectElement) {
		const newRole = select.value;
		saving.set(user.id);
		try {
			const updated = await apiPatchAuth<User>(`/admin/users/${user.id}/role`, { role: newRole });
			users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
		} catch (e: unknown) {
			select.value = user.role; // the change did not happen: show the role the user really has
			error.set(
				tr('admin.users.roleFailed', {
					username: user.username,
					reason: errMessage(e, tr('admin.users.unknownError'))
				})
			);
		} finally {
			saving.set(null);
		}
	}

	const roleOptions = $derived([
		{ value: 'user', name: $t('admin.users.role.user') },
		{ value: 'admin', name: $t('admin.users.role.admin') }
	]);
</script>

<svelte:head>
	<title>{$t('admin.users.pageTitle')}</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{$t('admin.users.title')}</h1>
		<a href="/admin" class="text-sm text-primary-600 dark:text-primary-400"
			><CaretLeftSolid class="w-4 h-4 inline mr-1" /> {$t('admin.back')}</a
		>
	</div>

	{#if $error}
		<Alert color="red" class="mb-4">{$error}</Alert>
	{/if}

	<Table striped>
		<TableHead>
			<TableHeadCell>{$t('common.field.username')}</TableHeadCell>
			<TableHeadCell>{$t('common.field.email')}</TableHeadCell>
			<TableHeadCell>{$t('admin.users.col.role')}</TableHeadCell>
			<TableHeadCell>{$t('admin.users.col.joined')}</TableHeadCell>
			<TableHeadCell></TableHeadCell>
		</TableHead>
		<TableBody>
			{#each $users as u (u.id)}
				<TableBodyRow>
					<TableBodyCell>
						<span class="font-medium">{u.username}</span>
						{#if u.name}<span class="text-gray-400 ml-1">({u.name})</span>{/if}
					</TableBodyCell>
					<TableBodyCell>{u.email}</TableBodyCell>
					<TableBodyCell>
						<Badge color={u.role === 'admin' ? 'red' : 'blue'}
							>{$t(`admin.users.badge.${u.role}` as MessageKey)}</Badge
						>
					</TableBodyCell>
					<TableBodyCell>
						{$fmt.date(u.createdAt)}
					</TableBodyCell>
					<TableBodyCell>
						{#if $currentUser?.id !== u.id}
							<Select
								size="sm"
								class="w-28"
								items={roleOptions}
								placeholder={$t('admin.users.choose')}
								value={u.role}
								disabled={$saving === u.id}
								onchange={(e) => changeRole(u, e.target as HTMLSelectElement)}
							/>
						{:else}
							<span class="text-xs text-gray-400">{$t('common.you')}</span>
						{/if}
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</div>
