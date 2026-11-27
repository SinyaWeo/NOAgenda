import { apiFetchAuth, clearToken, endServerSession, getToken, refreshAccessToken } from './api';
import { effectiveZone } from './calendar';
import { isLocale } from './i18n/core';
import { setLocale } from './i18n/locale.svelte';
import type { User } from './types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthSession = {
	status: AuthStatus;
	user: User | null;
};

/** Who is signed in. Read `authSession.status` / `authSession.user`; change it only through this module. */
export const authSession = $state<AuthSession>({
	status: 'loading',
	user: null
});

function setSession(status: AuthStatus, user: User | null): void {
	authSession.status = status;
	authSession.user = user;
	// A signed-in user's saved language wins over this browser's guess.
	if (isLocale(user?.language)) setLocale(user.language);
}

/** The zone the signed-in user's calendar days are counted in (their profile zone; the browser's when signed out). */
export function userTimeZone(): string {
	return effectiveZone(authSession.user?.timezone);
}

/** Change fields of the signed-in user locally (after the server accepted them). */
export function patchCurrentUser(patch: Partial<User>): void {
	if (authSession.user) authSession.user = { ...authSession.user, ...patch };
}

let refreshPromise: Promise<User | null> | null = null;

export async function refreshCurrentUser(): Promise<User | null> {
	// No access token (e.g. it was cleared or expired long ago): a valid refresh cookie can still restore the session.
	if (!getToken() && !(await refreshAccessToken())) {
		setSession('unauthenticated', null);
		return null;
	}

	authSession.status = 'loading';
	refreshPromise = (async () => {
		try {
			const res = await apiFetchAuth('/users/me');
			if (!res.ok) {
				if (res.status === 401) clearToken();
				setSession('unauthenticated', null);
				return null;
			}
			const user = await res.json();
			setSession('authenticated', user);
			return user;
		} catch (_) {
			setSession('unauthenticated', null);
			return null;
		} finally {
			refreshPromise = null;
		}
	})();

	return refreshPromise;
}

export async function initializeAuth(): Promise<User | null> {
	if (refreshPromise) return refreshPromise;
	return refreshCurrentUser();
}

/** Sign out: end the session on the server (revokes the refresh token), then clear local state. */
export async function logout(): Promise<void> {
	await endServerSession();
	clearAuthSession();
}

export function clearAuthSession() {
	clearToken();
	setSession('unauthenticated', null);
}

export async function getCurrentUser(): Promise<User | null> {
	if (refreshPromise) return refreshPromise;
	if (authSession.status === 'authenticated' && authSession.user !== null) {
		return authSession.user;
	}
	return refreshCurrentUser();
}
