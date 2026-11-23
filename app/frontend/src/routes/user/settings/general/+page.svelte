<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { t, tr, locale, setLocale, isLocale, LOCALES } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { errMessage } from '$lib/errors';
	import { onMount } from 'svelte';
	import type { GeneralSettings } from '$lib/types-misc';
	import { writable } from 'svelte/store';
	import { apiGetAuth, apiPostAuth } from '$lib/api';
	import { refreshCurrentUser } from '$lib/auth';
	import { Alert, Button, Card, Input, Label, Select } from 'flowbite-svelte';
	import { timeZoneOptions } from '$lib/timezones';

	const name = writable('');
	const language = writable<string>(get(locale));
	const timezone = writable('UTC');
	// Recomputed once the saved zone is known so that it is always one of the choices.
	let zones = $state(timeZoneOptions());
	const theme = writable('light');
	const error = writable('');
	const success = writable('');
	const loading = writable(true);
	const saving = writable(false);

	onMount(async () => {
		try {
			const s = await apiGetAuth<GeneralSettings>('/user/settings/general');
			name.set(s.name ?? '');
			language.set(isLocale(s.language) ? s.language : get(locale));
			timezone.set(s.timezone ?? 'UTC');
			zones = timeZoneOptions(s.timezone ?? 'UTC');
			theme.set(s.theme ?? 'light');
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			loading.set(false);
		}
	});

	async function handleSave(e: Event) {
		e.preventDefault();
		saving.set(true);
		error.set('');
		success.set('');
		try {
			await apiPostAuth('/user/settings/general', {
				name: $name,
				language: $language,
				timezone: $timezone,
				theme: $theme
			});
			if (isLocale($language)) setLocale($language);
			await refreshCurrentUser(); // header name, avatar and theme follow at once
			success.set(tr('settings.general.saved'));
		} catch (e: unknown) {
			error.set(errMessage(e));
		} finally {
			saving.set(false);
		}
	}
</script>

<PageHeader
	title={$t('settings.general.title')}
	back={{ href: '/user/settings', label: $t('settings.back') }}
/>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

{#if $loading}
	<p class="text-gray-500 dark:text-gray-400">{$t('common.loading')}</p>
{:else}
	<Card class="max-w-xl">
		<form onsubmit={handleSave} class="flex flex-col gap-4">
			<div>
				<Label for="gen-name" class="mb-1">{$t('settings.general.displayName')}</Label>
				<Input id="gen-name" type="text" bind:value={$name} />
			</div>
			<div>
				<Label for="gen-timezone" class="mb-1">{$t('settings.general.timezone')}</Label>
				<Select placeholder="" id="gen-timezone" bind:value={$timezone}>
					{#each zones as z (z.value)}<option value={z.value}>{z.label}</option>{/each}
				</Select>
			</div>
			<div>
				<Label for="gen-language" class="mb-1">{$t('common.field.language')}</Label>
				<Select placeholder="" id="gen-language" bind:value={$language}>
					{#each LOCALES as l (l.code)}<option value={l.code}>{l.label}</option>{/each}
				</Select>
			</div>
			<div>
				<Label for="gen-theme" class="mb-1">{$t('common.field.theme')}</Label>
				<Select placeholder="" id="gen-theme" bind:value={$theme}>
					<option value="light">{$t('common.theme.light')}</option><option value="dark">
						{$t('common.theme.dark')}
					</option><option value="system">{$t('common.theme.system')}</option>
				</Select>
			</div>
			<div class="pt-2 border-t border-gray-100 dark:border-gray-700">
				<Button type="submit" disabled={$saving}>
					{$saving ? $t('common.saving') : $t('settings.general.saveSettings')}
				</Button>
			</div>
		</form>
	</Card>
{/if}
