<script lang="ts">
	import { t, tr, locale, setLocale, isLocale, LOCALES } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { errMessage } from '$lib/errors';
	import { onMount } from 'svelte';
	import type { GeneralSettings } from '$lib/types-misc';
	import { writable } from 'svelte/store';
	import { apiGetAuth, apiPostAuth } from '$lib/api';
	import { refreshCurrentUser } from '$lib/auth';
	import { Alert, Button, Card, Input, Label, Select } from 'flowbite-svelte';
	import { CaretLeftSolid } from 'flowbite-svelte-icons';

	// IANA zone names for the autocomplete list (older browsers lack Intl.supportedValuesOf).
	const zones: string[] = (() => {
		try {
			return (
				(Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.(
					'timeZone'
				) ?? []
			);
		} catch {
			return [];
		}
	})();

	const name = writable('');
	const language = writable<string>(get(locale));
	const timezone = writable('UTC');
	const theme = writable('light');
	const weekStart = writable(1);
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
			theme.set(s.theme ?? 'light');
			weekStart.set(s.weekStart ?? 1);
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
				theme: $theme,
				weekStart: $weekStart
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

<div class="flex items-center gap-3 mb-6">
	<a href="/user/settings" class="text-gray-400 hover:text-gray-600"
		><CaretLeftSolid class="w-4 h-4 inline mr-1" /> {$t('settings.back')}</a
	>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white m-0">
		{$t('settings.general.title')}
	</h1>
</div>

{#if $error}<Alert color="red" class="mb-4">{$error}</Alert>{/if}
{#if $success}<Alert color="green" class="mb-4">{$success}</Alert>{/if}

{#if $loading}
	<p class="text-gray-400">{$t('common.loading')}</p>
{:else}
	<Card class="max-w-xl">
		<form onsubmit={handleSave} class="flex flex-col gap-4">
			<div>
				<Label for="gen-name" class="mb-1">{$t('settings.general.displayName')}</Label>
				<Input id="gen-name" type="text" bind:value={$name} />
			</div>
			<div>
				<Label for="gen-timezone" class="mb-1">{$t('settings.general.timezone')}</Label>
				<Input
					id="gen-timezone"
					type="text"
					list="gen-timezone-list"
					bind:value={$timezone}
					placeholder={$t('settings.general.timezonePlaceholder')}
				/>
				<datalist id="gen-timezone-list">
					{#each zones as z (z)}<option value={z}></option>{/each}
				</datalist>
			</div>
			<div>
				<Label for="gen-language" class="mb-1">{$t('common.field.language')}</Label>
				<Select id="gen-language" bind:value={$language}>
					{#each LOCALES as l (l.code)}<option value={l.code}>{l.label}</option>{/each}
				</Select>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="gen-theme" class="mb-1">{$t('common.field.theme')}</Label>
					<Select id="gen-theme" bind:value={$theme}>
						<option value="light">{$t('common.theme.light')}</option><option value="dark"
							>{$t('common.theme.dark')}</option
						><option value="system">{$t('common.theme.system')}</option>
					</Select>
				</div>
				<div>
					<Label for="gen-weekstart" class="mb-1">{$t('settings.general.weekStart')}</Label>
					<Select id="gen-weekstart" bind:value={$weekStart}>
						<option value={0}>{$t('settings.general.sunday')}</option><option value={1}
							>{$t('settings.general.monday')}</option
						>
					</Select>
				</div>
			</div>
			<div class="pt-2 border-t border-gray-100 dark:border-gray-700">
				<Button type="submit" disabled={$saving}
					>{$saving ? $t('common.saving') : $t('settings.general.saveSettings')}</Button
				>
			</div>
		</form>
	</Card>
{/if}
