<script lang="ts">
	import { singleUserMode } from '#lib/appConfig.svelte.js';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import DeleteUserDialog from '#lib/components/DeleteUserDialog.svelte';
	import AddUserDialog from '#lib/components/AddUserDialog.svelte';
	import UserProjectsDialog from '#lib/components/UserProjectsDialog.svelte';
	import { errMessage } from '#lib/errors.js';
	import { onMount } from 'svelte';
	import { t, fmt, type MessageKey } from '#lib/i18n/index.js';
	import { apiGetAuth, apiPatchAuth, apiPostAuth } from '#lib/api.js';
	import { showToast } from '#lib/toast.svelte.js';
	import { authSession } from '#lib/auth.svelte.js';
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
	import {
		EnvelopeSolid,
		FolderOpenSolid,
		LockSolid,
		LockOpenSolid,
		TrashBinSolid,
		UserAddSolid
	} from 'flowbite-svelte-icons';
	import type { InviteResult, User } from '#lib/types.js';

	const currentUser = $derived(authSession.user);
	let users = $state<User[]>([]);
	let error = $state('');
	let saving = $state<number | null>(null);
	/** The user the delete dialog is open for. */
	let deleting = $state<User | null>(null);
	/** The user whose projects dialog is open. */
	let showingProjects = $state<User | null>(null);
	let adding = $state(false);

	onMount(async () => {
		await loadUsers();
	});

	async function loadUsers() {
		try {
			const list = await apiGetAuth<User[]>('/admin/users');
			users = list;
		} catch (_) {
			error = t('admin.users.loadFailed');
		}
	}

	async function changeRole(user: User, select: HTMLSelectElement) {
		const newRole = select.value;
		saving = user.id;
		try {
			const updated = await apiPatchAuth<User>(`/admin/users/${user.id}/role`, { role: newRole });
			users = users.map((u) => (u.id === updated.id ? updated : u));
		} catch (e: unknown) {
			select.value = user.role; // the change did not happen: show the role the user really has
			error = t('admin.users.roleFailed', {
				username: user.username,
				reason: errMessage(e, t('admin.users.unknownError'))
			});
		} finally {
			saving = null;
		}
	}

	async function toggleLock(user: User) {
		const locked = !user.isLocked;
		saving = user.id;
		try {
			const updated = await apiPatchAuth<User>(`/admin/users/${user.id}/lock`, { locked });
			users = users.map((u) => (u.id === updated.id ? updated : u));
			showToast(t(locked ? 'admin.users.locked' : 'admin.users.unlocked', { username: user.username }));
		} catch (e: unknown) {
			error = t('admin.users.lockFailed', {
				username: user.username,
				reason: errMessage(e, t('admin.users.unknownError'))
			});
		} finally {
			saving = null;
		}
	}

	const invitePending = (u: User) => !!u.invitedAt && !u.isEmailConfirmed;

	function userCreated(user: User, result: InviteResult) {
		users = [...users, user];
		if (result.inviteDelivered)
			showToast(t('admin.users.invited', { username: user.username, email: user.email }));
	}

	async function resendInvite(user: User) {
		saving = user.id;
		try {
			const res = await apiPostAuth<InviteResult>(`/admin/users/${user.id}/invite`, {});
			users = users.map((u) => (u.id === user.id ? { ...u, invitedAt: new Date().toISOString() } : u));
			if (!res.inviteLink) {
				showToast(t('admin.users.resent', { email: user.email }));
			} else {
				try {
					await navigator.clipboard.writeText(res.inviteLink);
					showToast(t('admin.users.resentCopied', { username: user.username }));
				} catch {
					error = t('admin.users.resentLink', { username: user.username, link: res.inviteLink });
				}
			}
		} catch (e: unknown) {
			error = t('admin.users.resendFailed', {
				username: user.username,
				reason: errMessage(e, t('admin.users.unknownError'))
			});
		} finally {
			saving = null;
		}
	}

	function userDeleted(user: User) {
		deleting = null;
		users = users.filter((u) => u.id !== user.id);
		showToast(t('admin.users.deleted', { username: user.username }));
	}

	const roleOptions = $derived([
		{ value: 'user', name: t('admin.users.role.user') },
		{ value: 'admin', name: t('admin.users.role.admin') }
	]);
</script>

<svelte:head>
	<title>{t('admin.users.pageTitle')}</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
	<PageHeader title={t('admin.users.title')} back={{ href: '/admin', label: t('admin.back') }}>
		{#snippet actions()}
			{#if !singleUserMode.current}
				<Button size="sm" data-testid="add-user" onclick={() => (adding = true)}>
					<UserAddSolid class="w-4 h-4 mr-1" />{t('admin.users.add.button')}
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if error}
		<Alert color="red" class="mb-4">{error}</Alert>
	{/if}

	<Table striped>
		<TableHead>
			<TableHeadCell>{t('common.field.username')}</TableHeadCell>
			<TableHeadCell>{t('common.field.email')}</TableHeadCell>
			<TableHeadCell>{t('admin.users.col.role')}</TableHeadCell>
			<TableHeadCell>{t('admin.users.col.joined')}</TableHeadCell>
			<TableHeadCell></TableHeadCell>
		</TableHead>
		<TableBody>
			{#each users as u (u.id)}
				<TableBodyRow>
					<TableBodyCell>
						<span class="font-medium">{u.username}</span>
						{#if u.name}<span class="text-gray-500 dark:text-gray-400 ml-1">({u.name})</span>{/if}
					</TableBodyCell>
					<TableBodyCell>{u.email}</TableBodyCell>
					<TableBodyCell>
						<span class="text-xs font-medium {u.role === 'admin' ? 'tone-red' : 'tone-blue'}">
							{t(`admin.users.badge.${u.role}` as MessageKey)}
						</span>
						{#if u.isLocked}<span class="ml-1 text-xs font-medium tone-yellow">
								{t('admin.users.badge.locked')}
							</span>{/if}
						{#if invitePending(u)}<span class="ml-1 text-xs font-medium tone-yellow">
								{t('admin.users.badge.invited')}
							</span>{/if}
					</TableBodyCell>
					<TableBodyCell>
						{fmt.date(u.createdAt)}
					</TableBodyCell>
					<TableBodyCell>
						{@const isSelf = currentUser?.id === u.id}
						<div class="flex flex-wrap items-center gap-2">
							{#if isSelf}
								<span class="text-xs text-gray-500 dark:text-gray-400 w-28">{t('common.you')}</span>
							{:else}
								<Select
									size="sm"
									class="w-28"
									items={roleOptions}
									placeholder={t('admin.users.choose')}
									value={u.role}
									disabled={saving === u.id}
									onchange={(e) => changeRole(u, e.target as HTMLSelectElement)}
								/>
							{/if}
							{#if !singleUserMode.current}<Button
									size="xs"
									color="alternative"
									class="p-2"
									title={t('admin.users.projectsTip')}
									aria-label={t('admin.users.projectsTip')}
									onclick={() => (showingProjects = u)}
								>
									<FolderOpenSolid class="w-4 h-4" />
								</Button>{/if}
							{#if invitePending(u) && !singleUserMode.current}<Button
									size="xs"
									color="alternative"
									class="p-2"
									title={t('admin.users.resendTip')}
									aria-label={t('admin.users.resendTip')}
									disabled={saving === u.id}
									onclick={() => resendInvite(u)}
								>
									<EnvelopeSolid class="w-4 h-4" />
								</Button>{/if}
							<Button
								size="xs"
								color="alternative"
								class="p-2"
								title={t(u.isLocked ? 'admin.users.unlockTip' : 'admin.users.lockTip')}
								aria-label={t(u.isLocked ? 'admin.users.unlockTip' : 'admin.users.lockTip')}
								disabled={isSelf || saving === u.id}
								onclick={() => toggleLock(u)}
							>
								{#if u.isLocked}<LockOpenSolid class="w-4 h-4" />{:else}<LockSolid class="w-4 h-4" />{/if}
							</Button>
							<Button
								size="xs"
								color="red"
								class="p-2"
								title={t('admin.users.deleteTip')}
								aria-label={t('admin.users.deleteTip')}
								disabled={isSelf || saving === u.id}
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

<AddUserDialog open={adding} onclose={() => (adding = false)} oncreated={userCreated} />

<UserProjectsDialog
	user={showingProjects}
	{users}
	currentUserId={currentUser?.id}
	onclose={() => (showingProjects = null)}
/>

<DeleteUserDialog
	user={deleting}
	{users}
	currentUserId={currentUser?.id}
	onclose={() => (deleting = null)}
	ondeleted={userDeleted}
/>
