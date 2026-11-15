import type { Handle } from '@sveltejs/kit';

/**
 * Security headers for every response. The Content-Security-Policy itself is
 * configured in svelte.config.js (kit.csp). HSTS is added by the reverse proxy
 * (docker/Caddyfile) since it terminates TLS.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
	);
	return response;
};
