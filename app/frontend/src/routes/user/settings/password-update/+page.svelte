<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { t, tr } from '$lib/i18n';
	import { errMessage } from '$lib/errors';
	import { writable } from 'svelte/store';
	import { apiPostAuth } from '$lib/api';
	import { Alert, Button, Card, Input, Label } from 'flowbite-svelte';
	import { EyeOutline, EyeSlashOutline } from 'flowbite-svelte-icons';

	let oldPassword = $state('');
	let newPassword = $state('');
	let confirm = $state('');
	let showPasswords = $state(false);
	const error = writable('');
	const success = writable('');
	const saving = writable(false);

	async function handleSave(e: Event) {
		e.preventDefault();
		if (newPassword !== confirm) {
			error.set(tr('settings.password.mismatch'));
			return;
		}
		saving.set(true);
		error.set('');
		success.set('');
		try {
			await apiPostAuth('/user/settings/password', {
				oldPassword,
				newPassword
			});
			success.set(tr('settings.password.done'));
			oldPassword = '';
			newPassword = '';
			confirm = '';
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			saving.set(false);
		}
	}
</script>

<PageHeader
	title={$t('settings.password.title')}
	back={{ href: '/user/settings', label: $t('settings.back') }}
/>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

<Card class="max-w-xl">
	<form onsubmit={handleSave} class="flex flex-col gap-4">
		<label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
			<input type="checkbox" bind:checked={showPasswords} class="rounded" />
			{$t('settings.password.show')}
		</label>
		<div>
			<Label for="old-pw" class="mb-1">{$t('settings.password.current')}</Label>
			<div class="relative">
				<Input
					id="old-pw"
					type={showPasswords ? 'text' : 'password'}
					bind:value={oldPassword}
					required
					class="pr-10"
				/>
				<button
					type="button"
					onclick={() => (showPasswords = !showPasswords)}
					class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400 hover:text-gray-600"
				>
					{#if showPasswords}<EyeSlashOutline class="w-4 h-4" />{:else}<EyeOutline class="w-4 h-4" />{/if}
				</button>
			</div>
		</div>
		<div>
			<Label for="new-pw" class="mb-1">
				{$t('settings.password.new')}
				<span class="text-xs text-gray-500 dark:text-gray-400">{$t('settings.password.min')}</span>
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
			<Label for="confirm-pw" class="mb-1">{$t('settings.password.confirm')}</Label>
			<Input id="confirm-pw" type={showPasswords ? 'text' : 'password'} bind:value={confirm} required />
		</div>
		<div class="pt-2 border-t border-gray-100 dark:border-gray-700">
			<Button type="submit" disabled={$saving}>
				{$saving ? $t('settings.password.updating') : $t('settings.password.submit')}
			</Button>
		</div>
	</form>
</Card>
