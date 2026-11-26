import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default defineConfig(
	{ ignores: ['build/**', '.svelte-kit/**', 'node_modules/**', 'static/**', 'scripts/**'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			// Type information for @typescript-eslint/no-deprecated.
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			// Current APIs only: anything a library or the platform marks @deprecated is an error.
			'@typescript-eslint/no-deprecated': 'error',
			// `_x` marks an intentionally unused value.
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
			],
			// Links in this app are plain paths served by SvelteKit's router, not base-prefixed URLs.
			'svelte/no-navigation-without-resolve': 'off',
			// Best-effort calls (notification polling, sidebar state in localStorage...) may ignore a failure on purpose.
			'no-empty': ['error', { allowEmptyCatch: true }],
			// Placeholder tokens (\u0001/\u0002) are used on purpose to split translated sentences around markup.
			'no-control-regex': 'off',
			// Local Date/Map/URLSearchParams values used for one-off calculations are not reactive state.
			'svelte/prefer-svelte-reactivity': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: { parser: svelteParser, parserOptions: { parser: tseslint.parser } }
	}
);
