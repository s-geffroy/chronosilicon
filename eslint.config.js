import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '.cache/**', 'playwright-report/**', 'test-results/**', 'specs/**', '.claude/**'] },
  ...tseslint.configs.strict,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.svelte'] } },
  },
  {
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-dynamic-delete': 'off' },
  },
);
