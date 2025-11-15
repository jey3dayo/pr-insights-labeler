const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const neverthrow = require('eslint-plugin-neverthrow');
const { fixupPluginRules } = require('@eslint/compat');
const importPlugin = require('eslint-plugin-import');

module.exports = tseslint.config(
  // ESLint推奨設定
  eslint.configs.recommended,

  // TypeScript ESLint推奨設定
  ...tseslint.configs.recommended,

  // Ignore generated artifacts
  {
    ignores: ['dist/**'],
  },

  // Prettier設定（フォーマット競合を無効化）
  prettierConfig,

  // グローバル設定
  {
    languageOptions: {
      globals: {
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        // Test globals
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

  // TypeScriptファイル用設定
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
      import: fixupPluginRules(importPlugin),
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.json', './tsconfig.test.json'],
        },
        node: true,
      },
    },
    rules: {
      // Import/Export sorting
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',

      // Import plugin rules
      'import/no-cycle': ['warn', { maxDepth: 10 }],
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'warn',
      'import/no-duplicates': 'warn',

      // Neverthrow - allow flexible Result handling patterns
      // OFF: Allows both imperative (if result.isErr()) and functional (.match()) patterns
      // This is more readable for GitHub Actions code with complex error handling
      'neverthrow/must-use-result': 'off',

      // TypeScript specific rules
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

      // 一般的なコード品質ルール
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      // クラス構文と Dynamic Import の禁止
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

  // クラス構文を許可する例外ファイル
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

  // JavaScriptファイル用設定
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

  // テストファイル用設定
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      'no-console': 'off',
      'import/no-cycle': 'off',
    },
  },

  // 無視するファイル
  {
    ignores: [
      'dist/**/*',
      'coverage/**/*',
      'node_modules/**/*',
      '.vitest/**/*',
      '*.config.js',
      '*.config.ts',
      '*.config.cjs',
      '.ncurc.cjs',
      '.eslintrc.js',
      '.dependency-cruiser.js', // dependency-cruiser config (CommonJS)
      'eslint.config.js',
      'scripts/**/*', // Build scripts
      'src/types/i18n.d.ts', // Auto-generated i18n types
      '__tests__/fixtures/**/*', // Test fixtures with intentional syntax errors
      '__tests__/__tests__/**/*', // Duplicate test fixtures directory
    ],
  },
);
