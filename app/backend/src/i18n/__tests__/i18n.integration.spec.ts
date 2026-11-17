import { Test } from '@nestjs/testing';
import { AppI18nModule } from '../i18n.module';
import { Translator } from '../translator.service';

/** Against the real nestjs-i18n (not the stand-in the other tests use): nested keys, {placeholders}, fallback. */
describe('Translator with the real nestjs-i18n', () => {
  let tr: Translator;
  let mod: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>>;
  beforeAll(async () => {
    mod = await Test.createTestingModule({ imports: [AppI18nModule] }).compile();
    await mod.init();
    tr = mod.get(Translator);
  });

  afterAll(() => mod.close()); // stops the locale-file watcher

  it('translates nested keys and fills {placeholders}', () => {
    expect(tr.t('en', 'email.reset.subject', { app: 'Acme' })).toBe('Reset your Acme password');
    expect(tr.t('cs', 'notification.task_comment', { actor: 'ann', title: 'Plán' })).toBe(
      'ann okomentoval(a) úkol „Plán“',
    );
  });

  it('falls back to English for an unsupported language', () => {
    expect(tr.t('de', 'notification.task_reminder', { title: 'X' })).toBe('Reminder: "X"');
  });
});
