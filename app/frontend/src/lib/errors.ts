import { t } from './i18n/translate';

/** A readable, translated message from anything that was thrown (ApiError, Error, a string, or something odd). */
export function errMessage(e: unknown, fallback?: string): string {
	// fetch() rejects with a bare TypeError ("Failed to fetch" / "NetworkError ...") when the server is unreachable.
	if (e instanceof TypeError && /fetch|network|load failed/i.test(e.message)) return t('errors.network');
	if (e instanceof Error && e.message) return e.message;
	if (typeof e === 'string' && e) return e;
	return fallback ?? t('common.somethingWentWrong');
}
