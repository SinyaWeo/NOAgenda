import { readdirSync } from 'fs';
import { join } from 'path';
import { Translator } from '../translator.service';
import { asMock, invalid } from '../../common/__tests__/test-utils';
import type { I18nService } from 'nestjs-i18n';
import { fakeI18n, LocaleTree, readLocale, realTranslator } from './fake-i18n';

const read = readLocale;

/** { a: { b: 'x' } } -> { 'a.b': 'x' } */
function flatten(obj: LocaleTree, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce(
    (out, [k, v]) =>
      typeof v === 'object' ? { ...out, ...flatten(v, `${prefix}${k}.`) } : { ...out, [`${prefix}${k}`]: v as string },
    {},
  );
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('locale files', () => {
  it('have the same files in every language', () => {
    const files = (lang: string) => readdirSync(join(__dirname, '..', 'locales', lang)).sort();
    expect(files('cs')).toEqual(files('en'));
  });

  const en = flatten(read('en'));
  const cs = flatten(read('cs'));

  it('define the same keys in every language', () => {
    expect(Object.keys(cs).sort()).toEqual(Object.keys(en).sort());
  });

  it('use the same {placeholders} for every key, so no language shows a raw or missing value', () => {
    for (const key of Object.keys(en)) expect(placeholders(cs[key])).toEqual(placeholders(en[key]));
  });

  it('have no empty texts', () => {
    for (const [key, text] of Object.entries({ ...en, ...cs })) expect(text.trim()).not.toBe('');
    expect(Object.keys(en).length).toBeGreaterThan(0);
  });
});

describe('Translator', () => {
  const tr = realTranslator();
  const args = { app: 'Acme', username: 'ann', link: 'https://x/y' };

  it('translates into the requested language', () => {
    expect(tr.t('en', 'email.reset.subject', args)).toBe('Reset your Acme password');
    expect(tr.t('cs', 'email.reset.subject', args)).toBe('Obnovení hesla v aplikaci Acme');
  });

  it('fills in every argument', () => {
    const body = tr.t('cs', 'email.verify.body', args);
    expect(body).toContain('ann');
    expect(body).toContain('https://x/y');
    expect(body).not.toMatch(/\{\w+\}/);
  });

  it.each([undefined, null, '', 'de', 'EN'])('falls back to English for the language %p', (lang) => {
    expect(tr.t(invalid<string>(lang), 'notification.task_reminder', { title: 'Pay rent' })).toBe(
      'Reminder: "Pay rent"',
    );
  });

  it('falls back to English when a key is missing in the requested language', () => {
    const i18n = fakeI18n();
    const original = i18n.t;
    i18n.t = (key, opts) => (opts?.lang === 'cs' ? key : original(key, opts));
    expect(new Translator(asMock<I18nService>(i18n)).t('cs', 'notification.task_reminder', { title: 'X' })).toBe(
      'Reminder: "X"',
    );
  });
});
