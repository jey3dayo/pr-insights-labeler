# Configuration Guide

Complete reference for all input parameters, output variables, and configuration options for PR Insights Labeler.

## Table of Contents

- [Input Parameters](#input-parameters)
  - [Basic Limits](#basic-limits)
  - [Label Settings](#label-settings)
  - [Selective Label Enabling](#selective-label-enabling)
  - [Action Settings](#action-settings)
  - [Exclusion Settings](#exclusion-settings)
  - [Directory-Based Labeling](#directory-based-labeling)
  - [Multi-language Support](#multi-language-support)
- [Label Thresholds Defaults](#label-thresholds-defaults)
- [GitHub Actions Summary Output](#github-actions-summary-output)
- [Output Variables](#output-variables)
- [Default Exclude Patterns](#default-exclude-patterns)
- [YAML Config File](#yaml-config-file)

## Input Parameters

### Basic Limits

| Parameter | Required | Default | Description |
| -------------------- | -------- | ------- | --------------------------------------------------------------------- |
| `github_token` | ✅ | - | GitHub token for API access (`${{ secrets.GITHUB_TOKEN }}`) |
| `file_size_limit` | ❌ | `100KB` | Maximum file size (e.g., `100KB`, `1.5MB`, `500000`) |
| `file_lines_limit` | ❌ | `500` | Maximum lines per file (current file total lines, not diff additions) |
| `pr_additions_limit` | ❌ | `5000` | Maximum added lines for entire PR (diff-based) |
| `pr_files_limit` | ❌ | `50` | Maximum number of files in PR (excluding removed files) |

**Examples:**

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    file_size_limit: "500KB"      # 500 kilobytes
    file_lines_limit: "1000"      # 1000 lines
    pr_additions_limit: "2000"    # 2000 added lines
    pr_files_limit: "30"          # 30 files maximum
```

### Label Settings

| Parameter | Required | Default | Description |
| ------------------------- | -------- | ------------------------ | ------------------------------------------------------ |
| `auto_remove_labels` | ❌ | `true` | Remove labels when limits are no longer exceeded |
| `large_files_label` | ❌ | `auto/large-files` | Label for files exceeding size or line limits |
| `too_many_files_label` | ❌ | `auto/too-many-files` | Label for PRs with too many files |
| `too_many_lines_label` | ❌ | `auto/too-many-lines` | Label for files exceeding line count limits |
| `excessive_changes_label` | ❌ | `auto/excessive-changes` | Label for PRs with excessive changes (total additions) |

**Examples:**

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    auto_remove_labels: "true"
    large_files_label: "violations/large-files"
    too_many_files_label: "violations/too-many-files"
    excessive_changes_label: "violations/excessive-changes"
```

### Selective Label Enabling

Control which label types are applied (unified naming: `*_enabled` and `*_thresholds`).

| Parameter | Required | Default | Description |
| ----------------------- | -------- | ------------------------------------ | --------------------------------------------------- |
| `size_enabled` | ❌ | `true` | Enable size labels (size/small, size/medium, etc.) |
| `size_thresholds` | ❌ | `{"small": 200, "medium": 500, ...}` | Size label thresholds (JSON, additions-based) |
| `complexity_enabled` | ❌ | `false` | Enable complexity labels (complexity/medium, high) |
| `complexity_thresholds` | ❌ | `{"medium": 15, "high": 30}` | Complexity label thresholds (JSON) |
| `category_enabled` | ❌ | `true` | Enable category labels (category/tests, docs, etc.) |
| `risk_enabled` | ❌ | `true` | Enable risk labels (risk/high, risk/medium) |

**Examples:**

```yaml
# Default: All labels enabled
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

# Disable complexity labels only
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    complexity_enabled: "false"

# Custom thresholds with selective enabling
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    size_enabled: "true"
    size_thresholds: '{"small": 50, "medium": 200, "large": 500}'
    complexity_enabled: "true"
    complexity_thresholds: '{"medium": 15, "high": 30}'
    category_enabled: "false"
    risk_enabled: "true"
```

### Action Settings

| Parameter | Required | Default | Description |
| ------------------------ | -------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `skip_draft_pr` | ❌ | `true` | Skip check for draft PRs |
| `comment_on_pr` | ❌ | `auto` | Comment on PR (`auto`/`always`/`never`) |
| `enable_summary` | ❌ | `true` | Write PR metrics to GitHub Actions Summary |
| `fail_on_large_files` | ❌ | `""` | Fail workflow if large files are detected (labeled with `large_files_label` or `too_many_lines_label`) |
| `fail_on_too_many_files` | ❌ | `""` | Fail workflow if too many files are detected (labeled with `too_many_files_label`) |
| `fail_on_pr_size` | ❌ | `""` | Fail workflow if PR size exceeds threshold (`small`/`medium`/`large`/`xlarge`/`xxlarge`, empty string to disable) |

**Label-Based Workflow Failure Control:**

These parameters control workflow failures based on applied labels or actual violations.

```yaml
# Pattern 1: Strict file size checking
- uses: jey3dayo/pr-labeler@v1
  with:
    fail_on_large_files: "true"

# Pattern 2: Strict file count checking
- uses: jey3dayo/pr-labeler@v1
  with:
    fail_on_too_many_files: "true"

# Pattern 3: Fail if PR size is "large" or above
- uses: jey3dayo/pr-labeler@v1
  with:
    fail_on_pr_size: "large"
    size_enabled: "true"  # fail_on_pr_size requires size_enabled

# Pattern 4: Combined strict mode
- uses: jey3dayo/pr-labeler@v1
  with:
    fail_on_large_files: "true"
    fail_on_too_many_files: "true"
    fail_on_pr_size: "xlarge"
    size_enabled: "true"
```

**Note:** `fail_on_pr_size` requires `size_enabled: "true"`.

### Exclusion Settings

| Parameter | Required | Default | Description |
| ----------------------------- | -------- | ------- | ---------------------------------------------------------------- |
| `additional_exclude_patterns` | ❌ | - | Additional file patterns to exclude (comma or newline separated) |
| `use_default_excludes` | ❌ | `true` | Use default exclude patterns (node_modules, dist, etc.) |

**Examples:**

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    additional_exclude_patterns: |
      **/*.generated.ts
      **/*.gen.go
      coverage/**
    use_default_excludes: "true"
```

### Directory-Based Labeling

| Parameter | Required | Default | Description |
| ------------------------------- | -------- | ------------------------------- | --------------------------------------------------- |
| `enable_directory_labeling` | ❌ | `false` | Enable Directory-Based Labeling feature |
| `directory_labeler_config_path` | ❌ | `.github/directory-labeler.yml` | Path to directory labeler configuration file |
| `max_labels` | ❌ | `10` | Maximum number of labels to apply (0 for unlimited) |

**Example:**

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    enable_directory_labeling: true
    directory_labeler_config_path: ".github/directory-labeler.yml"
    max_labels: 5
```

See [Advanced Usage Guide](advanced-usage.md#directory-based-labeling) for `.github/directory-labeler.yml` configuration.

### Multi-language Support

| Parameter | Required | Default | Description |
| ---------- | -------- | ------- | --------------------------------------------------- |
| `language` | ❌ | `en` | Language for output messages (en, ja, en-US, ja-JP) |

**Example:**

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
  env:
    LANGUAGE: ja  # or 'en' (default)
```

**Language Decision Priority:**

1. `LANGUAGE` environment variable
2. `LANG` environment variable
3. `language` field in `pr-labeler.yml`
4. Default: English (`en`)

See [Advanced Usage Guide](advanced-usage.md#multi-language-support) for detailed configuration.

## Label Thresholds Defaults

### Size Labels (`size_thresholds`)

**Default thresholds:**

```json
{
  "small": 200,
  "medium": 500,
  "large": 1000,
  "xlarge": 3000
}
```

**Label application rules:**

- `size/small`: additions < 200
- `size/medium`: 200 ≤ additions < 500
- `size/large`: 500 ≤ additions < 1000
- `size/xlarge`: 1000 ≤ additions < 3000
- `size/xxlarge`: additions ≥ 3000

**Customization:**

```yaml
size_thresholds: '{"small": 50, "medium": 200, "large": 500, "xlarge": 1500}'
```

### Complexity Labels (`complexity_thresholds`)

**Default thresholds:**

```json
{
  "medium": 15,
  "high": 30
}
```

**Label application rules:**

- `complexity/medium`: 15 ≤ max cyclomatic complexity < 30
- `complexity/high`: max cyclomatic complexity ≥ 30

**Customization:**

```yaml
complexity_thresholds: '{"medium": 10, "high": 20}'
```

**Note:** Complexity labels are **disabled by default** (`complexity_enabled: "false"`). Enable them explicitly if needed.

### Risk Labels

Risk labels assess the potential impact and safety of PR changes. The evaluation considers:

1. **CI Status** (when available)
2. **File Change Patterns**
3. **Commit Message Analysis**

#### Label Application Rules

**`risk/high`** is applied when:

- **CI checks failed** (tests, type-check, build, or lint)
- **New feature in core functionality without test files**
  - Detected by commit messages starting with `feat:`, `feat(`, `feature:`, or `feature(`
  - Changes in `core_paths` (default: `src/**`)
  - No test files added (`*.test.ts`, `*.spec.ts`, `__tests__/**`)

**`risk/medium`** is applied when:

- **Configuration files changed**
  - `.github/workflows/**` (CI/CD pipeline changes)
  - `package.json` (dependency changes)
  - `tsconfig.json` (TypeScript configuration)
  - Any file matching `config_files` patterns

**No risk label** (safe PR) when:

- **Refactoring with all CI passed**
  - Detected by commit messages starting with `refactor:` or `refactor(`
  - All CI checks succeeded
- **Documentation-only changes**
  - Detected by commit messages starting with `docs:` or `docs(`
- **Test-only changes**
  - Detected by commit messages starting with `test:` or `test(`

#### Default Risk Configuration

```yaml
risk:
  enabled: true                    # Enable risk assessment
  high_if_no_tests_for_core: true  # Require tests for core changes
  use_ci_status: true              # Consider CI check results
  core_paths:
    - "src/**"
  config_files:
    - ".github/workflows/**"
    - "package.json"
    - "tsconfig.json"
```

#### FAQ: Why Does My PR Get `risk/medium`?

**Q: I only changed `.github/workflows/ci.yml`. Why `risk/medium`?**

**A:** CI/CD workflow changes are inherently risky because they affect the entire build and deployment pipeline. Even small syntax errors can break builds or deployments for all developers.

**Q: Can I customize which files trigger `risk/medium`?**

**A:** Yes, customize via `.github/pr-labeler.yml`:

```yaml
risk:
  config_files:
    - ".github/workflows/**"
    - "package.json"
    - "tsconfig.json"
    - "Dockerfile"           # Add custom patterns
    - "docker-compose.yml"
```

**Q: How do I avoid `risk/high` for new features?**

**A:** Add test files in the same PR:

```yaml
# This will not get risk/high
files:
  - src/features/new-feature.ts      # New feature
  - src/features/new-feature.test.ts # Test file added ✅
```

## GitHub Actions Summary Output

This action writes analysis results to the GitHub Actions workflow summary page in Markdown format.

### Display Content

- 📊 **Basic Metrics**: Total additions, file count, excluded files, execution time
- ⚠️ **Violation Details**: Detailed table of files exceeding size/line limits
- 📈 **Large Files List**: Top 100 files (sorted by size)
- 🕐 **Execution Time**: ISO 8601 format (UTC)

### Size Limits and Behavior

GitHub Actions job summaries have the following limits:

- **Maximum Size**: 1 MiB (1,048,576 bytes) / step
- **On Overflow**: Summary upload fails and an error annotation is created (does not affect step/job status)
- **Display Limit**: Maximum 20 step summaries displayed per job

For large PRs (thousands of lines, hundreds of files), consider disabling or limiting summary output:

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    enable_summary: "false"  # Disable summary output
```

## Output Variables

| Variable | Type | Description | Example |
| -------------------- | ------ | ----------------------------------------- | ----------------------------------------------------- |
| `large_files` | string | JSON array of files exceeding limits | `[{"file":"src/large.ts","actualValue":2000000,...}]` |
| `pr_additions` | string | Total lines added in PR (diff-based) | `"150"` |
| `pr_files` | string | Total number of files (excluding removed) | `"10"` |
| `exceeds_file_size` | string | Whether any file exceeds size limit | `"true"` / `"false"` |
| `exceeds_file_lines` | string | Whether any file exceeds line limit | `"true"` / `"false"` |
| `exceeds_additions` | string | Whether PR exceeds total additions limit | `"true"` / `"false"` |
| `exceeds_file_count` | string | Whether PR exceeds file count limit | `"true"` / `"false"` |
| `has_violations` | string | Whether any violation exists | `"true"` / `"false"` |

**Usage Example:**

```yaml
- uses: jey3dayo/pr-labeler@v1
  id: pr-check
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

- name: Use outputs
  run: |
    echo "PR Additions: ${{ steps.pr-check.outputs.pr_additions }}"
    echo "Has Violations: ${{ steps.pr-check.outputs.has_violations }}"
```

## Default Exclude Patterns

The following files are automatically excluded from analysis:

- **Lock files**: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Cargo.lock`, `Gemfile.lock`, `composer.lock`, `poetry.lock`
- **Dependencies**: `node_modules/**`, `vendor/**`, `.bundle/**`
- **Build artifacts**: `dist/**`, `build/**`, `.next/**`, `out/**`, `target/**`
- **Minified files**: `*.min.js`, `*.min.css`, `*.bundle.js`
- **Source maps**: `*.map`
- **Binary files**: Images (`.png`, `.jpg`, `.gif`, etc.), Videos, Executables
- **Cache**: `.cache/**`, `.turbo/**`, `.parcel-cache/**`
- **Generated files**: `*.generated.*`, `*.gen.ts`, `*.gen.go`
- **Test coverage**: `coverage/**`, `.nyc_output/**`
- **IDE/Editor**: `.vscode/**`, `.idea/**`
- **Spec-driven metadata**: `.claude/**`, `.codex/**`, `.kiro/**`
- **Documentation**: `docs/**`, `documentation/**`

**Complete list**: See [default-excludes.ts](../src/configs/default-excludes.ts) for the full default exclude patterns.

**Note:** You can disable default excludes with `use_default_excludes: "false"` if needed.

## YAML Config File

You can customize PR Insights Labeler behavior by creating `.github/pr-labeler.yml`.

### File Structure

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

See the [Category Guide](categories.md) for detailed information about default categories and custom category creation.

categories:
  - label: "category/tests"
    patterns:
      - "__tests__/**"
      - "**/*.test.ts"
      - "**/*.test.tsx"
    display_name:
      en: "Test Files"
      ja: "テストファイル"

  - label: "category/ci-cd"
    patterns:
      - ".github/workflows/**"
    display_name:
      en: "CI/CD"
      ja: "CI/CD"

  - label: "category/documentation"
    patterns:
      - "docs/**"
      - "**/*.md"
    display_name:
      en: "Documentation"
      ja: "ドキュメント"

  - label: "category/backend"  # Custom category
    patterns:
      - "src/api/**"
      - "src/services/**"
    display_name:
      en: "Backend"
      ja: "バックエンド"

# Risk assessment settings
risk:
  high_if_no_tests_for_core: true
  core_paths:
    - "src/**"
  config_files:
    - ".github/workflows/**"
    - "package.json"
    - "tsconfig.json"

# Label operation settings
labels:
  create_missing: true  # Auto-create missing labels
  namespace_policies:
    "size/*": replace      # Size labels are exclusive (uniqueness guaranteed)
    "category/*": additive # Category labels are additive (multiple allowed)
    "risk/*": replace      # Risk labels are exclusive

# Runtime settings
runtime:
  fail_on_error: false  # Continue workflow on error
```

### Display Name Priority

Label display names are determined by the following priority:

1. `display_name` in `.github/pr-labeler.yml` (custom translation)
2. Built-in translation resources (`labels` namespace)
3. Label name as-is

**Note:** GitHub API calls always use the English label name (`label` field). `display_name` is used for display only.

### Configuration Without File

PR Insights Labeler works immediately with default settings even without `.github/pr-labeler.yml`.

---

## Related Documentation

- [Advanced Usage Guide](advanced-usage.md) - Real-world examples and advanced configurations
- [Troubleshooting Guide](troubleshooting.md) - Common issues and solutions
- [Main README](../README.md) - Quick start and overview
