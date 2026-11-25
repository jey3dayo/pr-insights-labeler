const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const neverthrow = require('eslint-plugin-neverthrow');
const importX = require('eslint-plugin-import-x');

module.exports = tseslint.config(
  eslint.configs.recommended,

  ...tseslint.configs.recommended,

  {
    ignores: ['dist/**'],
  },

  prettierConfig,

  {
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
  },

  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.test.json'],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'simple-import-sort': simpleImportSort,
      neverthrow: neverthrow,
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [importX.createNodeResolver({ extensions: ['.ts', '.js', '.json'] })],
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',

      'import-x/no-cycle': ['warn', { maxDepth: 10 }],
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'warn',
      'import-x/no-duplicates': 'warn',

      'neverthrow/must-use-result': 'off',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'as',
          objectLiteralTypeAssertions: 'never',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': false,
          'ts-nocheck': false,
          'ts-check': false,
        },
      ],

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      'no-restricted-syntax': [
        'error',
        {
          selector: 'ClassDeclaration',
          message: 'クラス構文の使用は禁止されています。関数とオブジェクトを使用してください。',
        },
        {
          selector: 'ImportExpression',
          message: 'Dynamic import()の使用は禁止されています。静的importを使用してください。',
        },
      ],
    },
  },

  {
    files: ['src/complexity-analyzer.ts', 'src/errors/**/*.ts', '__tests__/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression',
          message: 'Dynamic import()の使用は禁止されています。静的importを使用してください。',
        },
      ],
    },
  },

  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-unused-vars': [
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
    files: ['**/*.test.ts', '**/*.spec.ts', '__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      'no-console': 'off',
      'import-x/no-cycle': 'off',
    },
  },

  {
    ignores: [
      'dist/**/*',
      'coverage/**/*',
      'node_modules/**/*',
      '.worktrees/**/*',
      '.vitest/**/*',
      '*.config.js',
      '*.config.ts',
      '*.config.cjs',
      '.ncurc.cjs',
      '.eslintrc.js',
      '.dependency-cruiser.js',
      'eslint.config.js',
      'scripts/**/*',
      'tmp/**/*',
      'src/types/i18n.d.ts',
      '__tests__/fixtures/**/*',
      '__tests__/__tests__/**/*',
    ],
  },
);
