import { get, writable } from 'svelte/store';
import { apiFetchAuth, clearToken, endServerSession, getToken, refreshAccessToken } from './api';
import type { User } from './types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthSession = {
	status: AuthStatus;
	user: User | null;
};

export const authSession = writable<AuthSession>({
	status: 'loading',
	user: null,
});

let refreshPromise: Promise<User | null> | null = null;

export async function refreshCurrentUser(): Promise<User | null> {
	// No access token (e.g. it was cleared or expired long ago): a valid refresh cookie can still restore the session.
	if (!getToken() && !(await refreshAccessToken())) {
		authSession.set({ status: 'unauthenticated', user: null });
		return null;
	}

	authSession.update((s) => ({ ...s, status: 'loading' }));
	refreshPromise = (async () => {
		try {
			const res = await apiFetchAuth('/users/me');
			if (!res.ok) {
				if (res.status === 401) clearToken();
				authSession.set({ status: 'unauthenticated', user: null });
				return null;
			}
			const user = await res.json();
			authSession.set({ status: 'authenticated', user });
			return user;
		} catch (_) {
			authSession.set({ status: 'unauthenticated', user: null });
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
	authSession.set({ status: 'unauthenticated', user: null });
}

export async function getCurrentUser(): Promise<User | null> {
	if (refreshPromise) return refreshPromise;
	const session = get(authSession);
	if (session.status === 'authenticated' && session.user !== null) {
		return session.user;
	}
	return refreshCurrentUser();
}
