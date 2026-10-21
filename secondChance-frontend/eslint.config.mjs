import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // 1. GLOBAL IGNORES (Replaces .eslintignore)
  {
    ignores: [
      "node_modules/",
      "dist/",          // Vite's build folder (CRA used 'build/')
      "vite.config.js"  // Bypasses the config file itself
    ]
  },
  
  // 2. LINTING CONFIGURATION FOR VITE + REACT
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2020
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules, // Disables legacy rules requiring 'import React' in every file
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/prop-types': 'off' // Highly recommended for modern React development
    },
    settings: {
      react: { version: 'detect' }
    }
  }
];
