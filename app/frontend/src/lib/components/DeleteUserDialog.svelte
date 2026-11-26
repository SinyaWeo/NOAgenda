<script lang="ts">
	import { Alert, Button, Label, Modal, Select } from 'flowbite-svelte';
	import { apiDeleteAuth, apiGetAuth } from '#lib/api.js';
	import { errMessage } from '#lib/errors.js';
	import { t } from '#lib/i18n/index.js';
	import type { OwnedProject, User } from '#lib/types.js';

	interface Props {
		/** The user to delete; the dialog is open while this is set. */
		user: User | null;
		/** Every user, to offer the active ones as the new owner of the projects. */
		users: User[];
		currentUserId: number | undefined;
		onclose: () => void;
		ondeleted: (user: User) => void;
	}
	let { user, users, currentUserId, onclose, ondeleted }: Props = $props();

	let projects = $state<OwnedProject[] | null>(null);
	/** The new owner's id, or '' to delete the projects together with the user. */
	let transferTo = $state('');
	let busy = $state(false);
	let error = $state('');

	let open = $derived(user !== null);
	const candidates = $derived(users.filter((u) => u.id !== user?.id && !u.isLocked));
	const sharedCount = $derived((projects ?? []).filter((p) => p.shares > 0).length);

	$effect(() => {
		const u = user;
		if (!u) return;
		projects = null;
		error = '';
		transferTo = currentUserId != null ? String(currentUserId) : '';
		apiGetAuth<OwnedProject[]>(`/admin/users/${u.id}/projects`)
			.then((list) => {
				if (user?.id === u.id) projects = list;
			})
			.catch((e: unknown) => (error = errMessage(e, t('admin.users.delete.projectsFailed'))));
	});

	function close() {
		if (!busy) onclose();
	}

	async function confirm() {
		if (!user) return;
		const target = user;
		busy = true;
		error = '';
		try {
			const q = projects?.length && transferTo ? `?transferProjectsTo=${encodeURIComponent(transferTo)}` : '';
			await apiDeleteAuth(`/admin/users/${target.id}${q}`);
			busy = false;
			ondeleted(target);
		} catch (e: unknown) {
			error = errMessage(e, t('admin.users.unknownError'));
			busy = false;
		}
	}
</script>

<Modal
	title={t('admin.users.delete.title', { username: user?.username ?? '' })}
	{open}
	oncancel={(ev: Event) => {
		ev.preventDefault(); // the parent closes it by clearing `user` (and not while deleting)
		close();
	}}
	size="md"
	outsideclose
>
	<p class="text-sm text-gray-600 dark:text-gray-300 m-0">{t('admin.users.delete.intro')}</p>

	{#if error}
		<Alert color="red" class="mt-3">{error}</Alert>
	{/if}

	{#if projects === null}
		{#if !error}<p class="text-sm text-gray-500 dark:text-gray-400 mt-3">{t('common.loading')}</p>{/if}
	{:else if projects.length === 0}
		<p class="text-sm text-gray-600 dark:text-gray-300 mt-3">{t('admin.users.delete.noProjects')}</p>
	{:else}
		<p class="text-sm text-gray-900 dark:text-white mt-3 mb-1">
			{t('admin.users.delete.projects', { count: projects.length })}
		</p>
		<ul class="text-sm max-h-40 overflow-y-auto list-disc pl-5 m-0" data-testid="delete-user-projects">
			{#each projects as p (p.id)}
				<li>
					<span class="text-gray-900 dark:text-white">{p.name ?? `#${p.id}`}</span>
					{#if p.shares > 0}
						<span class="text-gray-500 dark:text-gray-400">
							· {t('admin.users.delete.shared', { count: p.shares })}
						</span>
					{/if}
					{#if p.trashed}
						<span class="text-gray-500 dark:text-gray-400"> · {t('admin.users.delete.inTrash')}</span>
					{/if}
				</li>
			{/each}
		</ul>

		<Label for="delete-user-transfer" class="mt-4 mb-1">{t('admin.users.delete.transferLabel')}</Label>
		<Select id="delete-user-transfer" bind:value={transferTo} disabled={busy}>
			{#each candidates as c (c.id)}
				<option value={String(c.id)}>
					{c.id === currentUserId
						? t('admin.users.delete.transferToMe', { username: c.username })
						: t('admin.users.delete.transferTo', { username: c.username })}
				</option>
			{/each}
			<option value="">{t('admin.users.delete.deleteProjects')}</option>
		</Select>
		{#if transferTo}
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-0">
				{t('admin.users.delete.transferNote')}
			</p>
		{:else if sharedCount > 0}
			<p class="text-sm tone-red mt-2 mb-0">
				{t('admin.users.delete.sharedWarning', { count: sharedCount })}
			</p>
		{/if}
	{/if}

	<div class="flex justify-end gap-2 mt-4">
		<Button color="light" onclick={close} disabled={busy}>{t('common.cancel')}</Button>
		<Button
			color="red"
			data-testid="delete-user-confirm"
			onclick={confirm}
			disabled={busy || projects === null}
		>
			{t('common.delete')}
		</Button>
	</div>
</Modal>
