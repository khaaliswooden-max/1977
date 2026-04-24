import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      '.vite/**',
      '_bmad/**',
      '_bmad-output/**',
      '.claude/**',
    ],
  },

  // Base recommended
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Project-wide rules
  {
    plugins: {
      'import-x': importX,
    },
    rules: {
      // CR4 — path alias 强制：禁深层相对父级 import
      'import-x/no-relative-parent-imports': 'error',
      // CR5 — named exports only：禁 export default
      'import-x/no-default-export': 'error',
      // 杂项严格
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // CR11 / AB1 — game/ 禁 import render/audio/companion/debug
  {
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/render/*',
                '@/audio/*',
                '@/companion/*',
                '@/debug/*',
              ],
              message:
                'AB1: game/ cannot import render/audio/companion/debug layers (architecture boundary)',
            },
          ],
        },
      ],
    },
  },

  // 配置文件豁免 default-export 规则（许多 JS 工具仍要求 default export）
  {
    files: [
      'vite.config.ts',
      'vitest.config.ts',
      'vitest.browser.config.ts',
      'playwright.config.ts',
      'eslint.config.js',
    ],
    rules: {
      'import-x/no-default-export': 'off',
    },
  },
);
