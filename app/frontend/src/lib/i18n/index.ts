import { authSession } from '#lib/auth.svelte.js';
import { LOCALES, isLocale, type Locale, type Params } from './core';
import { makeFormatters, type Formatters } from './format';
import { locale, setLocale } from './locale.svelte';
import type { MessageKey } from './messages';
import { translate, t } from './translate';

/**
 * `{t('common.save')}`, `{t('tasks.count', { count: n })}` (plural forms are chosen from `count`),
 * `placeholder={t('...')}`. The same function works in markup and in plain TypeScript.
 */
export { LOCALES, isLocale, locale, setLocale, translate, t, type Locale, type MessageKey, type Params };

let cache: { key: string; formatters: Formatters } | null = null;

/** Formatters for the current language and the user's saved time zone (built once per combination). */
function current(): Formatters {
	const l = locale.current;
	const zone = authSession.user?.timezone ?? undefined;
	const key = `${l}|${zone ?? ''}`;
	if (cache?.key !== key) cache = { key, formatters: makeFormatters(l, zone) };
	return cache.formatters;
}

/**
 * Dates and numbers in the current language and the user's saved time zone: `{fmt.date(task.dueDate)}`.
 * Reactive like `t`: each call reads the current language and time zone.
 */
export const fmt: Formatters = {
	date: (v) => current().date(v),
	dateTime: (v) => current().dateTime(v),
	dateLong: (v) => current().dateLong(v),
	number: (v) => current().number(v),
	weekdayShort: (day) => current().weekdayShort(day),
	monthYear: (day) => current().monthYear(day)
};
