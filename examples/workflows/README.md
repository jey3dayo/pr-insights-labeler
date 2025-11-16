# Workflow Examples

This directory contains example workflow configurations for PR Insights Labeler.

## Available Examples

### 1. [basic.yml](basic.yml) - Basic Configuration

**Use Case**: Quick start with minimal configuration

**Features**:

- ✅ All labels enabled (size, category, risk)
- ✅ Default thresholds
- ✅ GitHub Actions Summary
- ✅ Auto-created labels

**Setup**: Copy to `.github/workflows/pr-labeler.yml`

```bash
cp examples/workflows/basic.yml .github/workflows/pr-labeler.yml
```

---

### 2. [recommended.yml](recommended.yml) - Recommended Configuration ⭐

**Use Case**: Production-ready configuration with optional features

**Features**:

- ✅ All basic features enabled
- 💡 Optional features (commented out)
- 💡 Workflow quality gates (commented out)
- 💡 Directory-based labeling (commented out)
- 💡 Multi-language support (commented out)
- 📝 Detailed inline documentation

**Setup**: Copy and uncomment features as needed

```bash
cp examples/workflows/recommended.yml .github/workflows/pr-labeler.yml
# Edit the file and uncomment desired features
```

**Best For**: Teams that want flexibility and gradual feature adoption

---

### 3. [strict.yml](strict.yml) - Strict Mode

**Use Case**: Enforce code quality standards

**Features**:

- ✅ Strict size limits
- ✅ Complexity checks enabled
- ✅ Workflow fails on violations
- ✅ Always comment on violations
- ❌ Not recommended for open source projects

**Setup**:

```bash
cp examples/workflows/strict.yml .github/workflows/pr-labeler.yml
```

**Best For**: Mission-critical codebases requiring strict review standards

---

### 4. [fork-friendly.yml](fork-friendly.yml) - Fork PR Support

**Use Case**: Open source projects accepting external contributions

**Features**:

- ✅ Uses `pull_request_target` event
- ✅ Secure handling of fork PRs
- ⚠️ Security considerations documented
- ✅ Proper checkout configuration

**Setup**:

```bash
cp examples/workflows/fork-friendly.yml .github/workflows/pr-labeler.yml
```

**Best For**: Public repositories with fork PRs

⚠️ **Security Warning**: Review security considerations in the file before using

---

### 5. [summary-only.yml](summary-only.yml) - Read-Only Mode

**Use Case**: Analysis without modifying PRs

**Features**:

- ✅ GitHub Actions Summary only
- ❌ No labels applied
- ❌ No PR comments
- ✅ Requires only `contents: read` permission

**Setup**:

```bash
cp examples/workflows/summary-only.yml .github/workflows/pr-labeler.yml
```

**Best For**:

- Repositories without write permissions
- Trial period before enabling full labeling
- Internal analytics

---

## Customization Guide

### Step 1: Choose a Base Configuration

1. **New to PR Insights Labeler?** → Start with `basic.yml`
2. **Want flexibility?** → Use `recommended.yml`
3. **Need strict enforcement?** → Use `strict.yml`
4. **Open source project?** → Use `fork-friendly.yml`
5. **No write permissions?** → Use `summary-only.yml`

### Step 2: Copy to Your Repository

```bash
# Create .github/workflows directory if it doesn't exist
mkdir -p .github/workflows

# Copy your chosen example
cp examples/workflows/[chosen-example].yml .github/workflows/pr-labeler.yml
```

### Step 3: Customize Settings

Edit `.github/workflows/pr-labeler.yml` and adjust:

- Size limits (`file_size_limit`, `pr_additions_limit`, etc.)
- Thresholds (`size_thresholds`, `complexity_thresholds`)
- Label names (`large_files_label`, etc.)
- Language (`language: "en"` or `language: "ja"`)

### Step 4: Enable Optional Features

In `recommended.yml`, uncomment features you need:

```yaml
# Enable complexity checks
complexity_enabled: "true"
complexity_thresholds: '{"medium": 15, "high": 30}'

# Fail on large PRs
fail_on_pr_size: "xlarge"

# Enable directory-based labeling
enable_directory_labeling: "true"
```

## Additional Configuration Files

Some features require additional configuration files:

### Directory-Based Labeling

Create `.github/directory-labeler.yml`:

```yaml
version: 1

rules:
  - label: 'area:frontend'
    include:
      - 'src/components/**'
      - 'src/pages/**'
    priority: 20

  - label: 'area:backend'
    include:
      - 'src/api/**'
      - 'src/services/**'
    priority: 20

namespaces:
  exclusive: ['area']
  additive: ['scope']
```

See [Advanced Usage - Directory-Based Labeling](../../docs/advanced-usage.md#directory-based-labeling) for details.

### Custom Label Configuration

Create `.github/pr-labeler.yml`:

```yaml
language: en

size:
  thresholds:
    small: 100
    medium: 300
    large: 700
    xlarge: 2000

categories:
  - label: "category/tests"
    patterns:
      - "__tests__/**"
      - "**/*.test.ts"
    display_name:
      en: "Test Files"
      ja: "テストファイル"
```

See [Configuration Guide](../../docs/configuration.md#yaml-config-file) for details.

## Related Documentation

- [Configuration Guide](../../docs/configuration.md) - Complete input parameters reference
- [Advanced Usage](../../docs/advanced-usage.md) - Real-world examples and patterns
- [Troubleshooting](../../docs/troubleshooting.md) - Common issues and solutions
- [Main README](../../README.md) - Quick start and overview

## Questions?

- 📖 Check the [documentation](../../docs/)
- 🐛 Report issues at [GitHub Issues](https://github.com/jey3dayo/pr-insights-labeler/issues)
- 💬 Ask questions in [Discussions](https://github.com/jey3dayo/pr-insights-labeler/discussions)
