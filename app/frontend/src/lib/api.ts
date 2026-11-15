// Centralized API utility for SvelteKit frontend
// Set your backend base URL here or use an environment variable
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3000';

function extractApiErrorMessage(rawText: string, fallback = 'Request failed'): string {
	if (!rawText) return fallback;
	try {
		const parsed = JSON.parse(rawText) as { message?: string | string[] };
		if (Array.isArray(parsed.message)) return parsed.message.join(', ');
		if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) return parsed.message;
	} catch {
		// rawText is not JSON; return it directly.
	}
	return rawText;
}

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
		// Never log request options/body: they can contain credentials.
		console.error('Network/API fetch error:', err, url);
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
	if (!res.ok) throw new Error(extractApiErrorMessage(await res.text(), 'Request failed'));
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
	if (!res.ok) throw new Error(extractApiErrorMessage(await res.text(), 'Request failed'));
	return res.json();
}

/** Helper: DELETE and return void or throw */
export async function apiDelete(path: string): Promise<void> {
	const res = await apiFetch(path, { method: 'DELETE' });
	if (!res.ok) throw new Error(extractApiErrorMessage(await res.text(), 'Request failed'));
}

/** Helper: GET and return parsed JSON or throw */
export async function apiGet<T>(path: string): Promise<T> {
	const res = await apiFetch(path);
	if (!res.ok) throw new Error(extractApiErrorMessage(await res.text(), 'Request failed'));
	return res.json();
}

// --- Auth token storage ---
/** Store JWT in localStorage so auth survives reloads and browser restarts. */
export function setToken(token: string) {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('access_token', token);
	}
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.removeItem('access_token');
	}
}
export function getToken(): string | null {
	if (typeof localStorage !== 'undefined') {
		const token = localStorage.getItem('access_token');
		if (token) return token;
	}
	if (typeof sessionStorage !== 'undefined') {
		const token = sessionStorage.getItem('access_token');
		if (token && typeof localStorage !== 'undefined') {
			localStorage.setItem('access_token', token);
			sessionStorage.removeItem('access_token');
		}
		return token;
	}
	return null;
}
export function clearToken() {
	if (typeof localStorage !== 'undefined') localStorage.removeItem('access_token');
	if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('access_token');
}

/** apiFetch with Bearer token attached */
export async function apiFetchAuth(path: string, options: RequestInit = {}) {
	const token = getToken();
	const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
	if (token) headers['Authorization'] = `Bearer ${token}`;
	return apiFetch(path, { ...options, headers });
}

/**
 * Download an authenticated file. A plain <a href> cannot send the Bearer
 * header, so fetch it with auth, then hand the blob to the browser.
 */
export async function downloadAuthFile(path: string, filename: string): Promise<void> {
	const res = await apiFetchAuth(path);
	if (res.status === 401) { clearToken(); if (typeof window !== 'undefined') window.location.href = '/user/login'; throw new Error('Unauthorized'); }
	if (!res.ok) throw new Error(extractApiErrorMessage(await res.text(), 'Download failed'));
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function apiGetAuth<T>(path: string): Promise<T> {
	const res = await apiFetchAuth(path);
	if (res.status === 401) { clearToken(); if (typeof window !== 'undefined') window.location.href = '/user/login'; throw new Error('Unauthorized'); }
	if (!res.ok) throw new Error(extractApiErrorMessage(await res.text(), 'Request failed'));
	return res.json();
}

export async function apiPostAuth<T>(path: string, body: unknown): Promise<T> {
	const res = await apiFetchAuth(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (res.status === 401) { clearToken(); if (typeof window !== 'undefined') window.location.href = '/user/login'; throw new Error('Unauthorized'); }
	if (!res.ok) throw new Error(extractApiErrorMessage(await res.text(), 'Request failed'));
	const text = await res.text();
	return text ? JSON.parse(text) : ({} as T);
}

export async function apiPutAuth<T>(path: string, body: unknown): Promise<T> {
	const res = await apiFetchAuth(path, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (res.status === 401) { clearToken(); if (typeof window !== 'undefined') window.location.href = '/user/login'; throw new Error('Unauthorized'); }
	if (!res.ok) throw new Error(extractApiErrorMessage(await res.text(), 'Request failed'));
	return res.json();
}

export async function apiDeleteAuth(path: string): Promise<void> {
	const res = await apiFetchAuth(path, { method: 'DELETE' });
	if (res.status === 401) { clearToken(); if (typeof window !== 'undefined') window.location.href = '/user/login'; throw new Error('Unauthorized'); }
	if (!res.ok) throw new Error(extractApiErrorMessage(await res.text(), 'Request failed'));
}

export async function apiPatchAuth<T>(path: string, body: unknown): Promise<T> {
	const res = await apiFetchAuth(path, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (res.status === 401) { clearToken(); if (typeof window !== 'undefined') window.location.href = '/user/login'; throw new Error('Unauthorized'); }
	if (!res.ok) throw new Error(extractApiErrorMessage(await res.text(), 'Request failed'));
	return res.json();
}

