import { get, writable } from 'svelte/store';
import { apiFetchAuth, clearToken, getToken } from './api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthSession = {
	status: AuthStatus;
	user: any | null;
};

export const authSession = writable<AuthSession>({
	status: 'loading',
	user: null,
});

let refreshPromise: Promise<any | null> | null = null;

export async function refreshCurrentUser(): Promise<any | null> {
	if (!getToken()) {
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

export async function initializeAuth(): Promise<any | null> {
	if (refreshPromise) return refreshPromise;
	return refreshCurrentUser();
}

export function clearAuthSession() {
	clearToken();
	authSession.set({ status: 'unauthenticated', user: null });
}

export async function getCurrentUser(): Promise<any | null> {
	if (refreshPromise) return refreshPromise;
	const session = get(authSession);
	if (session.status === 'authenticated' && session.user !== null) {
		return session.user;
	}
	const token = getToken();
	if (!token) {
		authSession.set({ status: 'unauthenticated', user: null });
		return null;
	}
	return refreshCurrentUser();
}
