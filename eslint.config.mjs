/**
 * ESLint-Konfiguration.
 *
 * Bewusst schlank gehalten: geprueft wird auf echte Fehlerquellen
 * (undefinierte Namen, unbenutzter Code, verschluckte Zuweisungen),
 * nicht auf Formatierung.
 */

const BROWSER_GLOBALS = {
  document: 'readonly',
  window: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  fetch: 'readonly',
  caches: 'readonly',
  self: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  Image: 'readonly',
  KeyboardEvent: 'readonly',
};

const NODE_GLOBALS = {
  process: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  URL: 'readonly',
  WebSocket: 'readonly',
  Buffer: 'readonly',
};

const commonRules = {
  'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
  'no-undef': 'error',
  'no-var': 'error',
  'prefer-const': 'error',
  eqeqeq: ['error', 'smart'],
  'no-console': 'off',
  'no-implicit-coercion': 'error',
  'no-return-assign': 'error',
  'no-param-reassign': ['error', { props: false }],
  'object-shorthand': 'error',
};

export default [
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: BROWSER_GLOBALS,
    },
    rules: commonRules,
  },
  {
    files: ['src/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: NODE_GLOBALS,
    },
    rules: commonRules,
  },
];
