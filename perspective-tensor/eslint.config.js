import eslintPluginAstro from 'eslint-plugin-astro';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  // Recommended Astro config
  ...eslintPluginAstro.configs['flat/recommended'],
  {
    files: ['**/*.{js,jsx,ts,tsx,astro}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        extraFileExtensions: ['.astro'],
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      
      // React specific (for .tsx files)
      'react/react-in-jsx-scope': 'off', // Not needed in modern React
    },
  },
  {
    // Special config for Astro files
    files: ['**/*.astro'],
    languageOptions: {
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: typescriptParser,
        extraFileExtensions: ['.astro'],
      },
    },
  },
  {
    // Ignore patterns
    ignores: [
      'dist/',
      'node_modules/',
      '.astro/',
      '*.backup.*',
      '*.backup/',
      'public/',
    ],
  },
];