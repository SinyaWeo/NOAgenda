<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Alert, Button, Checkbox, Input, Label, Modal, Select } from 'flowbite-svelte';
	import { apiGetAuth, apiPostAuth } from '$lib/api';
	import { singleUserMode } from '$lib/appConfig';
	import { authSession, clearAuthSession } from '$lib/auth';
	import { confirmDialog } from '$lib/confirm';
	import { errMessage } from '$lib/errors';
	import { fmt, t, tr } from '$lib/i18n';
	import { showToast } from '$lib/toast';
	import type { User } from '$lib/types';

	interface Status {
		enabled: boolean;
		userId: number | null;
		switchedAt: string | null;
	}
	interface Preview {
		target: { id: number; username: string };
		users: number;
		nodes: { project: number; task: number; idea: number };
		comments: number;
		attachments: { count: number; bytes: number };
		notes: number;
		labels: { moved: number; merged: number };
		teams: number;
		shares: number;
		assignments: number;
		webhooks: { id: number; url: string }[];
	}

	let status = $state<Status | null>(null);
	let admins = $state<User[]>([]);
	let soleId = $state('');
	let error = $state('');

	let preview = $state<Preview | null>(null);
	let dialogOpen = $state(false);
	let backupConfirmed = $state(false);
	let privateDataConfirmed = $state(false);
	let typedUsername = $state('');
	let busy = $state(false);
	let dialogError = $state('');

	const me = $derived($authSession.user);
	const soleUsername = $derived(admins.find((a) => a.id === status?.userId)?.username ?? me?.username ?? '');
	const canConfirm = $derived(
		!!preview && backupConfirmed && privateDataConfirmed && typedUsername === preview.target.username && !busy
	);
	const megabytes = (bytes: number) => (bytes / 1048576).toFixed(1);

	onMount(load);

	async function load() {
		try {
			const [s, users] = await Promise.all([
				apiGetAuth<Status>('/admin/single-user'),
				apiGetAuth<User[]>('/admin/users')
			]);
			status = s;
			admins = users.filter((u) => u.role === 'admin' && !u.isLocked);
			soleId = String(admins.find((a) => a.id === me?.id)?.id ?? admins[0]?.id ?? '');
		} catch (e: unknown) {
			error = errMessage(e, tr('admin.singleUser.loadFailed'));
		}
	}

	async function openDialog() {
		error = '';
		dialogError = '';
		backupConfirmed = false;
		privateDataConfirmed = false;
		typedUsername = '';
		preview = null;
		try {
			preview = await apiGetAuth<Preview>(`/admin/single-user/preview?userId=${encodeURIComponent(soleId)}`);
			dialogOpen = true;
		} catch (e: unknown) {
			error = errMessage(e, tr('admin.singleUser.loadFailed'));
		}
	}

	function closeDialog() {
		if (!busy) dialogOpen = false;
	}

	async function enable() {
		if (!preview || !canConfirm) return;
		busy = true;
		dialogError = '';
		try {
			status = await apiPostAuth<Status>('/admin/single-user/enable', {
				userId: preview.target.id,
				backupConfirmed,
				privateDataConfirmed,
				confirmUsername: typedUsername
			});
			busy = false;
			dialogOpen = false;
			singleUserMode.set(true);
			if (preview.target.id !== me?.id) {
				// The admin who switched chose someone else: their own account no longer exists.
				clearAuthSession();
				await goto('/user/login');
				return;
			}
			showToast(tr('admin.singleUser.enabled'));
		} catch (e: unknown) {
			dialogError = errMessage(e, tr('admin.users.unknownError'));
			busy = false;
		}
	}

	async function disable() {
		if (
			!(await confirmDialog(tr('admin.singleUser.confirmDisable'), {
				confirmLabel: tr('admin.singleUser.disable')
			}))
		)
			return;
		error = '';
		try {
			status = await apiPostAuth<Status>('/admin/single-user/disable', {});
			singleUserMode.set(false);
			showToast(tr('admin.singleUser.disabled'));
		} catch (e: unknown) {
			error = errMessage(e, tr('admin.users.unknownError'));
		}
	}
</script>

<section class="mt-10 border-t border-gray-200 dark:border-gray-700 pt-6" data-testid="single-user-section">
	<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">{$t('admin.singleUser.title')}</h2>
	<p class="text-sm text-gray-600 dark:text-gray-300 mt-0 mb-4">{$t('admin.singleUser.intro')}</p>

	{#if error}
		<Alert color="red" class="mb-4">{error}</Alert>
	{/if}

	{#if status?.enabled}
		<p class="text-sm text-gray-900 dark:text-white mb-4">
			{$t('admin.singleUser.isOn', {
				username: soleUsername,
				date: status.switchedAt ? $fmt.date(status.switchedAt) : ''
			})}
		</p>
		<Button color="alternative" onclick={disable}>{$t('admin.singleUser.disable')}</Button>
	{:else if status}
		<div class="flex flex-col gap-3">
			<div>
				<Label for="sole-user" class="mb-1">{$t('admin.singleUser.soleUser')}</Label>
				<Select id="sole-user" bind:value={soleId} class="max-w-xs">
					{#each admins as a (a.id)}
						<option value={String(a.id)}>
							{a.id === me?.id ? $t('admin.singleUser.me', { username: a.username }) : a.username}
						</option>
					{/each}
				</Select>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">
					{$t('admin.singleUser.soleUserHint')}
				</p>
			</div>
			<div>
				<Button color="red" onclick={openDialog} disabled={!soleId}>{$t('admin.singleUser.enable')}</Button>
			</div>
		</div>
	{/if}
</section>

<Modal
	title={$t('admin.singleUser.dialogTitle')}
	open={dialogOpen}
	oncancel={(ev: Event) => {
		ev.preventDefault();
		closeDialog();
	}}
	size="md"
	outsideclose
>
	{#if preview}
		{@const name = preview.target.username}
		<Alert color="red" class="mb-3">{$t('admin.singleUser.irreversible')}</Alert>
		<ul
			class="text-sm text-gray-700 dark:text-gray-300 space-y-1 pl-5 list-disc m-0"
			data-testid="single-user-preview"
		>
			<li>{$t('admin.singleUser.preview.users', { count: preview.users })}</li>
			<li>
				{$t('admin.singleUser.preview.nodes', {
					username: name,
					projects: preview.nodes.project,
					tasks: preview.nodes.task,
					ideas: preview.nodes.idea
				})}
			</li>
			<li>
				{$t('admin.singleUser.preview.content', {
					username: name,
					comments: preview.comments,
					attachments: preview.attachments.count,
					size: megabytes(preview.attachments.bytes),
					notes: preview.notes
				})}
			</li>
			<li>
				{$t('admin.singleUser.preview.labels', {
					moved: preview.labels.moved,
					merged: preview.labels.merged
				})}
			</li>
			<li>{$t('admin.singleUser.preview.assignments', { username: name, count: preview.assignments })}</li>
			<li>{$t('admin.singleUser.preview.sharing', { teams: preview.teams, shares: preview.shares })}</li>
		</ul>
		{#if preview.webhooks.length}
			<p class="text-sm text-gray-900 dark:text-white mt-3 mb-1">{$t('admin.singleUser.preview.webhooks')}</p>
			<ul class="text-xs text-gray-600 dark:text-gray-300 pl-5 list-disc m-0 break-all">
				{#each preview.webhooks as w (w.id)}<li>{w.url}</li>{/each}
			</ul>
		{/if}
		{#if preview.target.id !== me?.id}
			<Alert color="yellow" class="mt-3">{$t('admin.singleUser.selfDeleted')}</Alert>
		{/if}

		<div class="flex flex-col gap-2 mt-4">
			<Checkbox bind:checked={backupConfirmed} disabled={busy}>
				{$t('admin.singleUser.backupConfirmed')}
			</Checkbox>
			<Checkbox bind:checked={privateDataConfirmed} disabled={busy}>
				{$t('admin.singleUser.privateDataConfirmed', { username: name })}
			</Checkbox>
			<div class="mt-2">
				<Label for="confirm-username" class="mb-1">
					{$t('admin.singleUser.typeUsername', { username: name })}
				</Label>
				<Input id="confirm-username" bind:value={typedUsername} autocomplete="off" disabled={busy} />
			</div>
		</div>

		{#if dialogError}
			<Alert color="red" class="mt-3">{dialogError}</Alert>
		{/if}

		<div class="flex justify-end gap-2 mt-4">
			<Button color="light" onclick={closeDialog} disabled={busy}>{$t('common.cancel')}</Button>
			<Button color="red" data-testid="single-user-confirm" onclick={enable} disabled={!canConfirm}>
				{$t('admin.singleUser.confirm')}
			</Button>
		</div>
	{/if}
</Modal>
