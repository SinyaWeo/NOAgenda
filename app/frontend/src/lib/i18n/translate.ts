import { get } from 'svelte/store';
import { format, type Locale, type Params } from './core';
import { locale } from './locale-store';
import { cs, en, type MessageKey } from './messages';

const catalogs = { en, cs } as const;

/** Look a message up for a locale (English if the key is missing, the key itself as a last resort). */
export function translate(l: Locale, key: MessageKey, params?: Params): string {
	const message = catalogs[l][key] ?? catalogs.en[key];
	return message === undefined ? String(key) : format(l, message, params);
}

/** For plain (non-component) code: translate into the CURRENT language. */
export function tr(key: MessageKey, params?: Params): string {
	return translate(get(locale), key, params);
}
