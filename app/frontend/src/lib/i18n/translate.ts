import { format, type Locale, type Params } from './core';
import { locale } from './locale.svelte';
import { cs, en, type MessageKey } from './messages';

const catalogs = { en, cs } as const;

/** Look a message up for a locale (English if the key is missing, the key itself as a last resort). */
export function translate(l: Locale, key: MessageKey, params?: Params): string {
	const message = catalogs[l][key] ?? catalogs.en[key];
	return message === undefined ? String(key) : format(l, message, params);
}

/**
 * Translate into the CURRENT language. Reactive: it reads `locale.current`, so markup and `$derived`
 * values that call it update when the language changes.
 */
export function t(key: MessageKey, params?: Params): string {
	return translate(locale.current, key, params);
}
