import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { I18nService } from 'nestjs-i18n';
import { Translator } from '../translator.service';
import { asMock } from '../../common/__tests__/test-utils';

/** A parsed locale JSON tree. */
export interface LocaleTree {
  [key: string]: string | LocaleTree;
}

const LOCALES = join(__dirname, '..', 'locales');

/** One directory per language; each file's name is the first part of its keys (email.json -> "email.verify.subject"). */
export function readLocale(lang: string): LocaleTree {
  const dir = join(LOCALES, lang);
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(dir, f), 'utf8'))]),
  );
}

/** The real locale files behind the same call shape as nestjs-i18n (a missing key answers with the key itself). */
export function fakeI18n() {
  const dictionaries: Record<string, LocaleTree> = {};
  const load = (lang: string) => (dictionaries[lang] ??= readLocale(lang));
  return {
    t: (key: string, opts: { lang?: string; args?: Record<string, unknown> } = {}) => {
      const found = key
        .split('.')
        .reduce<string | LocaleTree | undefined>(
          (o, k) => (o && typeof o === 'object' ? o[k] : undefined),
          load(opts.lang ?? 'en'),
        );
      if (typeof found !== 'string') return key;
      return found.replace(/\{(\w+)\}/g, (m, name) => (opts.args && name in opts.args ? String(opts.args[name]) : m));
    },
  };
}

/** A Translator over the real locale files, for tests. */
export const realTranslator = () => new Translator(asMock<I18nService>(fakeI18n()));
