import { apiFetchAuth, getToken } from './api';

export async function getCurrentUser(): Promise<any | null> {
	if (!getToken()) return null;
	try {
		const res = await apiFetchAuth('/users/me');
		if (!res.ok) return null;
		return await res.json();
	} catch (e) {
		return null;
	}
}
