import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

/** Languages the app is translated into (the frontend offers the same two). */
export const SUPPORTED_LANGUAGES = ['en', 'cs'] as const;
export const DEFAULT_LANGUAGE = 'en';

export type Args = Record<string, string | number>;

/**
 * Translates server-side text into a given user's language.
 *
 * Emails and notifications are created when something happens, often while the recipient is not
 * using the app, so there is no request to take a language from: the caller passes the recipient's
 * saved language explicitly. An unknown or missing language falls back to English, and so does a
 * key that is missing in the requested language.
 */
@Injectable()
export class Translator {
  constructor(private readonly i18n: I18nService) {}

  /** The language to use for `lang`: itself when supported, otherwise English. */
  resolve(lang: string | null | undefined): string {
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang ?? '') ? (lang as string) : DEFAULT_LANGUAGE;
  }

  t(lang: string | null | undefined, key: string, args?: Args): string {
    const wanted = this.resolve(lang);
    const out = this.i18n.t(key, { lang: wanted, args }) as string;
    if (out !== key || wanted === DEFAULT_LANGUAGE) return out;
    return this.i18n.t(key, { lang: DEFAULT_LANGUAGE, args }) as string;
  }
}
