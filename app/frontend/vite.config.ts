import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// Unit tests cover plain TypeScript in src/lib (no DOM, no Svelte components).
	test: { include: ['src/**/*.test.ts'], environment: 'node' }
});
