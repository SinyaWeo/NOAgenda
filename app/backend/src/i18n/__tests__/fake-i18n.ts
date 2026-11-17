import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Translator } from '../translator.service';

const LOCALES = join(__dirname, '..', 'locales');

/** One directory per language; each file's name is the first part of its keys (email.json -> "email.verify.subject"). */
export function readLocale(lang: string): Record<string, any> {
  const dir = join(LOCALES, lang);
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(dir, f), 'utf8'))]),
  );
}

/** The real locale files behind the same call shape as nestjs-i18n (a missing key answers with the key itself). */
export function fakeI18n() {
  const dictionaries: Record<string, any> = {};
  const load = (lang: string) => (dictionaries[lang] ??= readLocale(lang));
  return {
    t: (key: string, opts: { lang?: string; args?: Record<string, unknown> } = {}) => {
      const found = key
        .split('.')
        .reduce((o: any, k) => (o && typeof o === 'object' ? o[k] : undefined), load(opts.lang ?? 'en'));
      if (typeof found !== 'string') return key;
      return found.replace(/\{(\w+)\}/g, (m, name) => (opts.args && name in opts.args ? String(opts.args[name]) : m));
    },
  };
}

/** A Translator over the real locale files, for tests. */
export const realTranslator = () => new Translator(fakeI18n() as any);
