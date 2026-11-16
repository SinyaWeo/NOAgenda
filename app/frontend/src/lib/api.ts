// Centralized API utility for SvelteKit frontend
// Set your backend base URL here or use an environment variable
import { tr } from './i18n/translate';
import { localizeServerMessage } from './i18n/server-messages';

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

/** Error from a failed API call. `status` is the HTTP status. */
export class ApiError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

/**
 * Build the Error to throw for a failed response. Validation/conflict messages from the
 * server are shown as they are (they say what to fix); permission, rate-limit and
 * server errors get one consistent, friendly wording.
 */
export async function apiError(res: Response, fallback?: string): Promise<ApiError> {
	const raw = await res.text().catch(() => '');
	// A specific server message ("A valid invite code is required...", "Registration is closed") beats
	// our generic wording; only the framework's bare defaults are replaced. Known server messages are
	// translated into the current language, unknown ones are shown as sent.
	const server = extractApiErrorMessage(raw, '');
	const isGeneric = !server || /^(forbidden( resource)?|not found|unauthorized|bad request|payload too large)$/i.test(server.trim());
	const specific = () => localizeServerMessage(server);
	let message: string;
	switch (res.status) {
		case 403:
			message = isGeneric ? tr('errors.forbidden') : specific();
			break;
		case 404:
			message = isGeneric ? tr('errors.notFound') : specific();
			break;
		case 413:
			message = isGeneric ? tr('errors.tooLarge') : specific();
			break;
		case 429:
			message = tr('errors.rateLimited');
			break;
		default:
			message =
				res.status >= 500
					? tr('errors.serverError')
					: server
						? specific()
						: (fallback ?? tr('errors.requestFailed'));
	}
	return new ApiError(message, res.status);
}

/** The session is gone (refresh failed): clear it and go to the login page, remembering where we were. */
export function sessionExpired(): Error {
	clearToken();
	if (typeof window !== 'undefined') {
		const here = window.location.pathname + window.location.search;
		const onLogin = window.location.pathname.startsWith('/user/login');
		window.location.href = onLogin
			? '/user/login'
			: `/user/login?reason=expired&redirect=${encodeURIComponent(here)}`;
	}
	return new ApiError(tr('errors.sessionExpired'), 401);
}

const ABSOLUTE = /^https?:\/\//i;

/** True when `path` is for our own API (a relative path, or an absolute URL on the API's origin). */
function isApiUrl(path: string): boolean {
	if (!ABSOLUTE.test(path)) return true;
	try {
		return new URL(path).origin === new URL(API_BASE, typeof window !== 'undefined' ? window.location.origin : undefined).origin;
	} catch {
		return false;
	}
}

export async function apiFetch(path: string, options: RequestInit = {}) {
	const url = ABSOLUTE.test(path) ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
	try {
		const response = await fetch(url, {
			credentials: 'include', // send cookies if needed
			...options
		});
		// 4xx are normal outcomes (validation, permission, expired token that is retried): callers handle
		// them. Only server errors are worth a console line.
		if (response.status >= 500) console.error('API error:', response.status, response.statusText, url);
		return response;
	} catch (err) {
		// Never log request options/body: they can contain credentials.
		console.error('Network/API fetch error:', err, url);
		throw err;
	}
}

async function readBody<T>(res: Response): Promise<T> {
	const text = await res.text();
	return text ? JSON.parse(text) : ({} as T);
}

/** One JSON request: attaches the Bearer token when `auth`, and turns failures into ApiError. */
async function call<T>(auth: boolean, method: string, path: string, body?: unknown): Promise<T> {
	const init: RequestInit = { method };
	if (body !== undefined) {
		init.headers = { 'Content-Type': 'application/json' };
		init.body = JSON.stringify(body);
	}
	const res = auth ? await apiFetchAuth(path, init) : await apiFetch(path, init);
	if (auth && res.status === 401) throw sessionExpired();
	if (!res.ok) throw await apiError(res);
	return readBody<T>(res);
}

/** Helper: POST JSON and return parsed response or throw */
export const apiPost = <T>(path: string, body: unknown) => call<T>(false, 'POST', path, body);
/** Helper: PUT JSON and return parsed response or throw */
export const apiPut = <T>(path: string, body: unknown) => call<T>(false, 'PUT', path, body);
/** Helper: DELETE and return void or throw */
export const apiDelete = async (path: string): Promise<void> => void (await call(false, 'DELETE', path));
/** Helper: GET and return parsed JSON or throw */
export const apiGet = <T>(path: string) => call<T>(false, 'GET', path);

// --- Auth token storage ---
/** Store the (short-lived) access token in localStorage so it survives reloads. */
export function setToken(token: string) {
	lastRefreshFailure = 0;
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

// --- Session refresh ---
// The access token is short-lived (minutes). The long-lived credential is an
// httpOnly refresh cookie that scripts cannot read; the backend rotates it on use.
let refreshInFlight: Promise<boolean> | null = null;
let lastRefreshFailure = 0;

/**
 * Exchange the refresh cookie for a new access token. Concurrent callers share one
 * request (the cookie rotates, so parallel refreshes would race). Returns false when
 * there is no valid session.
 */
export function refreshAccessToken(): Promise<boolean> {
	if (refreshInFlight) return refreshInFlight;
	// Don't hammer the server while logged out.
	if (Date.now() - lastRefreshFailure < 10_000) return Promise.resolve(false);
	refreshInFlight = (async () => {
		try {
			const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
			if (!res.ok) {
				lastRefreshFailure = Date.now();
				return false;
			}
			const data = (await res.json()) as { access_token?: string };
			if (!data.access_token) return false;
			setToken(data.access_token);
			lastRefreshFailure = 0;
			return true;
		} catch {
			return false;
		}
	})().finally(() => {
		refreshInFlight = null;
	});
	return refreshInFlight;
}

/** Tell the server to end this session and drop the refresh cookie (best effort). */
export async function endServerSession(): Promise<void> {
	try {
		await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
	} catch {
		// offline: the local token is cleared by the caller anyway
	}
}

/**
 * apiFetch with the Bearer token attached. If the access token is missing or has
 * expired, silently refreshes it from the cookie and retries once.
 */
export async function apiFetchAuth(path: string, options: RequestInit = {}) {
	const isAuthEndpoint = path.startsWith('/auth/');
	const send = () => {
		const token = getToken();
		const headers = new Headers(options.headers); // accepts plain objects, arrays and Headers
		// The access token belongs to our API only: never send it to some other origin.
		if (token && isApiUrl(path)) headers.set('Authorization', `Bearer ${token}`);
		return apiFetch(path, { ...options, headers });
	};
	if (!getToken() && !isAuthEndpoint) await refreshAccessToken();
	let res = await send();
	if (res.status === 401 && !isAuthEndpoint && (await refreshAccessToken())) res = await send();
	return res;
}

/**
 * Download an authenticated file. A plain <a href> cannot send the Bearer
 * header, so fetch it with auth, then hand the blob to the browser.
 */
export async function downloadAuthFile(path: string, filename: string): Promise<void> {
	const res = await apiFetchAuth(path);
	if (res.status === 401) throw sessionExpired();
	if (!res.ok) throw await apiError(res);
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

export const apiGetAuth = <T>(path: string) => call<T>(true, 'GET', path);
export const apiPostAuth = <T>(path: string, body: unknown) => call<T>(true, 'POST', path, body);
export const apiPutAuth = <T>(path: string, body: unknown) => call<T>(true, 'PUT', path, body);
export const apiPatchAuth = <T>(path: string, body: unknown) => call<T>(true, 'PATCH', path, body);
export const apiDeleteAuth = async (path: string): Promise<void> => void (await call(true, 'DELETE', path));
