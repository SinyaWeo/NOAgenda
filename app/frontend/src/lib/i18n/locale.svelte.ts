import { DEFAULT_LOCALE, detectLocale, isLocale, type Locale } from './core';

const STORAGE_KEY = 'lang';

/** Saved choice first, then the browser's language. The server (no browser) always starts in English. */
function initialLocale(): Locale {
	if (typeof window === 'undefined') return DEFAULT_LOCALE;
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (isLocale(saved)) return saved;
	} catch {
		/* storage blocked: fall through */
	}
	return detectLocale(navigator.languages);
}

/** Remember the language in this browser and tell the document (screen readers, hyphenation). */
function apply(l: Locale): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, l);
	} catch {
		/* ignore */
	}
	document.documentElement.lang = l;
}

/** The current interface language (`locale.current`). Kept free of any auth/api import so every module may use it. */
export const locale = $state<{ current: Locale }>({ current: initialLocale() });
apply(locale.current);

/** Switch language for this browser. (Saving it to the account is the settings page's job.) */
export function setLocale(next: Locale): void {
	if (next === locale.current) return;
	locale.current = next;
	apply(next);
}
