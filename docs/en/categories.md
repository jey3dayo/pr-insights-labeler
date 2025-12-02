# 🏷️ Category Labels

**Last Updated**: 2025-11-30
**Audience**: Developers, Maintainers
**Tags**: `category/documentation`, `audience/developer`, `audience/maintainer`

**Languages**: English | 日本語（準備中）

Category labels automatically classify Pull Requests based on the types of files changed. This helps reviewers quickly understand the nature of changes and apply appropriate review strategies.

## Overview

PR Insights Labeler applies category labels by analyzing changed file paths against predefined patterns. Multiple categories can be applied to a single PR if it contains changes spanning different areas (additive labeling policy).

## Default Categories

PR Insights Labeler provides 9 default categories:

| Label | Description | Key Patterns | Display Name (ja) |
| ------------------------- | ----------------------------- | ------------------------------------------ | ----------------- |
| `category/tests` | Test files and test utilities | `**/*.test.ts`, `__tests__/**` | テスト |
| `category/ci-cd` | CI/CD workflow files | `.github/workflows/**` | CI/CD |
| `category/documentation` | Documentation files | `docs/**`, `**/*.md` | ドキュメント |
| `category/config` | Configuration files | `*.config.js`, `tsconfig.json` | 設定 |
| `category/spec` | Specification documents | `.kiro/**`, `.specify/**` | 仕様 |
| `category/dependencies` | Dependency management files | `package.json`, lock files | 依存関係 |
| `category/feature` | New feature implementations | `src/features/**`, `src/components/**` | 新機能 |
| `category/infrastructure` | Infrastructure and DevOps | `.github/**`, `Dockerfile`, `terraform/**` | インフラ |
| `category/security` | Security-related changes | `**/auth*/**`, `.env*`, `secrets/**` | セキュリティ |

## Category Details

### category/tests

**Purpose**: Identifies test file changes for quick test coverage assessment.

**Detection Targets**:

- Unit test files
- Integration test files
- Test utility files
- Test directories

**Patterns**:

- `__tests__/**` - Test directories
- `**/*.test.ts` - TypeScript test files
- `**/*.test.tsx` - React component test files

**Use Cases**:

- Verifying test coverage improvements
- Reviewing test quality
- Ensuring tests accompany feature changes

**Example Matches**:

- `src/__tests__/utils.test.ts`
- `src/components/Button.test.tsx`
- `__tests__/integration/api.test.ts`

### category/ci-cd

**Purpose**: Flags changes to CI/CD workflows that affect build and deployment processes.

**Detection Targets**:

- GitHub Actions workflows
- CI configuration files
- Deployment scripts

**Patterns**:

- `.github/workflows/**` - GitHub Actions workflow files

**Use Cases**:

- Reviewing workflow changes carefully
- Ensuring deployment safety
- Coordinating with DevOps team

**Example Matches**:

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `.github/workflows/deploy.yml`

### category/documentation

**Purpose**: Identifies documentation updates for content review.

**Detection Targets**:

- Documentation files
- README files
- Markdown files (excluding specifications)

**Patterns**:

- `docs/**` - Documentation directory
- `**/*.md` - All markdown files

**Exclude Patterns**:

- `.kiro/**` - Specification documents
- `.specify/**` - Specification documents
- `spec/**` - Specification directories
- `specs/**` - Specification directories

**Use Cases**:

- Ensuring documentation accuracy
- Reviewing technical writing quality
- Maintaining documentation consistency

**Example Matches**:

- `docs/en/configuration.md`
- `README.md`
- `CONTRIBUTING.md`

### category/config

**Purpose**: Highlights configuration file changes that may affect project behavior.

**Detection Targets**:

- Build configuration files
- Tool configuration files
- Linter/formatter settings
- TypeScript configuration

**Patterns**:

- `**/*.config.js`, `**/*.config.ts` - Configuration files
- `**/tsconfig.json`, `**/jsconfig.json` - TypeScript/JavaScript configs
- `**/.eslintrc*`, `**/.prettierrc*` - Linter/formatter configs
- `**/vitest.config.*`, `**/vite.config.*` - Test/build configs
- `**/mise.toml` - Tool version manager config
- `**/action.y?(a)ml` - GitHub Action metadata
- `**/configs/**/*.{ts,js,json}` - Config directories

**Use Cases**:

- Reviewing tool configuration changes
- Verifying build settings
- Ensuring consistent code style

**Example Matches**:

- `vite.config.ts`
- `tsconfig.json`
- `.eslintrc.json`
- `src/configs/default-config.ts`

### category/spec

**Purpose**: Identifies specification document changes for requirements tracking.

**Detection Targets**:

- Specification documents
- Design documents
- Requirement documents

**Patterns**:

- `.kiro/**` - Kiro-style specification files
- `.specify/**` - Specify-style specification files
- `spec/**`, `specs/**` - Specification directories

**Use Cases**:

- Tracking requirement changes
- Reviewing design decisions
- Coordinating with product team

**Example Matches**:

- `.kiro/specs/new-feature/requirements.md`
- `.specify/architecture.md`
- `specs/api-design.yaml`

### category/dependencies

**Purpose**: Flags dependency changes for security and compatibility review.

**Detection Targets**:

- Package manifest files
- Lock files
- Dependency management files

**Patterns**:

- `**/package.json` - npm package manifest
- `**/pnpm-lock.yaml` - pnpm lock file
- `**/yarn.lock`, `**/package-lock.json` - Other lock files
- `**/go.mod`, `**/go.sum` - Go modules
- `**/requirements.txt`, `**/Pipfile`, `**/poetry.lock` - Python dependencies
- `**/Cargo.toml`, `**/Cargo.lock` - Rust dependencies
- `**/Gemfile`, `**/Gemfile.lock` - Ruby dependencies

**Use Cases**:

- Security vulnerability assessment
- Version compatibility check
- License compliance review

**Example Matches**:

- `package.json`
- `pnpm-lock.yaml`
- `go.mod`

### category/feature

**Purpose**: Identifies new feature implementations for feature review.

**Detection Targets**:

- Feature modules
- Component implementations
- Feature-specific utilities

**Patterns**:

- `src/features/**` - Feature modules
- `features/**` - Feature directories
- `src/components/**` - Component implementations

**Exclude Patterns**:

- `**/*.test.*` - Test files (classified as `category/tests`)
- `**/*.spec.*` - Spec files (classified as `category/tests`)
- `**/__tests__/**` - Test directories (classified as `category/tests`)

**Use Cases**:

- Reviewing new functionality
- Assessing feature impact
- Coordinating feature releases

**Example Matches**:

- `src/features/authentication/login.ts`
- `src/components/UserProfile.tsx`
- `features/search/SearchBar.tsx`

**Note**: Test files within feature/component directories are excluded and classified as `category/tests` instead.

### category/infrastructure

**Purpose**: Highlights infrastructure and DevOps changes that affect deployment and operations.

**Detection Targets**:

- GitHub configuration files
- Container configuration files
- Infrastructure as Code files
- Tool version management files
- Orchestration configuration files

**Patterns**:

- `.github/**` - GitHub configuration (issues, PR templates, etc.)
- `Dockerfile*` - Docker container definitions
- `docker-compose*` - Docker Compose files
- `terraform/**` - Terraform IaC files
- `.mise.toml`, `mise.toml` - Mise tool version manager
- `.tool-versions` - asdf tool version manager
- `k8s/**`, `kubernetes/**` - Kubernetes manifests
- `helm/**` - Helm charts
- `ansible/**` - Ansible playbooks

**Use Cases**:

- Reviewing infrastructure changes
- Ensuring deployment safety
- Coordinating with infrastructure team

**Example Matches**:

- `.github/ISSUE_TEMPLATE/bug_report.md`
- `Dockerfile`
- `terraform/main.tf`
- `k8s/deployment.yaml`
- `.mise.toml`

**Note**: `.github/workflows/**` also matches `category/ci-cd` and will receive both labels.

### category/security

**Purpose**: Flags security-related changes for enhanced security review.

**Detection Targets**:

- Authentication implementations
- Authorization logic
- Session management
- JWT handling
- Environment variable files
- Secrets management

**Patterns**:

- `**/auth*/**` - Authentication directories
- `**/*auth*.ts`, `**/*auth*.js` - Authentication files
- `**/*jwt*.ts` - JWT token handling
- `**/*session*.ts` - Session management
- `**/*security*` - Security-related files
- `.env*` - Environment variable files
- `secrets/**` - Secrets directory

**Use Cases**:

- Enhanced security review
- Vulnerability assessment
- Compliance verification

**Example Matches**:

- `src/lib/auth/middleware.ts`
- `src/utils/jwt.ts`
- `.env.local`
- `secrets/api-keys.json`

**Security Note**: Security-related changes should receive thorough review regardless of PR size. Consider requesting security team review for significant changes.

## Custom Categories

You can define custom categories in your `.github/pr-labeler.yml` configuration file:

```yaml
categories:
  - label: 'category/performance'
    patterns:
      - 'src/performance/**'
      - '**/*benchmark*'
    display_name:
      en: 'Performance'
      ja: 'パフォーマンス'
```

**Configuration Properties**:

- `label` (required): The label name (must follow `category/*` format)
- `patterns` (required): Array of glob patterns to match files
- `exclude` (optional): Array of glob patterns to exclude files
- `display_name` (optional): Multilingual display names

**Pattern Syntax**:

- Use [minimatch](https://github.com/isaacs/minimatch) glob patterns
- `**` matches any number of directories
- `*` matches any characters within a directory level
- `?` matches a single character

## Multiple Category Application

PR Insights Labeler uses an **additive labeling policy**. If a PR contains changes matching multiple categories, all applicable category labels are applied.

**Example**:

A PR with these changes:

- `src/features/authentication/login.ts` → `category/feature`
- `src/features/authentication/login.test.ts` → `category/tests`
- `README.md` → `category/documentation`

Will receive all three labels: `category/feature`, `category/tests`, and `category/documentation`.

**Benefits**:

- Comprehensive classification of PR scope
- Multiple review perspectives
- Better change tracking and analytics

## See Also

- [Configuration Guide](configuration.md) - Detailed configuration options
- [Advanced Usage](advanced-usage.md) - Custom category examples
- [README](../README.md) - Project overview
