import { apiFetch } from './api';

export async function getCurrentUser(): Promise<any | null> {
	try {
		const res = await apiFetch('/users/me');
		if (!res.ok) return null;
		return await res.json();
	} catch (e) {
		return null;
	}
}
