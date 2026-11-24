<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import DeleteUserDialog from '$lib/components/DeleteUserDialog.svelte';
	import UserProjectsDialog from '$lib/components/UserProjectsDialog.svelte';
	import { errMessage } from '$lib/errors';
	import { onMount } from 'svelte';
	import { t, tr, fmt, type MessageKey } from '$lib/i18n';
	import { apiGetAuth, apiPatchAuth } from '$lib/api';
	import { showToast } from '$lib/toast';
	import { authSession } from '$lib/auth';
	import { derived, writable } from 'svelte/store';
	import {
		Alert,
		Button,
		Select,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { FolderOpenSolid, LockSolid, LockOpenSolid, TrashBinSolid } from 'flowbite-svelte-icons';
	import type { User } from '$lib/types';

	const currentUser = derived(authSession, ($s) => $s.user);
	const users = writable<User[]>([]);
	const error = writable('');
	const saving = writable<number | null>(null);
	/** The user the delete dialog is open for. */
	let deleting = $state<User | null>(null);
	/** The user whose projects dialog is open. */
	let showingProjects = $state<User | null>(null);

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

	async function toggleLock(user: User) {
		const locked = !user.isLocked;
		saving.set(user.id);
		try {
			const updated = await apiPatchAuth<User>(`/admin/users/${user.id}/lock`, { locked });
			users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
			showToast(tr(locked ? 'admin.users.locked' : 'admin.users.unlocked', { username: user.username }));
		} catch (e: unknown) {
			error.set(
				tr('admin.users.lockFailed', {
					username: user.username,
					reason: errMessage(e, tr('admin.users.unknownError'))
				})
			);
		} finally {
			saving.set(null);
		}
	}

	function userDeleted(user: User) {
		deleting = null;
		users.update((list) => list.filter((u) => u.id !== user.id));
		showToast(tr('admin.users.deleted', { username: user.username }));
	}

	const roleOptions = $derived([
		{ value: 'user', name: $t('admin.users.role.user') },
		{ value: 'admin', name: $t('admin.users.role.admin') }
	]);
</script>

<svelte:head>
	<title>{$t('admin.users.pageTitle')}</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
	<PageHeader title={$t('admin.users.title')} back={{ href: '/admin', label: $t('admin.back') }} />

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
						{#if u.name}<span class="text-gray-500 dark:text-gray-400 ml-1">({u.name})</span>{/if}
					</TableBodyCell>
					<TableBodyCell>{u.email}</TableBodyCell>
					<TableBodyCell>
						<span class="text-xs font-medium {u.role === 'admin' ? 'tone-red' : 'tone-blue'}">
							{$t(`admin.users.badge.${u.role}` as MessageKey)}
						</span>
						{#if u.isLocked}<span class="ml-1 text-xs font-medium tone-yellow">
								{$t('admin.users.badge.locked')}
							</span>{/if}
					</TableBodyCell>
					<TableBodyCell>
						{$fmt.date(u.createdAt)}
					</TableBodyCell>
					<TableBodyCell>
						{@const isSelf = $currentUser?.id === u.id}
						<div class="flex flex-wrap items-center gap-2">
							{#if isSelf}
								<span class="text-xs text-gray-500 dark:text-gray-400 w-28">{$t('common.you')}</span>
							{:else}
								<Select
									size="sm"
									class="w-28"
									items={roleOptions}
									placeholder={$t('admin.users.choose')}
									value={u.role}
									disabled={$saving === u.id}
									onchange={(e) => changeRole(u, e.target as HTMLSelectElement)}
								/>
							{/if}
							<Button
								size="xs"
								color="alternative"
								class="p-2"
								title={$t('admin.users.projectsTip')}
								aria-label={$t('admin.users.projectsTip')}
								onclick={() => (showingProjects = u)}
							>
								<FolderOpenSolid class="w-4 h-4" />
							</Button>
							<Button
								size="xs"
								color="alternative"
								class="p-2"
								title={$t(u.isLocked ? 'admin.users.unlockTip' : 'admin.users.lockTip')}
								aria-label={$t(u.isLocked ? 'admin.users.unlockTip' : 'admin.users.lockTip')}
								disabled={isSelf || $saving === u.id}
								onclick={() => toggleLock(u)}
							>
								{#if u.isLocked}<LockOpenSolid class="w-4 h-4" />{:else}<LockSolid class="w-4 h-4" />{/if}
							</Button>
							<Button
								size="xs"
								color="red"
								class="p-2"
								title={$t('admin.users.deleteTip')}
								aria-label={$t('admin.users.deleteTip')}
								disabled={isSelf || $saving === u.id}
								onclick={() => (deleting = u)}
							>
								<TrashBinSolid class="w-4 h-4" />
							</Button>
						</div>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</div>

<UserProjectsDialog
	user={showingProjects}
	users={$users}
	currentUserId={$currentUser?.id}
	onclose={() => (showingProjects = null)}
/>

<DeleteUserDialog
	user={deleting}
	users={$users}
	currentUserId={$currentUser?.id}
	onclose={() => (deleting = null)}
	ondeleted={userDeleted}
/>
