<script lang="ts">
	import { t, locale, setLocale, LOCALES } from '#lib/i18n/index.js';
</script>

<div
	class="flex justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-3"
	role="group"
	aria-label={t('auth.languageSwitcher')}
>
	{#each LOCALES as l, i (l.code)}
		{#if i > 0}<span aria-hidden="true">·</span>{/if}
		<button
			type="button"
			lang={l.code}
			class="hover:underline {locale.current === l.code
				? 'font-semibold text-gray-700 dark:text-gray-200'
				: ''}"
			aria-pressed={locale.current === l.code}
			onclick={() => setLocale(l.code)}
		>
			{l.label}
		</button>
	{/each}
</div>
