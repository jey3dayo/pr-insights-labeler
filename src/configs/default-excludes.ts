/**
 * Default exclusion patterns for file analysis
 * Common files that should be ignored across all features
 */

/**
 * Default exclusion patterns for common files that should be ignored
 * Includes: lock files, dependencies, build outputs, generated files, etc.
 */
export const DEFAULT_EXCLUDE_PATTERNS: string[] = [
  // Lock files
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'Gemfile.lock',
  'Cargo.lock',
  'composer.lock',
  'poetry.lock',
  'Pipfile.lock',
  'bun.lockb',
  'deno.lock',
  '*.lock',
  // Lock files with a compound extension (`<name>.lock.<ext>`),
  // which `*.lock` cannot match
  '*.lock.yaml', // apm, Helm-style
  '*.lock.json', // NuGet packages.lock.json
  '*.lock.hcl', // Terraform provider lock
  'npm-shrinkwrap.json',
  'go.sum',
  'Package.resolved', // Swift Package Manager
  'Cartfile.resolved', // Carthage
  // Gradle dependency locking: per-project `gradle.lockfile`,
  // `buildscript-gradle.lockfile`, and any custom `lockFile` location
  '*.lockfile',
  'pylock.toml', // PEP 751
  'pylock.+([!.]).toml', // PEP 751 named variants (a single non-dot segment)
  'gems.locked', // Bundler when the Gemfile is named `gems.rb`
  'conda-lock.yml',
  'cabal.project.freeze', // Haskell Cabal
  'maven_install.json', // Bazel rules_jvm_external

  // Yarn Berry generated artifacts that are committed by design.
  // `.yarn/patches`, `.yarn/versions` and `.yarnrc.yml` are hand-authored
  // and stay in scope.
  '.pnp.*',
  '**/.yarn/cache/**',
  '**/.yarn/unplugged/**',
  '**/.yarn/install-state.gz',
  '**/.yarn/releases/**',
  '**/.yarn/plugins/**',
  '**/.yarn/sdks/**',

  // Dependencies
  '**/node_modules/**',
  '**/vendor/**',
  '.bundle/**',
  '**/bower_components/**',

  // Build outputs
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/output/**',
  '**/target/**',
  '.next/**',
  '_next/**',
  '.nuxt/**',
  '.output/**',

  // Minified and bundled files
  '*.min.js',
  '*.min.css',
  '*.bundle.js',
  '*.bundle.css',
  '*.chunk.js',
  '*.chunk.css',

  // Source maps
  '*.map',
  '*.js.map',
  '*.css.map',

  // Test coverage
  'coverage/**',
  '.nyc_output/**',
  'reports/**',
  'test-results/**',

  // Test files
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.test.js',
  '**/*.test.jsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.spec.js',
  '**/*.spec.jsx',
  '**/__snapshots__/**',
  '**/*.snap',

  // Logs
  '*.log',
  'logs/**',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  'lerna-debug.log*',

  // IDE and editor files
  '.vscode/**',
  '.idea/**',
  '*.swp',
  '*.swo',
  '*.swn',
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',

  // Git
  '.git/**',
  '.gitignore',
  '.gitattributes',

  // Spec-driven metadata
  '.claude/**',
  '.codex/**',
  '.kiro/**',
  '.agents/**',

  // Documentation
  'docs/**',
  'documentation/**',
  'CHANGELOG.md',
  'TODO.md',
  'todo.txt',
  'done.txt',

  // Generated files
  '*.generated.*',
  '*.gen.ts',
  '*.gen.js',
  '*.pb.go',
  '*.pb.js',
  '*.pb.ts',
  '*_pb2.py',
  '*.g.dart',

  // Cache directories
  '.cache/**',
  '.parcel-cache/**',
  '.turbo/**',
  '.webpack-cache/**',
  '.eslintcache',
  '.stylelintcache',
  '.prettiercache',

  // Temporary files
  '*.tmp',
  '*.temp',
  'tmp/**',
  'temp/**',
  '.tmp/**',
  '.temp/**',

  // Environment files (often contain secrets)
  '.env',
  '.env.*',
  // Note: .env.example and .env.template are intentionally not excluded
  // as they are typically safe template files

  // Database files
  '*.sqlite',
  '*.sqlite3',
  '*.db',
  '*.db-journal',

  // Binary and media files
  '*.exe',
  '*.dll',
  '*.so',
  '*.dylib',
  '*.pyc',
  '*.pyo',
  '*.wasm',
];
