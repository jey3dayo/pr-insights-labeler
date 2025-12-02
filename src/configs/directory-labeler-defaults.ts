/**
 * Default configuration for Directory-Based Labeler
 * Contains default options, namespace policies, and exclusion patterns
 */

import type { MinimatchOptions, NamespacePolicy } from '../types/directory-labeler.js';

/**
 * Default minimatch options
 */
export const DEFAULT_OPTIONS: Required<MinimatchOptions> = {
  dot: true,
  nocase: false,
  matchBase: false,
} as const;

/**
 * Default namespace policies
 */
export const DEFAULT_NAMESPACES: Required<NamespacePolicy> = {
  exclusive: ['size', 'area', 'type'],
  additive: ['scope', 'meta'],
} as const;

/**
 * Default exclusion patterns for Directory-Based Labeler
 *
 * These patterns are applied at the Pattern Matcher level and
 * combined with user-defined exclusion patterns using logical OR.
 */
export const DEFAULT_EXCLUDES: readonly string[] = [
  // IDE and Editor directories
  '.vscode/**',
  '.idea/**',

  // Git hooks and version control
  '.husky/**',
  '.git/**',

  // Dependencies
  'node_modules/**',

  // Lock files (generic pattern)
  '**/*.lock',

  // Package manager lock files
  '**/package-lock.json', // npm
  '**/pnpm-lock.yaml', // pnpm
  '**/yarn.lock', // Yarn
  '**/composer.lock', // PHP Composer
  '**/Gemfile.lock', // Ruby Bundler
  '**/Cargo.lock', // Rust
  '**/poetry.lock', // Python Poetry
  '**/Pipfile.lock', // Python Pipenv

  // OS-specific files
  '**/.DS_Store', // macOS
  '**/Thumbs.db', // Windows

  // Development tool configuration files
  '**/.dependency-cruiser.js', // Dependency cruiser
  '**/.dockerignore', // Docker
  '**/.coderabbit.yaml', // CodeRabbit
  '**/.github/actionlint.yaml', // actionlint
] as const;

/**
 * Default label color for auto-created labels
 * Fixed value (cannot be customized)
 */
export const DEFAULT_LABEL_COLOR = 'cccccc' as const;

/**
 * Default label description for auto-created labels
 * Fixed value (cannot be customized)
 */
export const DEFAULT_LABEL_DESCRIPTION = '' as const;
