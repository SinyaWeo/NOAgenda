// @ts-check
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default defineConfig(
  { ignores: ['dist/**', 'node_modules/**', 'uploads/**', 'src/migrations/**', 'scripts/**', '*.mjs', '*.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // Type information for @typescript-eslint/no-deprecated.
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // Current APIs only: anything a library or the platform marks @deprecated is an error.
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      // `_x` marks an intentionally unused destructured value (e.g. dropping `password` from an object).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-unsafe-function-type': 'off' },
  },
);
