<script lang="ts">
	import { Input, Label, Select } from 'flowbite-svelte';
	import type { SvelteSet } from 'svelte/reactivity';
	import { t } from '#lib/i18n/index.js';
	import { fieldHelp, fieldLabel, optionLabel } from '#lib/plugins.js';
	import type { PluginFieldView } from '#lib/types-misc.js';

	interface Props {
		/** Plugin key, for the field texts. */
		plugin: string;
		fields: PluginFieldView[];
		/** Typed values by field key (secrets start empty: they are never sent back). */
		draft: Record<string, string>;
		/** Secret fields the user chose to remove. */
		cleared: SvelteSet<string>;
		/** Makes the input ids unique on the page. */
		idPrefix: string;
		disabled?: boolean;
	}
	let { plugin, fields, draft = $bindable(), cleared, idPrefix, disabled = false }: Props = $props();
</script>

{#each fields as f (f.key)}
	{@const id = `${idPrefix}-${f.key}`}
	{@const help = fieldHelp(plugin, f)}
	<div>
		<Label for={id} class="mb-1">
			{fieldLabel(plugin, f)}
			{#if f.required}<span class="text-xs font-normal text-gray-500 dark:text-gray-400">
					({t('plugins.field.required')})
				</span>{/if}
		</Label>
		{#if f.kind === 'select'}
			<Select
				{id}
				{disabled}
				bind:value={draft[f.key]}
				items={(f.options ?? []).map((o) => ({ value: o, name: optionLabel(plugin, f, o) }))}
			/>
		{:else if f.kind === 'secret'}
			<Input
				{id}
				type="password"
				autocomplete="off"
				{disabled}
				maxlength={f.maxLength}
				placeholder={t('plugins.field.secretPlaceholder')}
				bind:value={draft[f.key]}
				oninput={() => cleared.delete(f.key)}
			/>
			<p class="text-xs mt-1 mb-0 text-gray-500 dark:text-gray-400">
				{#if cleared.has(f.key)}
					<span class="tone-yellow">{t('plugins.field.secretCleared')}</span>
				{:else if f.isSet}
					<span class="tone-green">{t('plugins.field.secretSet')}</span>
					·
					<button
						type="button"
						class="bg-transparent border-0 p-0 cursor-pointer text-primary-700 dark:text-primary-500 hover:underline"
						{disabled}
						onclick={() => {
							draft[f.key] = '';
							cleared.add(f.key);
						}}
					>
						{t('plugins.field.clearSecret')}
					</button>
				{:else}
					{t('plugins.field.secretNotSet')}
				{/if}
			</p>
		{:else}
			<Input {id} {disabled} maxlength={f.maxLength} bind:value={draft[f.key]} />
		{/if}
		{#if help}<p class="text-xs mt-1 mb-0 text-gray-500 dark:text-gray-400">{help}</p>{/if}
	</div>
{/each}
