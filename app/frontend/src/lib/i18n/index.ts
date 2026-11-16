import { derived, get } from 'svelte/store';
import { authSession } from '$lib/auth';
import { LOCALES, isLocale, type Locale, type Params } from './core';
import { makeFormatters } from './format';
import { locale, setLocale } from './locale-store';
import type { MessageKey } from './messages';
import { translate, tr } from './translate';

export { LOCALES, isLocale, locale, setLocale, translate, tr, type Locale, type MessageKey, type Params };

// A signed-in user's saved language wins over this browser's guess.
authSession.subscribe((s) => {
	const saved = s.user?.language;
	if (isLocale(saved) && saved !== get(locale)) setLocale(saved);
});

/**
 * In components: `{$t('common.save')}`, `{$t('tasks.count', { count: n })}` (plural forms are chosen
 * from `count`), `placeholder={$t('...')}`. In plain functions use `tr('key')`.
 */
export const t = derived(locale, ($l) => (key: MessageKey, params?: Params) => translate($l, key, params));

/** Dates and numbers in the current language and the user's saved time zone: `{$fmt.date(task.dueDate)}`. */
export const fmt = derived([locale, authSession], ([$l, $s]) =>
	makeFormatters($l, $s.user?.timezone ?? undefined)
);
