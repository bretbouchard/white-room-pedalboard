import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // Console and timers
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',

        // Fetch API
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        RequestInit: 'readonly',
        AbortSignal: 'readonly',
        AbortController: 'readonly',

        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        NodeJS: 'readonly',
        crypto: 'readonly',

        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        location: 'readonly',
        history: 'readonly',

        // Web APIs
        Blob: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',

        // Web Audio API
        AudioContext: 'readonly',
        OfflineAudioContext: 'readonly',
        AudioBuffer: 'readonly',
        AnalyserNode: 'readonly',
        GainNode: 'readonly',
        DynamicsCompressorNode: 'readonly',
        ConvolverNode: 'readonly',
        DelayNode: 'readonly',
        MediaStream: 'readonly',

        // Web Workers
        Worker: 'readonly',
        self: 'readonly',

        // Animation
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',

        // Events
        Event: 'readonly',
        MessageEvent: 'readonly',
        CloseEvent: 'readonly',

        // Performance
        performance: 'readonly',

        // Text encoding
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',

        // Test globals (for test files)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'prefer-const': 'warn',
      'no-mixed-spaces-and-tabs': 'warn',
      'no-empty': 'warn',
      'no-case-declarations': 'warn',
    },
  },
  {
    files: ['packages/*/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'prefer-const': 'error',
      'no-empty': 'error',
      'no-case-declarations': 'error',
      'no-mixed-spaces-and-tabs': 'error',
    },
  },
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'test-reports/**',
      'html/**',
      'dashboards/**',
      'analytics/**',
    ],
  },
];
