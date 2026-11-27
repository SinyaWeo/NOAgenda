<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { onMount } from 'svelte';
	import { apiGetAuth, apiPostAuth, apiDeleteAuth, apiFetchAuth, API_BASE } from '#lib/api.js';
	import { refreshCurrentUser } from '#lib/auth.svelte.js';
	import { errMessage } from '#lib/errors.js';
	import { t, fmt, LOCALES, isLocale, setLocale } from '#lib/i18n/index.js';
	import type { MessageKey } from '#lib/i18n/index.js';
	import { timeZoneOptions } from '#lib/timezones.js';
	import { Alert, Button, Card, Input, Label, Select } from 'flowbite-svelte';
	import { CameraPhotoOutline } from 'flowbite-svelte-icons';
	import EditableValue from '#lib/components/EditableValue.svelte';
	import type { User } from '#lib/types.js';
	import type { AvatarSettings } from '#lib/types-misc.js';

	let user = $state<User | null>(null);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');

	/** The field whose editor is open (only one at a time); null: all show their value. */
	let editing = $state<'name' | 'email' | 'language' | 'timezone' | 'theme' | null>(null);
	let nameDraft = $state('');
	let saving = $state(false);

	/** An address change waiting for the user to open the link sent to it. */
	let pendingEmail = $state<string | null>(null);
	let newEmail = $state('');
	let emailPassword = $state('');

	let oldPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let showPasswords = $state(false);
	let savingPassword = $state(false);

	const ROW = 'flex justify-between items-center gap-4 py-2.5 text-sm';
	const DT = 'font-medium text-gray-500 dark:text-gray-400';
	const PANEL =
		'mt-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex flex-col gap-2';

	function resolveUrl(path: string | undefined): string {
		if (!path) return '';
		return path.startsWith('http') ? path : `${API_BASE}${path}`;
	}
	function getInitials(u: User): string {
		const name: string = u.name || u.username || 'U';
		return name
			.split(' ')
			.map((w: string) => w[0] ?? '')
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
	function languageName(code: string | undefined): string {
		const c = code ?? 'en';
		return LOCALES.find((l) => l.code === c)?.label ?? c;
	}
	function themeName(theme: string | undefined, translate: (key: MessageKey) => string): string {
		const th = theme ?? 'light';
		return ['light', 'dark', 'system'].includes(th) ? translate(`common.theme.${th}` as MessageKey) : th;
	}

	function clearMessages() {
		error = '';
		success = '';
	}

	/** Save one field; the header (name, avatar, theme) and the UI language follow at once. */
	async function save(patch: { name?: string; language?: string; timezone?: string; theme?: string }) {
		if (saving) return;
		saving = true;
		clearMessages();
		try {
			user = await apiPostAuth<User>('/user/settings/general', patch);
			if (isLocale(patch.language)) setLocale(patch.language);
			await refreshCurrentUser();
			editing = null;
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			saving = false;
		}
	}

	function editName() {
		nameDraft = user?.name ?? '';
		editing = 'name';
	}

	async function saveName(e: Event) {
		e.preventDefault();
		const next = nameDraft.trim();
		if (next === (user?.name ?? '')) editing = null;
		else await save({ name: next });
	}

	function toggleEmail() {
		newEmail = '';
		emailPassword = '';
		editing = editing === 'email' ? null : 'email';
	}

	async function saveEmail(e: Event) {
		e.preventDefault();
		saving = true;
		clearMessages();
		try {
			const res = await apiPostAuth<{ pendingEmail: string | null }>('/user/settings/email', {
				email: newEmail,
				password: emailPassword
			});
			pendingEmail = res.pendingEmail;
			editing = null;
			if (pendingEmail) {
				success = t('settings.email.sent', { email: pendingEmail });
			} else {
				// Without working mail the address changes at once (or the current one cancelled a change).
				user = await apiGetAuth<User>('/users/me');
				success = t('settings.email.changed');
			}
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			saving = false;
		}
	}

	async function cancelEmailChange() {
		clearMessages();
		try {
			await apiDeleteAuth('/user/settings/email/pending');
			pendingEmail = null;
			success = t('settings.email.cancelled');
		} catch (e: unknown) {
			error = errMessage(e);
		}
	}

	async function uploadAvatar(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		clearMessages();
		const fd = new FormData();
		fd.append('avatar', file);
		try {
			const res = await apiFetchAuth('/user/settings/avatar/upload', { method: 'PUT', body: fd });
			if (!res.ok) throw new Error(t('settings.avatar.failed'));
			const data: AvatarSettings = await res.json();
			if (user) user = { ...user, avatarUrl: data.avatarUrl ?? undefined };
			await refreshCurrentUser(); // the header shows the new picture straight away
			success = t('settings.avatar.done');
		} catch (e: unknown) {
			error = errMessage(e, t('settings.avatar.failed'));
		} finally {
			input.value = '';
		}
	}

	async function savePassword(e: Event) {
		e.preventDefault();
		clearMessages();
		if (newPassword !== confirmPassword) {
			error = t('settings.password.mismatch');
			return;
		}
		savingPassword = true;
		try {
			await apiPostAuth('/user/settings/password', { oldPassword, newPassword });
			success = t('settings.password.done');
			oldPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (e: unknown) {
			error = errMessage(e);
		} finally {
			savingPassword = false;
		}
	}

	onMount(async () => {
		try {
			[user, { pendingEmail }] = await Promise.all([
				apiGetAuth<User>('/users/me'),
				apiGetAuth<{ pendingEmail: string | null }>('/user/settings/email')
			]);
		} catch {
			error = t('auth.profile.loadFailed');
		} finally {
			loading = false;
		}
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') editing = null;
	}}
/>

<PageHeader
	title={t('settings.profile.title')}
	back={{ href: '/user/settings', label: t('settings.back') }}
/>

{#if error}<Alert color="red" class="mb-4">{error}</Alert>{/if}
{#if success}<Alert color="green" class="mb-4">{success}</Alert>{/if}

{#if loading}
	<p class="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
{:else if user}
	<div class="flex flex-col gap-4 max-w-xl">
		<Card class="max-w-none">
			<div class="flex flex-col items-center gap-3 mb-6">
				<label
					class="relative rounded-full cursor-pointer focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-800"
					title={t('settings.avatar.upload')}
				>
					{#if user.avatarUrl}
						<img
							src={resolveUrl(user.avatarUrl)}
							alt={t('auth.profile.avatar')}
							class="w-20 h-20 rounded-full object-cover hover:opacity-80"
						/>
					{:else}
						<div
							class="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl font-bold text-primary-700 dark:text-primary-300 hover:opacity-80"
						>
							{getInitials(user)}
						</div>
					{/if}
					<span
						class="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm flex items-center justify-center text-gray-600 dark:text-gray-300"
						aria-hidden="true"
					>
						<CameraPhotoOutline class="w-4 h-4" />
					</span>
					<span class="sr-only">{t('settings.avatar.upload')}</span>
					<input type="file" accept="image/*" onchange={uploadAvatar} class="sr-only" />
				</label>
				<p class="text-xs text-center text-gray-500 dark:text-gray-400 m-0">{t('settings.avatar.hint')}</p>
				<div class="text-center w-full">
					{#if editing === 'name'}
						<form onsubmit={saveName}>
							<Input
								bind:value={nameDraft}
								maxlength={255}
								autofocus
								disabled={saving}
								aria-label={t('settings.general.displayName')}
								onblur={() => (editing = null)}
								class="text-center"
							/>
						</form>
					{:else}
						<h2 class="text-xl font-bold text-gray-900 dark:text-white m-0">
							<EditableValue size="lg" title={t('tasks.details.change')} onclick={editName}>
								{user.name || user.username}
							</EditableValue>
						</h2>
					{/if}
					<p class="text-sm text-gray-500 dark:text-gray-400 m-0">@{user.username}</p>
				</div>
			</div>
			<dl class="divide-y divide-gray-100 dark:divide-gray-700 m-0">
				<div class="py-2.5 text-sm">
					<div class="flex justify-between items-center gap-4">
						<dt class={DT}>{t('common.field.email')}</dt>
						<dd class="m-0 text-gray-800 dark:text-gray-200 min-w-0 break-all">
							<EditableValue
								title={t('tasks.details.change')}
								aria-expanded={editing === 'email'}
								onclick={toggleEmail}
							>
								{user.email ?? '—'}
							</EditableValue>
						</dd>
					</div>
					{#if pendingEmail}
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0 text-right">
							{t('settings.email.pending', { email: pendingEmail })}
							·
							<button
								type="button"
								class="bg-transparent border-0 p-0 cursor-pointer text-primary-700 dark:text-primary-500 hover:underline"
								onclick={cancelEmailChange}
							>
								{t('settings.email.cancelPending')}
							</button>
						</p>
					{/if}
					{#if editing === 'email'}
						<form onsubmit={saveEmail} class={PANEL}>
							<p class="text-xs text-gray-500 dark:text-gray-400 m-0">{t('settings.email.intro')}</p>
							<Label for="new-email">{t('settings.email.newEmail')}</Label>
							<Input id="new-email" type="email" size="sm" bind:value={newEmail} required autofocus />
							<Label for="email-pw">{t('settings.email.currentPassword')}</Label>
							<Input id="email-pw" type="password" size="sm" bind:value={emailPassword} required />
							<div class="flex gap-2">
								<Button type="submit" size="xs" disabled={saving}>
									{saving ? t('settings.email.sending') : t('settings.email.submit')}
								</Button>
								<Button type="button" size="xs" color="light" onclick={() => (editing = null)}>
									{t('common.cancel')}
								</Button>
							</div>
						</form>
					{/if}
				</div>
				<div class={ROW}>
					<dt class={DT}>{t('auth.profile.memberSince')}</dt>
					<dd class="m-0 text-gray-800 dark:text-gray-200">
						{user.createdAt ? fmt.date(user.createdAt) : '—'}
					</dd>
				</div>
				<div class={ROW}>
					<dt class={DT}>{t('common.field.language')}</dt>
					<dd class="m-0 text-gray-800 dark:text-gray-200">
						{#if editing === 'language'}
							<Select
								placeholder=""
								size="sm"
								autofocus
								disabled={saving}
								value={user.language ?? 'en'}
								aria-label={t('common.field.language')}
								onchange={(e) => save({ language: (e.target as HTMLSelectElement).value })}
								onblur={() => (editing = null)}
							>
								{#each LOCALES as l (l.code)}<option value={l.code}>{l.label}</option>{/each}
							</Select>
						{:else}
							<EditableValue title={t('tasks.details.change')} onclick={() => (editing = 'language')}>
								{languageName(user.language)}
							</EditableValue>
						{/if}
					</dd>
				</div>
				<div class={ROW}>
					<dt class={DT}>{t('auth.profile.timezone')}</dt>
					<dd class="m-0 text-gray-800 dark:text-gray-200 min-w-0">
						{#if editing === 'timezone'}
							<Select
								placeholder=""
								size="sm"
								autofocus
								disabled={saving}
								value={user.timezone ?? 'UTC'}
								aria-label={t('auth.profile.timezone')}
								onchange={(e) => save({ timezone: (e.target as HTMLSelectElement).value })}
								onblur={() => (editing = null)}
							>
								{#each timeZoneOptions(user.timezone ?? 'UTC') as z (z.value)}
									<option value={z.value}>{z.label}</option>
								{/each}
							</Select>
						{:else}
							<EditableValue title={t('tasks.details.change')} onclick={() => (editing = 'timezone')}>
								{user.timezone ?? 'UTC'}
							</EditableValue>
						{/if}
					</dd>
				</div>
				<div class={ROW}>
					<dt class={DT}>{t('common.field.theme')}</dt>
					<dd class="m-0 text-gray-800 dark:text-gray-200">
						{#if editing === 'theme'}
							<Select
								placeholder=""
								size="sm"
								autofocus
								disabled={saving}
								value={user.theme ?? 'light'}
								aria-label={t('common.field.theme')}
								onchange={(e) => save({ theme: (e.target as HTMLSelectElement).value })}
								onblur={() => (editing = null)}
							>
								{#each ['light', 'dark', 'system'] as th (th)}
									<option value={th}>{t(`common.theme.${th}` as MessageKey)}</option>
								{/each}
							</Select>
						{:else}
							<EditableValue title={t('tasks.details.change')} onclick={() => (editing = 'theme')}>
								{themeName(user.theme, t)}
							</EditableValue>
						{/if}
					</dd>
				</div>
			</dl>
		</Card>

		<Card class="max-w-none">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
				{t('settings.password.title')}
			</h2>
			<form onsubmit={savePassword} class="flex flex-col gap-4">
				<label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
					<input type="checkbox" bind:checked={showPasswords} class="rounded" />
					{t('settings.password.show')}
				</label>
				<div>
					<Label for="old-pw" class="mb-1">{t('settings.password.current')}</Label>
					<Input id="old-pw" type={showPasswords ? 'text' : 'password'} bind:value={oldPassword} required />
				</div>
				<div>
					<Label for="new-pw" class="mb-1">
						{t('settings.password.new')}
						<span class="text-xs text-gray-500 dark:text-gray-400">{t('settings.password.min')}</span>
					</Label>
					<Input
						id="new-pw"
						type={showPasswords ? 'text' : 'password'}
						bind:value={newPassword}
						required
						minlength={8}
					/>
				</div>
				<div>
					<Label for="confirm-pw" class="mb-1">{t('settings.password.confirm')}</Label>
					<Input
						id="confirm-pw"
						type={showPasswords ? 'text' : 'password'}
						bind:value={confirmPassword}
						required
					/>
				</div>
				<div class="pt-2 border-t border-gray-100 dark:border-gray-700">
					<Button type="submit" disabled={savingPassword}>
						{savingPassword ? t('settings.password.updating') : t('settings.password.submit')}
					</Button>
				</div>
			</form>
		</Card>
	</div>
{/if}
