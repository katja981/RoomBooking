import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';
import { globalIgnores, defineConfig } from 'eslint/config';
import { plugin as skillIssue } from './eslint-rules/skill-issue.js';

export default defineConfig([
  globalIgnores(['dist']),
  {
    plugins: {
      react,
      'skill-issue': skillIssue,
    },
    rules: {
      'skill-issue/skill-issue': 'error',
      'no-unused-vars': 'warn',
      'react/function-component-definition': ['warn', { 
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',}], 
        'react/destructuring-assignment': ['warn', 'always'],
        'react/hook-use-state': ['warn', { allowDestructuredState: true }],
    },
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
]);
