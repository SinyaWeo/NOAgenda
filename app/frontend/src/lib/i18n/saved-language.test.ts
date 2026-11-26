import { afterEach, describe, expect, it, vi } from 'vitest';

const me = { id: 1, username: 'alice', language: 'cs' };
vi.mock('#lib/api.js', () => ({
	getToken: () => 'token',
	refreshAccessToken: async () => true,
	clearToken: () => {},
	endServerSession: async () => {},
	apiFetchAuth: async () => new Response(JSON.stringify(me), { status: 200 })
}));

import { authSession, refreshCurrentUser } from '#lib/auth.svelte.js';
import { locale, setLocale, t } from './index';

describe('current language', () => {
	afterEach(() => setLocale('en'));

	it('translates with the language chosen last', () => {
		setLocale('en');
		expect(t('common.cancel')).toBe('Cancel');
		setLocale('cs');
		expect(t('common.cancel')).toBe('Zrušit');
	});

	it('switches to the signed-in user’s saved language', async () => {
		setLocale('en');
		await refreshCurrentUser();
		expect(authSession.status).toBe('authenticated');
		expect(locale.current).toBe('cs');
	});
});
