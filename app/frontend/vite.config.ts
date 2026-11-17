import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Origin of the API when it lives on a different origin than the UI
// (local development: http://localhost:3000). In production the API is served
// from the same origin under /api (see docker/Caddyfile), so no extra origin.
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const apiBase =
	loadEnv(mode, process.cwd(), '').VITE_API_BASE || (mode === 'development' ? 'http://localhost:3000' : '');
const apiOrigin = /^https?:\/\//.test(apiBase) ? new URL(apiBase).origin : null;
const extra = (apiOrigin ? [apiOrigin] : []) as NonNullable<
	NonNullable<NonNullable<NonNullable<Parameters<typeof sveltekit>[0]>['csp']>['directives']>['connect-src']
>;

export default defineConfig({
	plugins: [
		tailwindcss(),
		// SvelteKit 3 reads its configuration from the plugin (svelte.config.js is no longer supported).
		sveltekit({
			adapter: adapter(),
			// Kit 3 removed the built-in $lib; keep the existing imports working (migrate to #lib later).
			alias: { $lib: 'src/lib' },
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
			},
			// Options below are forwarded to @sveltejs/vite-plugin-svelte.
			dynamicCompileOptions: ({ filename }) =>
				filename.includes('node_modules') ? undefined : { runes: true }
		})
	],
	// Unit tests cover plain TypeScript in src/lib (no DOM, no Svelte components).
	test: { include: ['src/**/*.test.ts'], environment: 'node' }
});
