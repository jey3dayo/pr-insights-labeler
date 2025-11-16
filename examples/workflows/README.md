# Workflow Examples

Simple workflow configurations to get started with PR Insights Labeler.

## Available Examples

### 1. [basic.yml](basic.yml) - Basic Configuration

**Quick start with default settings**

```bash
cp examples/workflows/basic.yml .github/workflows/pr-labeler.yml
```

**What you get:**

- Size labels (size/small, size/medium, size/large, etc.)
- Category labels (category/tests, category/docs, category/ci-cd, etc.)
- Risk labels (risk/high, risk/medium)
- GitHub Actions Summary with metrics
- Auto-created labels

**Best for:** Most projects that want automatic PR labeling with sensible defaults.

---

### 2. [advanced.yml](advanced.yml) - Advanced Configuration

**Customizable configuration with optional features**

```bash
cp examples/workflows/advanced.yml .github/workflows/pr-labeler.yml
```

**Includes commented examples for:**

- **File exclusion patterns** - Exclude generated code, vendor files, test fixtures
- **Dependency handling** - Custom handling for lock files and package manifests
- **Custom thresholds** - Adjust size and complexity thresholds
- **Quality gates** - Fail workflow on violations (strict mode)
- **Label customization** - Customize violation label names
- **Multi-language support** - English/Japanese output

**Best for:** Teams that need fine-tuned control over PR analysis behavior.

---

## Quick Setup

1. **Choose a configuration:**
   - New to PR Insights Labeler? → Start with `basic.yml`
   - Need customization? → Use `advanced.yml`

2. **Copy to your repository:**

   ```bash
   mkdir -p .github/workflows
   cp examples/workflows/basic.yml .github/workflows/pr-labeler.yml
   ```

3. **Customize (optional):**
   - Edit `.github/workflows/pr-labeler.yml`
   - Uncomment features you need
   - Adjust thresholds and limits

4. **Commit and push:**

   ```bash
   git add .github/workflows/pr-labeler.yml
   git commit -m "Add PR Insights Labeler"
   git push
   ```

## Common Customizations

### Exclude Generated Code

Uncomment in `advanced.yml`:

```yaml
additional_exclude_patterns: |
  **/*.generated.ts
  **/*.pb.go
  **/graphql/generated/**
```

### Enable Complexity Labels

Uncomment in `advanced.yml`:

```yaml
complexity_enabled: "true"
complexity_thresholds: '{"medium": 15, "high": 30}'
```

### Strict Mode (Fail on Violations)

Uncomment in `advanced.yml`:

```yaml
fail_on_large_files: "true"
fail_on_too_many_files: "true"
fail_on_pr_size: "xlarge"
```

### Japanese Output

Uncomment in `advanced.yml`:

```yaml
language: "ja"
```

## Additional Configuration

### Custom Category Labels

Create `.github/pr-labeler.yml`:

```yaml
categories:
  - label: "category/frontend"
    patterns:
      - "src/components/**"
      - "src/pages/**"
    display_name:
      en: "Frontend"
      ja: "フロントエンド"

  - label: "category/backend"
    patterns:
      - "src/api/**"
      - "src/services/**"
    display_name:
      en: "Backend"
      ja: "バックエンド"
```

### Fork PR Support

For open source projects accepting external contributions, use `pull_request_target`:

```yaml
on:
  pull_request_target: # Instead of pull_request
    types: [opened, synchronize, reopened]

jobs:
  label:
    # ... same as basic.yml
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }} # Important!
      # ... rest of config
```

⚠️ **Security Note:** `pull_request_target` has access to secrets. Only use for trusted repositories.

## Documentation

- 📖 [Configuration Guide](../../docs/configuration.md) - All parameters and options
- 🔧 [Advanced Usage](../../docs/advanced-usage.md) - Real-world examples
- 🐛 [Troubleshooting](../../docs/troubleshooting.md) - Common issues
- 🏠 [Main README](../../README.md) - Overview and quick start

## Questions?

- [GitHub Issues](https://github.com/jey3dayo/pr-insights-labeler/issues)
- [Discussions](https://github.com/jey3dayo/pr-insights-labeler/discussions)
