<script lang="ts">
	import { Alert, Button, Input, Label, Modal, Select } from 'flowbite-svelte';
	import { apiGetAuth, apiPostAuth } from '#lib/api.js';
	import { errMessage } from '#lib/errors.js';
	import { t } from '#lib/i18n/index.js';
	import { showToast } from '#lib/toast.svelte.js';
	import type { OwnedProject, User } from '#lib/types.js';

	interface Props {
		/** Whose projects are shown; the dialog is open while this is set. */
		user: User | null;
		/** Every user, to offer the active ones as the new owner. */
		users: User[];
		currentUserId: number | undefined;
		onclose: () => void;
	}
	let { user, users, currentUserId, onclose }: Props = $props();

	let projects = $state<OwnedProject[] | null>(null);
	let error = $state('');
	/** The project whose transfer form is open. */
	let selected = $state<number | null>(null);
	let toUserId = $state('');
	let reason = $state('');
	let busy = $state(false);

	let open = $derived(user !== null);
	const candidates = $derived(users.filter((u) => u.id !== user?.id && !u.isLocked));

	$effect(() => {
		const u = user;
		if (!u) return;
		projects = null;
		error = '';
		selected = null;
		apiGetAuth<OwnedProject[]>(`/admin/users/${u.id}/projects`)
			.then((list) => {
				if (user?.id === u.id) projects = list;
			})
			.catch((e: unknown) => (error = errMessage(e, t('admin.users.delete.projectsFailed'))));
	});

	function startTransfer(p: OwnedProject) {
		selected = p.id;
		error = '';
		reason = '';
		const me = candidates.find((c) => c.id === currentUserId);
		toUserId = String(me?.id ?? candidates[0]?.id ?? '');
	}

	async function transfer(e: Event, p: OwnedProject) {
		e.preventDefault();
		if (busy || !toUserId || reason.trim().length < 3) return;
		busy = true;
		error = '';
		try {
			await apiPostAuth(`/admin/projects/${p.id}/transfer`, {
				toUserId: Number(toUserId),
				reason: reason.trim()
			});
			const to = candidates.find((c) => String(c.id) === toUserId);
			showToast(
				t('admin.users.projects.transferred', {
					project: p.name ?? `#${p.id}`,
					username: to?.username ?? ''
				})
			);
			projects = (projects ?? []).filter((x) => x.id !== p.id);
			selected = null;
		} catch (err: unknown) {
			error = errMessage(err, t('admin.users.unknownError'));
		} finally {
			busy = false;
		}
	}

	function close() {
		if (!busy) onclose();
	}
</script>

<Modal
	title={t('admin.users.projects.title', { username: user?.username ?? '' })}
	{open}
	oncancel={(ev: Event) => {
		ev.preventDefault();
		close();
	}}
	size="md"
	outsideclose
>
	{#if error}
		<Alert color="red" class="mb-3">{error}</Alert>
	{/if}

	{#if projects === null}
		{#if !error}<p class="text-sm text-gray-500 dark:text-gray-400 m-0">{t('common.loading')}</p>{/if}
	{:else if projects.length === 0}
		<p class="text-sm text-gray-600 dark:text-gray-300 m-0">{t('admin.users.delete.noProjects')}</p>
	{:else}
		<ul class="divide-y divide-gray-200 dark:divide-gray-700 m-0 p-0 list-none" data-testid="user-projects">
			{#each projects as p (p.id)}
				<li class="py-2">
					<div class="flex items-center justify-between gap-2">
						<div class="text-sm min-w-0">
							<span class="text-gray-900 dark:text-white">{p.name ?? `#${p.id}`}</span>
							{#if p.shares > 0}
								<span class="text-gray-500 dark:text-gray-400">
									· {t('admin.users.delete.shared', { count: p.shares })}
								</span>
							{/if}
							{#if p.trashed}
								<span class="text-gray-500 dark:text-gray-400"> · {t('admin.users.delete.inTrash')}</span>
							{/if}
						</div>
						{#if selected !== p.id}
							<Button size="xs" color="alternative" onclick={() => startTransfer(p)} disabled={busy}>
								{t('admin.users.projects.transfer')}
							</Button>
						{/if}
					</div>

					{#if selected === p.id}
						{#if candidates.length === 0}
							<p class="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-0">
								{t('admin.users.projects.noCandidates')}
							</p>
						{:else}
							<form class="mt-2 space-y-2" onsubmit={(e) => transfer(e, p)}>
								<div>
									<Label for="transfer-to-{p.id}" class="mb-1">{t('admin.users.projects.newOwner')}</Label>
									<Select id="transfer-to-{p.id}" bind:value={toUserId} disabled={busy}>
										{#each candidates as c (c.id)}
											<option value={String(c.id)}>
												{c.id === currentUserId
													? t('admin.users.projects.toMe', { username: c.username })
													: c.username}
											</option>
										{/each}
									</Select>
								</div>
								<div>
									<Label for="transfer-reason-{p.id}" class="mb-1">{t('admin.users.projects.reason')}</Label>
									<Input
										id="transfer-reason-{p.id}"
										bind:value={reason}
										placeholder={t('admin.users.projects.reasonPlaceholder')}
										minlength={3}
										maxlength={500}
										required
										disabled={busy}
									/>
								</div>
								<p class="text-xs text-gray-500 dark:text-gray-400 m-0">{t('admin.users.projects.note')}</p>
								<div class="flex justify-end gap-2">
									<Button
										size="sm"
										color="light"
										type="button"
										onclick={() => (selected = null)}
										disabled={busy}
									>
										{t('common.cancel')}
									</Button>
									<Button
										size="sm"
										type="submit"
										data-testid="transfer-confirm"
										disabled={busy || reason.trim().length < 3}
									>
										{t('admin.users.projects.confirm')}
									</Button>
								</div>
							</form>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
