import type { MinimatchOptions, NamespacePolicy } from '../types/directory-labeler.js';

export const DEFAULT_OPTIONS: Required<MinimatchOptions> = {
  dot: true,
  nocase: false,
  matchBase: false,
} as const;

export const DEFAULT_NAMESPACES: Required<NamespacePolicy> = {
  exclusive: ['size', 'area', 'type'],
  additive: ['scope', 'meta'],
} as const;

export const DEFAULT_EXCLUDES: readonly string[] = [
  '.vscode/**',
  '.idea/**',

  '.husky/**',
  '.git/**',

  'node_modules/**',

  '**/*.lock',
  '**/*.lock.yaml',
  '**/*.lock.json',
  '**/*.lock.hcl',

  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
  '**/bun.lockb',
  '**/composer.lock',
  '**/Gemfile.lock',
  '**/Cargo.lock',
  '**/poetry.lock',
  '**/Pipfile.lock',
  '**/*.lockfile',
  '**/pylock.toml',
  '**/pylock.+([!.]).toml',
  '**/gems.locked',
  '**/conda-lock.yml',
  '**/cabal.project.freeze',
  '**/maven_install.json',

  '**/.pnp.*',
  '**/.yarn/cache/**',
  '**/.yarn/unplugged/**',
  '**/.yarn/install-state.gz',
  '**/.yarn/releases/**',
  '**/.yarn/plugins/**',
  '**/.yarn/sdks/**',

  '**/.DS_Store',
  '**/Thumbs.db',

  '**/.dependency-cruiser.js',
  '**/.dockerignore',
  '**/.coderabbit.yaml',
  '**/.github/actionlint.yaml',
] as const;

export const DEFAULT_LABEL_COLOR = 'cccccc' as const;

export const DEFAULT_LABEL_DESCRIPTION = '' as const;
