// Centralized API utility for SvelteKit frontend
// Set your backend base URL here or use an environment variable
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3000';

export async function apiFetch(path: string, options: RequestInit = {}) {
	const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
	try {
		const response = await fetch(url, {
			credentials: 'include', // send cookies if needed
			...options
		});
		if (!response.ok) {
			console.error('API error:', response.status, response.statusText, url);
		}
		return response;
	} catch (err) {
		console.error('Network/API fetch error:', err, url, options);
		throw err;
	}
}

/** Helper: POST JSON and return parsed response or throw */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
	const res = await apiFetch(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(await res.text());
	const text = await res.text();
	return text ? JSON.parse(text) : ({} as T);
}

/** Helper: PUT JSON and return parsed response or throw */
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
	const res = await apiFetch(path, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

/** Helper: DELETE and return void or throw */
export async function apiDelete(path: string): Promise<void> {
	const res = await apiFetch(path, { method: 'DELETE' });
	if (!res.ok) throw new Error(await res.text());
}

/** Helper: GET and return parsed JSON or throw */
export async function apiGet<T>(path: string): Promise<T> {
	const res = await apiFetch(path);
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

// --- Auth token storage ---
/** Store JWT in sessionStorage (no cookies used by backend JWT) */
export function setToken(token: string) {
	if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('access_token', token);
}
export function getToken(): string | null {
	if (typeof sessionStorage !== 'undefined') return sessionStorage.getItem('access_token');
	return null;
}
export function clearToken() {
	if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('access_token');
}

/** apiFetch with Bearer token attached */
export async function apiFetchAuth(path: string, options: RequestInit = {}) {
	const token = getToken();
	const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
	if (token) headers['Authorization'] = `Bearer ${token}`;
	return apiFetch(path, { ...options, headers });
}

export async function apiGetAuth<T>(path: string): Promise<T> {
	const res = await apiFetchAuth(path);
	if (res.status === 401) { clearToken(); if (typeof window !== 'undefined') window.location.href = '/login'; throw new Error('Unauthorized'); }
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

export async function apiPostAuth<T>(path: string, body: unknown): Promise<T> {
	const res = await apiFetchAuth(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (res.status === 401) { clearToken(); if (typeof window !== 'undefined') window.location.href = '/login'; throw new Error('Unauthorized'); }
	if (!res.ok) throw new Error(await res.text());
	const text = await res.text();
	return text ? JSON.parse(text) : ({} as T);
}

export async function apiPutAuth<T>(path: string, body: unknown): Promise<T> {
	const res = await apiFetchAuth(path, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (res.status === 401) { clearToken(); if (typeof window !== 'undefined') window.location.href = '/login'; throw new Error('Unauthorized'); }
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

export async function apiDeleteAuth(path: string): Promise<void> {
	const res = await apiFetchAuth(path, { method: 'DELETE' });
	if (res.status === 401) { clearToken(); if (typeof window !== 'undefined') window.location.href = '/login'; throw new Error('Unauthorized'); }
	if (!res.ok) throw new Error(await res.text());
}

export async function apiPatchAuth<T>(path: string, body: unknown): Promise<T> {
	const res = await apiFetchAuth(path, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (res.status === 401) { clearToken(); if (typeof window !== 'undefined') window.location.href = '/login'; throw new Error('Unauthorized'); }
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

