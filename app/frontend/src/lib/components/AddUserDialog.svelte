<script lang="ts">
	import { Alert, Button, Input, Label, Modal, Select } from 'flowbite-svelte';
	import { apiPostAuth } from '#lib/api.js';
	import { errMessage } from '#lib/errors.js';
	import { t, locale, LOCALES } from '#lib/i18n/index.js';
	import { showToast } from '#lib/toast.svelte.js';
	import type { InviteResult, User } from '#lib/types.js';

	interface Props {
		open: boolean;
		onclose: () => void;
		/** The account was created (and its invite sent, unless `result.inviteLink` is set). */
		oncreated: (user: User, result: InviteResult) => void;
	}
	let { open, onclose, oncreated }: Props = $props();

	let username = $state('');
	let email = $state('');
	let name = $state('');
	let language = $state<string>(locale.current);
	let busy = $state(false);
	let error = $state('');
	/** Set when mail is off: the link the admin has to pass on, and to whom. */
	let manual = $state<{ username: string; link: string } | null>(null);

	const languageOptions = LOCALES.map((l) => ({ value: l.code, name: l.label }));

	function reset() {
		username = '';
		email = '';
		name = '';
		language = locale.current;
		error = '';
		manual = null;
	}

	function close() {
		if (busy) return;
		reset();
		onclose();
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = '';
		try {
			const res = await apiPostAuth<InviteResult & { user: User }>('/admin/users', {
				username: username.trim(),
				email: email.trim(),
				...(name.trim() ? { name: name.trim() } : {}),
				language
			});
			const { user, ...result } = res;
			oncreated(user, result);
			if (result.inviteLink) manual = { username: user.username, link: result.inviteLink };
			else {
				busy = false;
				close();
			}
		} catch (e: unknown) {
			error = errMessage(e, t('admin.users.add.failed'));
		} finally {
			busy = false;
		}
	}

	async function copy() {
		if (!manual) return;
		try {
			await navigator.clipboard.writeText(manual.link);
			showToast(t('admin.users.add.copied'));
		} catch {
			// Clipboard blocked: the link stays visible and selectable.
		}
	}
</script>

<Modal
	title={t('admin.users.add.title')}
	{open}
	oncancel={(ev: Event) => {
		ev.preventDefault(); // the parent closes it through `onclose` (and not while saving)
		close();
	}}
	size="md"
	outsideclose
>
	{#if manual}
		<Alert color="yellow">{t('admin.users.add.mailOff', { username: manual.username })}</Alert>
		<Input
			class="mt-3 font-mono text-xs"
			readonly
			value={manual.link}
			onfocus={(e) => (e.target as HTMLInputElement).select()}
		/>
		<div class="flex justify-end gap-2 mt-4">
			<Button color="light" onclick={copy}>{t('admin.users.add.copy')}</Button>
			<Button onclick={close}>{t('common.close')}</Button>
		</div>
	{:else}
		<p class="text-sm text-gray-600 dark:text-gray-300 m-0">{t('admin.users.add.intro')}</p>

		{#if error}
			<Alert color="red" class="mt-3">{error}</Alert>
		{/if}

		<form onsubmit={submit} class="flex flex-col gap-3 mt-3">
			<div>
				<Label for="add-user-username" class="mb-1">{t('common.field.username')}</Label>
				<Input id="add-user-username" bind:value={username} required maxlength={255} autocomplete="off" />
			</div>
			<div>
				<Label for="add-user-email" class="mb-1">{t('common.field.email')}</Label>
				<Input
					id="add-user-email"
					type="email"
					bind:value={email}
					required
					maxlength={255}
					autocomplete="off"
				/>
			</div>
			<div>
				<Label for="add-user-name" class="mb-1">{t('admin.users.add.fullName')}</Label>
				<Input id="add-user-name" bind:value={name} maxlength={255} autocomplete="off" />
			</div>
			<div>
				<Label for="add-user-language" class="mb-1">{t('common.field.language')}</Label>
				<Select id="add-user-language" items={languageOptions} bind:value={language} />
			</div>
			<div class="flex justify-end gap-2 mt-1">
				<Button color="light" type="button" onclick={close} disabled={busy}>{t('common.cancel')}</Button>
				<Button type="submit" disabled={busy} data-testid="add-user-submit">
					{busy ? t('admin.users.add.submitting') : t('admin.users.add.submit')}
				</Button>
			</div>
		</form>
	{/if}
</Modal>
