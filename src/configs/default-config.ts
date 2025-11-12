/**
 * Default configuration for PR Insights Labeler
 */

import type { AnalysisOptions, LabelerConfig } from '../types/config.js';
import { DEFAULT_CATEGORIES } from './categories.js';
import { DEFAULT_EXCLUDE_PATTERNS } from './default-excludes.js';

// Re-export for backward compatibility
export { DEFAULT_EXCLUDE_PATTERNS };

/**
 * Default analysis options for complexity calculation
 */
export const DEFAULT_ANALYSIS_OPTIONS: Required<AnalysisOptions> = {
  concurrency: 8,
  timeout: 60,
  fileTimeout: 5,
  maxFileSize: 1024 * 1024, // 1MB
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  exclude: [
    '**/dist/**',
    '**/build/**',
    '**/node_modules/**',
    '**/vendor/**',
    '**/__tests__/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.test.js',
    '**/*.test.jsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.spec.js',
    '**/*.spec.jsx',
    '**/*.generated.ts',
    '**/*.generated.js',
    '**/__generated__/**',
  ],
};

/**
 * Default labeler configuration
 */
export const DEFAULT_LABELER_CONFIG: LabelerConfig = {
  size: {
    enabled: true, // サイズラベルはデフォルトで有効
    thresholds: {
      small: 200,
      medium: 500,
      large: 1000,
      xlarge: 3000,
    },
  },
  complexity: {
    enabled: true,
    metric: 'cyclomatic',
    thresholds: {
      medium: 10,
      high: 20,
    },
    extensions: DEFAULT_ANALYSIS_OPTIONS.extensions,
    exclude: DEFAULT_ANALYSIS_OPTIONS.exclude,
  },
  categoryLabeling: {
    enabled: true, // カテゴリラベルはデフォルトで有効
  },
  categories: DEFAULT_CATEGORIES,
  risk: {
    enabled: true, // リスクラベルはデフォルトで有効
    high_if_no_tests_for_core: true,
    core_paths: ['src/**'],
    config_files: ['.github/workflows/**', 'package.json', 'tsconfig.json'],
    use_ci_status: true,
  },
  exclude: {
    additional: [],
  },
  labels: {
    create_missing: true,
    namespace_policies: {
      'size/*': 'replace',
      'category/*': 'additive',
      'complexity/*': 'replace',
      'risk/*': 'replace',
    },
  },
  runtime: {
    fail_on_error: false,
    dry_run: false,
  },
};
