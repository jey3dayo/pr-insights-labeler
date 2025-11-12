# Advanced Usage Guide

Real-world examples and advanced configurations for PR Insights Labeler.

## Table of Contents

- [Fork PR Handling](#fork-pr-handling)
- [Conditional Execution](#conditional-execution)
- [Strict Mode](#strict-mode)
- [Summary Only Mode](#summary-only-mode)
- [Selective Label Enabling](#selective-label-enabling)
- [PR Insights Labeler YAML Configuration](#pr-labeler-yaml-configuration)
- [Directory-Based Labeling](#directory-based-labeling)
- [Multi-language Support](#multi-language-support)

## Fork PR Handling

When handling PRs from forks, permissions are restricted. Use the `pull_request_target` event for proper access.

### Security Considerations

⚠️ **Important**: `pull_request_target` runs in the context of the base repository, granting write permissions. Only use this event when necessary and ensure you understand the security implications.

- **Risk**: Malicious code in fork PRs could access secrets
- **Mitigation**: This action only reads files and applies labels; it does not execute code from PRs
- **Best Practice**: Review fork PRs before approving workflows

### Example Configuration

```yaml
name: PR Check (Fork-friendly)

on:
  pull_request_target:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest

    permissions:
      pull-requests: write  # Label management
      issues: write         # Comment posting
      contents: read        # File reading

    steps:
      - uses: actions/checkout@v4
        with:
          # IMPORTANT: Check out the PR's code, not the base branch
          ref: ${{ github.event.pull_request.head.sha }}

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### When to Use

- ✅ Open source projects accepting external contributions
- ✅ Public repositories with fork PRs
- ❌ Private repositories (use `pull_request` event instead)

## Conditional Execution

Run PR Insights Labeler only when specific files or paths change.

### Skip Specific Files

```yaml
name: PR Check

on:
  pull_request:
    # Run only for these paths
    paths:
      - 'src/**'
      - '!src/**/*.test.ts'  # Exclude test files

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # Add additional patterns to exclude
          additional_exclude_patterns: |
            **/*.generated.ts
            **/*.min.js
```

### Skip by Label

Skip PR Insights Labeler if specific labels are present:

```yaml
name: PR Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest
    # Skip if PR has "skip-check" label
    if: "!contains(github.event.pull_request.labels.*.name, 'skip-check')"

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Skip by Branch

Skip specific branches:

```yaml
name: PR Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest
    # Skip for release branches
    if: "!startsWith(github.head_ref, 'release/')"

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Strict Mode

Fail the workflow if violations are detected. Useful for enforcing code quality standards.

### Example: Fail on Large Files

```yaml
name: PR Check (Strict)

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest

    permissions:
      pull-requests: write
      issues: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          file_size_limit: "100KB"
          file_lines_limit: "300"
          pr_additions_limit: "500"
          fail_on_large_files: "true"       # Fail if files exceed limits
          fail_on_too_many_files: "true"    # Fail if too many files
          fail_on_pr_size: "large"          # Fail if PR size >= "large"
          size_enabled: "true"              # Required for fail_on_pr_size
          comment_on_pr: "always"           # Always comment on violations
```

### Strict Mode Use Cases

- ✅ Mission-critical codebases requiring review for large changes
- ✅ Enforcing code style and complexity standards
- ✅ Preventing accidental commits of large files
- ❌ Open source projects (may discourage contributions)

## Summary Only Mode

Use GitHub Actions Summary for visibility without applying labels or comments.

### Example: Read-Only Analysis

```yaml
name: PR Analysis (Summary Only)

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  analyze:
    runs-on: ubuntu-latest

    permissions:
      contents: read  # Only reading required

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}

          # Disable all labels
          size_enabled: "false"
          complexity_enabled: "false"
          category_enabled: "false"
          risk_enabled: "false"

          # Disable comments
          comment_on_pr: "never"

          # Only output to Summary
          enable_summary: "true"
```

### When to Use

- ✅ Repositories without `pull-requests: write` permission
- ✅ Fork PRs where label application is not possible
- ✅ Internal analytics without affecting PR workflow

## Selective Label Enabling

Control which label types are applied individually.

### Default: All Labels Enabled

By default, all label types (size, complexity, category, risk) are enabled:

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    # All label types enabled by default
```

### Disable Specific Label Types

```yaml
# Example 1: Disable complexity labels only
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    complexity_enabled: "false"
    # size, category, risk labels remain enabled
```

```yaml
# Example 2: Only size and risk labels
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    size_enabled: "true"
    complexity_enabled: "false"
    category_enabled: "false"
    risk_enabled: "true"
```

### Custom Thresholds with Selective Enabling

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

    # Size labels: Custom thresholds
    size_enabled: "true"
    size_thresholds: '{"small": 50, "medium": 200, "large": 500, "xlarge": 1500}'

    # Complexity labels: Custom thresholds (enabled explicitly)
    complexity_enabled: "true"
    complexity_thresholds: '{"medium": 15, "high": 30}'

    # Category labels: Disabled
    category_enabled: "false"

    # Risk labels: Enabled (default)
    risk_enabled: "true"
```

### Naming Convention

- `*_enabled`: Enable/disable each label type
- `*_thresholds`: Customize thresholds for size and complexity labels

## PR Insights Labeler YAML Configuration

Customize PR Insights Labeler behavior by creating `.github/pr-labeler.yml`.

### Complete Example

```yaml
# .github/pr-labeler.yml

# Language setting (optional)
language: ja  # 'en' or 'ja' (default: 'en')

# Size label settings
size:
  thresholds:
    small: 50      # Small PR threshold (default: 200)
    medium: 200    # Medium PR threshold (default: 500)
    large: 500     # Large PR threshold (default: 1000)
    xlarge: 1500   # Extra large PR threshold (default: 3000)

# Category label settings

See the [Category Guide](categories.md) for detailed information about default categories and custom category examples.

categories:
  # Built-in categories (customizable)
  - label: "category/tests"
    patterns:
      - "__tests__/**"
      - "**/*.test.ts"
      - "**/*.test.tsx"
      - "**/*.spec.ts"
    display_name:
      en: "Test Files"
      ja: "テストファイル"

  - label: "category/ci-cd"
    patterns:
      - ".github/workflows/**"
      - ".github/actions/**"
    display_name:
      en: "CI/CD"
      ja: "CI/CD"

  - label: "category/documentation"
    patterns:
      - "docs/**"
      - "**/*.md"
      - "**/*.mdx"
    display_name:
      en: "Documentation"
      ja: "ドキュメント"

  - label: "category/config"
    patterns:
      - "**/tsconfig*.json"
      - "**/eslint.config.*"
      - "**/.prettierrc*"
    display_name:
      en: "Configuration"
      ja: "設定ファイル"

  # Custom categories
  - label: "category/frontend"
    patterns:
      - "src/components/**"
      - "src/pages/**"
      - "**/*.tsx"
    display_name:
      en: "Frontend"
      ja: "フロントエンド"

  - label: "category/backend"
    patterns:
      - "src/api/**"
      - "src/services/**"
      - "src/controllers/**"
    display_name:
      en: "Backend"
      ja: "バックエンド"

  - label: "category/database"
    patterns:
      - "src/models/**"
      - "src/migrations/**"
      - "**/*.sql"
    display_name:
      en: "Database"
      ja: "データベース"

# Risk assessment settings
risk:
  high_if_no_tests_for_core: true  # High risk if core changes without tests
  core_paths:
    - "src/**"
    - "lib/**"
  config_files:
    - ".github/workflows/**"
    - "package.json"
    - "tsconfig.json"
    - "eslint.config.js"

# Label operation settings
labels:
  create_missing: true  # Auto-create missing labels
  namespace_policies:
    "size/*": replace      # Size labels are exclusive (only one size label)
    "category/*": additive # Category labels are additive (multiple allowed)
    "risk/*": replace      # Risk labels are exclusive

# Runtime settings
runtime:
  fail_on_error: false  # Continue workflow even if labeling fails
```

### Configuration Without File

PR Insights Labeler works immediately with default settings even without `.github/pr-labeler.yml`.

### Display Name Priority

Label display names are determined by the following priority:

1. `display_name` in `.github/pr-labeler.yml` (custom translation)
2. Built-in translation resources (`labels` namespace)
3. Label name as-is

**Note:** GitHub API calls always use the English label name (`label` field). `display_name` is used for display only in Summary/Comments.

## Directory-Based Labeling

Automatically apply labels based on changed file paths using glob patterns.

### Feature Overview

- **Path-Based Mapping**: Automatically determine labels from directory patterns (glob)
- **Priority Control**: Flexible control via priority, longest match, definition order
- **Namespace Policy**: Conflict resolution with exclusive (replace) / additive (add)
- **Safe Design**: Disabled by default, requires explicit enabling
- **Auto-Create Labels**: Option to automatically create missing labels

### Enabling the Feature

```yaml
name: PR Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest

    permissions:
      pull-requests: write
      issues: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          enable_directory_labeling: true  # Enable feature
```

### Configuration File

Create `.github/directory-labeler.yml`:

```yaml
version: 1

rules:
  # Frontend changes
  - label: 'area:frontend'
    include:
      - 'src/components/**'
      - 'src/pages/**'
      - '**/*.tsx'
    exclude:
      - '**/__tests__/**'
      - '**/*.test.tsx'
    priority: 20

  # Backend changes
  - label: 'area:backend'
    include:
      - 'src/api/**'
      - 'src/services/**'
      - 'src/controllers/**'
    priority: 20

  # Database changes
  - label: 'area:database'
    include:
      - 'src/models/**'
      - 'src/migrations/**'
      - '**/*.sql'
    priority: 30  # Higher priority

  # Documentation changes
  - label: 'scope:documentation'
    include:
      - 'docs/**'
      - '**/*.md'
    priority: 10

# Namespace policies
namespaces:
  exclusive: ['area']  # Only one 'area:*' label
  additive: ['scope']  # Multiple 'scope:*' labels allowed
```

### Advanced Configuration

```yaml
version: 1

rules:
  # High-priority critical files
  - label: 'priority:critical'
    include:
      - 'src/core/**'
      - 'src/auth/**'
    priority: 100  # Highest priority

  # Language-specific labels
  - label: 'lang:typescript'
    include:
      - '**/*.ts'
      - '**/*.tsx'
    exclude:
      - '**/*.d.ts'  # Exclude type definitions

  - label: 'lang:python'
    include:
      - '**/*.py'

  # Multiple conditions with exclusions
  - label: 'scope:testing'
    include:
      - '__tests__/**'
      - '**/*.test.*'
      - '**/*.spec.*'
    exclude:
      - '**/fixtures/**'  # Exclude test fixtures

namespaces:
  exclusive: ['area', 'priority']
  additive: ['lang', 'scope']
```

### Priority and Matching Rules

1. **Priority** (higher number = higher priority)
2. **Longest Match** (more specific paths win)
3. **Definition Order** (first in file wins if tied)

**Example:**

```yaml
rules:
  - label: 'area:frontend'  # Priority 20
    include: ['src/**']
    priority: 20

  - label: 'area:backend'   # Priority 20, but more specific
    include: ['src/api/**']
    priority: 20
```

For `src/api/users.ts`:

- Both rules match
- `area:backend` wins (longest match)

### See Also

- [Configuration Guide - Directory-Based Labeling](configuration.md#directory-based-labeling)
- [`.github/directory-labeler.yml.example`](../.github/directory-labeler.yml.example)

## Multi-language Support

PR Insights Labeler supports English and Japanese output for GitHub Actions Summary, error messages, logs, and PR comments.

### Language Configuration Methods

#### Method 1: Environment Variable

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
  env:
    LANGUAGE: ja  # or 'en' (default: 'en')
```

#### Method 2: Input Parameter

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    language: ja  # or 'en' (default: 'en')
```

#### Method 3: Configuration File

Create `.github/pr-labeler.yml`:

```yaml
# Language setting (optional)
language: ja  # 'en' or 'ja' (default: 'en')

# Category labels with multilingual display names
categories:
  - label: 'category/tests'
    patterns:
      - '__tests__/**'
      - '**/*.test.ts'
    display_name:
      en: 'Test Files'
      ja: 'テストファイル'

  - label: 'category/documentation'
    patterns:
      - 'docs/**'
      - '**/*.md'
    display_name:
      en: 'Documentation'
      ja: 'ドキュメント'
```

### Language Decision Priority

1. `LANGUAGE` environment variable
2. `LANG` environment variable
3. `language` field in `pr-labeler.yml`
4. Default: English (`en`)

### Display Name Priority

Label display names are determined by:

1. `display_name` in `.github/pr-labeler.yml` (custom translation)
2. Built-in translation resources (`labels` namespace)
3. Label name as-is

**Note:** GitHub API calls always use the English label name (`label` field). `display_name` is used for display only.

### Supported Languages

- **English**: `en`, `en-US`, `en-GB`
- **Japanese**: `ja`, `ja-JP`

### What's Translated

- ✅ GitHub Actions Summary output
- ✅ Error messages and warnings
- ✅ PR comments (if enabled)
- ✅ Log messages
- ✅ Label display names (in Summary/Comments)
- ❌ Label names in GitHub API (always English)

---

## Related Documentation

- [Configuration Guide](configuration.md) - Complete input parameters reference
- [Troubleshooting Guide](troubleshooting.md) - Common issues and solutions
- [Main README](../README.md) - Quick start and overview
