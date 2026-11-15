import adapter from '@sveltejs/adapter-node';
import { loadEnv } from 'vite';

// Origin of the API when it lives on a different origin than the UI
// (local development: http://localhost:3000). In production the API is served
// from the same origin under /api (see docker/Caddyfile), so no extra origin.
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const apiBase = loadEnv(mode, process.cwd(), '').VITE_API_BASE || (mode === 'development' ? 'http://localhost:3000' : '');
const apiOrigin = /^https?:\/\//.test(apiBase) ? new URL(apiBase).origin : null;
const extra = apiOrigin ? [apiOrigin] : [];

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// Content-Security-Policy. SvelteKit adds nonces/hashes for its own inline scripts.
		// 'unsafe-inline' for styles is required by Flowbite/Tailwind runtime styles.
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'blob:', ...extra],
				'font-src': ['self', 'data:'],
				'connect-src': ['self', ...extra],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'frame-ancestors': ['none']
			}
		}
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
