/**
 * Translation core: pure functions, no stores, no browser APIs (so it can be tested with plain Node).
 *
 * A message is a string with {name} placeholders, or a set of plural forms chosen with
 * Intl.PluralRules for the locale (English: one/other; Czech: one/few/many/other).
 */
export type Locale = 'en' | 'cs';
export const LOCALES: { code: Locale; label: string }[] = [
	{ code: 'en', label: 'English' },
	{ code: 'cs', label: 'Čeština' }
];
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
	return value === 'en' || value === 'cs';
}

export type Plural = { one?: string; few?: string; many?: string; other: string };
export type Message = string | Plural;
export type Params = Record<string, string | number>;

function fill(template: string, params?: Params): string {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
		name in params ? String(params[name]) : whole
	);
}

/** Resolve one message for a locale. `count` selects a plural form when the message has them. */
export function format(
	locale: Locale,
	message: Message | undefined,
	params?: Params,
	count?: number
): string {
	if (message === undefined) return '';
	if (typeof message === 'string') return fill(message, params);
	const n = count ?? (typeof params?.count === 'number' ? params.count : 0);
	const form = new Intl.PluralRules(locale).select(n) as keyof Plural;
	return fill(message[form] ?? message.other, { ...params, count: n });
}

/** Best guess for a visitor with no saved choice: Czech browsers get Czech, everyone else English. */
export function detectLocale(languages: readonly string[] | undefined): Locale {
	for (const l of languages ?? []) {
		const code = l.toLowerCase().split('-')[0];
		if (code === 'cs') return 'cs';
		if (code === 'en') return 'en';
	}
	return DEFAULT_LOCALE;
}
