/**
 * Default category configurations for PR Insights Labeler
 */

import type { CategoryConfig } from '../types/config.js';

/**
 * Default categories for PR classification
 */
export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    label: 'category/tests',
    patterns: ['__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
  },
  {
    label: 'category/ci-cd',
    patterns: [
      '.github/workflows/**',
      '.gitlab-ci.yml',
      '.circleci/**',
      'Jenkinsfile',
      '.travis.yml',
      'azure-pipelines.yml',
      '.buildkite/**',
    ],
  },
  {
    label: 'category/documentation',
    patterns: ['docs/**', '**/*.md'],
    exclude: ['.kiro/**', '.specify/**', 'spec/**', 'specs/**'],
  },
  {
    label: 'category/config',
    patterns: [
      '**/*.config.js',
      '**/*.config.ts',
      '**/*.config.mjs',
      '**/*.config.cjs',
      '**/tsconfig.json',
      '**/jsconfig.json',
      '**/.editorconfig',
      '**/.eslintrc*',
      '**/.prettierrc*',
      '**/.prettierignore',
      '**/prettier.config.*',
      '**/eslint.config.*',
      '**/vitest.config.*',
      '**/vite.config.*',
      '**/.markdownlint-cli2.jsonc',
      '**/.markdown-link-check.{json,jsonc}',
      '**/.dependency-cruiser.*',
      '**/.ncurc.*',
      '**/mise.toml',
      '**/action.y?(a)ml',
      '**/knip.{json,jsonc}',
      '**/configs/**/*.ts',
      '**/configs/**/*.js',
      '**/configs/**/*.mjs',
      '**/configs/**/*.cjs',
      '**/configs/**/*.json',
      '**/tsconfig.*.json',
    ],
  },
  {
    label: 'category/spec',
    patterns: ['.kiro/**', '.specify/**', 'spec/**', 'specs/**'],
  },
  {
    label: 'category/dependencies',
    patterns: [
      '**/package.json',
      '**/pnpm-lock.yaml',
      '**/yarn.lock',
      '**/package-lock.json',
      '**/go.mod',
      '**/go.sum',
      '**/requirements.txt',
      '**/Pipfile',
      '**/Pipfile.lock',
      '**/poetry.lock',
      '**/pyproject.toml',
      '**/Cargo.toml',
      '**/Cargo.lock',
      '**/Gemfile',
      '**/Gemfile.lock',
    ],
  },
  {
    label: 'category/feature',
    patterns: ['src/features/**', 'features/**', 'src/components/**'],
    exclude: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**'],
    display_name: {
      en: 'Feature',
      ja: '新機能',
    },
  },
  {
    label: 'category/infrastructure',
    patterns: [
      'Dockerfile*',
      'docker-compose*',
      'terraform/**',
      '.mise.toml',
      'mise.toml',
      '.tool-versions',
      'k8s/**',
      'kubernetes/**',
      'helm/**',
      'ansible/**',
    ],
    display_name: {
      en: 'Infrastructure',
      ja: 'インフラ',
    },
  },
  {
    label: 'category/security',
    patterns: [
      '**/auth*/**',
      '**/*auth*.ts',
      '**/*auth*.js',
      '**/*jwt*.ts',
      '**/*session*.ts',
      '**/*security*',
      '.env*',
      'secrets/**',
    ],
    display_name: {
      en: 'Security',
      ja: 'セキュリティ',
    },
  },
];
