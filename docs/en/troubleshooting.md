# 🐛 Troubleshooting Guide

**Last Updated**: 2025-11-30
**Audience**: Users, Developers
**Tags**: `category/operations`, `audience/user`, `audience/developer`

**Languages**: English | 日本語（準備中）

Common issues and solutions for PR Insights Labeler.

## Table of Contents

- [Permission Errors](#permission-errors)
- [Labels Not Applied](#labels-not-applied)
- [Draft PR Skipped](#draft-pr-skipped)
- [Complexity Analysis Failed](#complexity-analysis-failed)
- [File Count Mismatch](#file-count-mismatch)
- [Summary Output Missing](#summary-output-missing)
- [Debug Tips](#debug-tips)
- [Support](#support)

## Permission Errors

### Problem

Workflow fails with error: `"Resource not accessible by integration"`

**Error Example:**

```
Error: Resource not accessible by integration
HttpError: Resource not accessible by integration
```

### Cause

The GitHub token does not have sufficient permissions to perform label operations or comment posting.

### Solutions

#### 1. Add Required Permissions

Ensure your workflow has the necessary permissions:

```yaml
name: PR Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest

    # Add required permissions
    permissions:
      pull-requests: write  # Label management
      issues: write         # Comment posting
      contents: read        # File reading

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-insights-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

#### 2. Fork PR Handling

For PRs from forks, use `pull_request_target` event:

```yaml
on:
  pull_request_target:
    types: [opened, synchronize, reopened]

jobs:
  check:
    permissions:
      pull-requests: write
      issues: write
      contents: read

    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}

      - uses: jey3dayo/pr-insights-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

⚠️ **Security Note**: `pull_request_target` runs in the base repository context. Only use when necessary.

#### 3. Repository Settings

Verify that GitHub Actions has write permissions in repository settings:

1. Go to **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select **Read and write permissions**
3. Check **Allow GitHub Actions to create and approve pull requests**

### Related

- [Advanced Usage - Fork PR Handling](advanced-usage.md#fork-pr-handling)
- [Configuration Guide - Required Permissions](configuration.md#input-parameters)

## Labels Not Applied

### Problem

PR Insights Labeler runs successfully but labels are not applied to the PR.

### Cause

Labels must exist in the repository before PR Insights Labeler can apply them. GitHub does not automatically create labels.

### Solutions

#### Option 1: Pre-create Labels Manually

Create labels manually in your repository:

1. Go to **Issues** → **Labels**
2. Click **New label**
3. Create the following labels:

**Size Labels:**

- `size/small` (e.g., green `#28a745`)
- `size/medium` (e.g., yellow `#ffc107`)
- `size/large` (e.g., orange `#fd7e14`)
- `size/xlarge` (e.g., red `#dc3545`)
- `size/xxlarge` (e.g., dark red `#bd2130`)

**Category Labels:**

- `category/tests`
- `category/ci-cd`
- `category/documentation`
- `category/config`
- `category/spec`
- `category/dependencies`

**Risk Labels:**

- `risk/high` (e.g., red `#d93f0b`)
- `risk/medium` (e.g., orange `#fbca04`)

**Violation Labels:**

- `auto/large-files`
- `auto/too-many-files`

#### Option 2: Auto-Create Labels with Configuration

Enable automatic label creation in `.github/pr-labeler.yml`:

```yaml
# .github/pr-labeler.yml

labels:
  create_missing: true  # Auto-create missing labels

# Optional: Customize label colors and descriptions
# (currently not supported for PR Insights Labeler labels, but available for Directory-Based Labeling)
```

#### Option 3: Auto-Create Labels with Directory-Based Labeling

Directory-Based Labeling automatically creates missing labels (no configuration needed):

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    enable_directory_labeling: true  # Labels are auto-created with default color (cccccc)
```

### Verification

After creating labels, check:

1. **GitHub Actions Summary**: Verify labels are listed in the summary output
2. **PR Page**: Check that labels appear on the PR
3. **Workflow Logs**: Look for label application messages

### Related

- [Configuration Guide - Label Settings](configuration.md#label-settings)

## Draft PR Skipped

### Problem

PR Insights Labeler does not run on draft PRs.

### Cause

By default, `skip_draft_pr` is set to `"true"`, causing the action to skip draft PRs.

### Solution

Explicitly set `skip_draft_pr` to `"false"`:

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    skip_draft_pr: "false"  # Run on draft PRs
```

### Verification

1. Create or convert a PR to draft
2. Trigger the workflow (push a commit)
3. Check GitHub Actions Summary for analysis results

### When to Skip Draft PRs

**Skip (`skip_draft_pr: "true"`, default):**

- ✅ Draft PRs are work-in-progress and labels may change
- ✅ Reduce CI noise for incomplete work
- ✅ Save GitHub Actions minutes

**Don't Skip (`skip_draft_pr: "false"`):**

- ✅ Need immediate feedback on PR size/quality
- ✅ Enforce strict limits even for drafts
- ✅ Track metrics for all PRs

### Related

- [Configuration Guide - Action Settings](configuration.md#action-settings)

## Complexity Analysis Failed

### Problem

Complexity analysis fails with syntax errors or parsing issues.

**Error Example:**

```
Error analyzing complexity for file: src/example.ts
Parsing error: Unexpected token
```

### Cause

The complexity analyzer uses ESLint's TypeScript parser, which may fail on:

- Invalid syntax
- Unsupported language features
- Non-TypeScript/JavaScript files

### Solutions

#### 1. Check File Syntax

Ensure the file has valid TypeScript/JavaScript syntax:

```bash
# Run TypeScript compiler
npx tsc --noEmit

# Run ESLint
npx eslint src/
```

#### 2. Disable Complexity Labels

If complexity analysis is not critical, disable it:

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    complexity_enabled: "false"  # Disable complexity analysis
```

**Note:** Complexity labels are **disabled by default** (`complexity_enabled: "false"`).

#### 3. Exclude Problematic Files

Add problematic files to exclusion patterns:

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    additional_exclude_patterns: |
      **/*.generated.ts
      **/*.min.js
      problematic-file.ts
```

### Verification

1. Check GitHub Actions Summary for complexity analysis results
2. Look for error messages in workflow logs
3. Verify that complexity labels (`complexity/medium`, `complexity/high`) are applied correctly

### Related

- [Configuration Guide - Selective Label Enabling](configuration.md#selective-label-enabling)
- [Configuration Guide - Exclusion Settings](configuration.md#exclusion-settings)

## File Count Mismatch

### Problem

The file count reported by PR Insights Labeler differs from the file count shown in the GitHub PR UI.

**Example:**

- GitHub PR UI: "15 files changed"
- PR Insights Labeler Summary: "10 files analyzed"

### Cause

PR Insights Labeler automatically excludes certain files by default:

- Lock files (`package-lock.json`, `yarn.lock`, etc.)
- Dependencies (`node_modules/**`, `vendor/**`, etc.)
- Build artifacts (`dist/**`, `build/**`, etc.)
- Minified files (`*.min.js`, `*.min.css`)
- Binary files (images, videos, executables)

### Solutions

#### 1. Understand Default Excludes

Review the [Default Exclude Patterns](configuration.md#default-exclude-patterns) to understand which files are automatically excluded.

#### 2. Disable Default Excludes

If you want to analyze all files, disable default exclusions:

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    use_default_excludes: "false"  # Analyze all files
```

⚠️ **Warning**: This may significantly increase analysis time and include irrelevant files (lock files, build artifacts).

#### 3. Verify Excluded Files

Check GitHub Actions Summary for the "Excluded from Analysis" section:

```
📊 PR Metrics
- Total Additions: 150 lines
- Files Changed: 10 files
- Excluded from Analysis: 5 files

Excluded from Analysis:
- package-lock.json (lock file)
- dist/index.js (build artifact)
- src/large.min.js (minified file)
```

### Related

- [Configuration Guide - Default Exclude Patterns](configuration.md#default-exclude-patterns)
- [Configuration Guide - Exclusion Settings](configuration.md#exclusion-settings)

## Summary Output Missing

### Problem

GitHub Actions Summary is not displaying PR Insights Labeler output.

### Cause

Possible causes:

1. `enable_summary` is set to `"false"`
2. Summary exceeds GitHub's 1 MiB size limit
3. Workflow permissions do not allow summary writing

### Solutions

#### 1. Enable Summary Output

Ensure `enable_summary` is set to `"true"` (default):

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    enable_summary: "true"  # Enable summary output
```

#### 2. Reduce Summary Size

For large PRs, disable summary output:

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    enable_summary: "false"  # Disable for large PRs
```

#### 3. Check Workflow Logs

Look for summary-related errors in workflow logs:

```
Error: Unable to process summary. Size exceeds limit.
```

### Related

- [Configuration Guide - GitHub Actions Summary Output](configuration.md#github-actions-summary-output)
- [Configuration Guide - Action Settings](configuration.md#action-settings)

## Debug Tips

### Enable Debug Logging

Enable debug logging for detailed output:

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
  env:
    ACTIONS_STEP_DEBUG: true  # Enable debug logging
```

### Check GitHub Actions Summary

The GitHub Actions Summary provides comprehensive analysis results:

1. Go to the workflow run
2. Scroll to the **Summary** section
3. Review:
   - Basic metrics (additions, files, excluded files)
   - Violation details (if any)
   - Large files list
   - Applied labels

### Validate Workflow Syntax

Ensure your workflow YAML is valid:

```bash
# Install actionlint (workflow syntax validator)
brew install actionlint

# Validate workflow files
actionlint .github/workflows/*.yml
```

### Test Locally

Test PR Insights Labeler behavior locally:

```bash
# Clone the repository
git clone https://github.com/jey3dayo/pr-insights-labeler.git
cd pr-insights-labeler

# Install dependencies
pnpm install

# Build the action
pnpm build

# Run tests
pnpm test
```

### Check Repository Settings

Verify repository settings:

1. **Actions Permissions**: Settings → Actions → General → Workflow permissions
2. **Branch Protection**: Settings → Branches → Branch protection rules
3. **Labels**: Issues → Labels (verify labels exist)

### Common Issues Checklist

- [ ] Required permissions are granted (`pull-requests: write`, `issues: write`, `contents: read`)
- [ ] Labels exist in the repository (automatically created with Directory-Based Labeling)
- [ ] `skip_draft_pr` setting matches your intent
- [ ] Default exclude patterns are understood
- [ ] Workflow syntax is valid
- [ ] GitHub Actions Summary is enabled

## Support

If you encounter issues not covered in this guide:

### GitHub Issues

Report bugs, request features, or ask questions:

**🐛 Bug Report**: [Create an issue](https://github.com/jey3dayo/pr-insights-labeler/issues/new)

**✨ Feature Request**: [Create an issue](https://github.com/jey3dayo/pr-insights-labeler/issues/new)

**💬 Questions**: [View existing issues](https://github.com/jey3dayo/pr-insights-labeler/issues)

### Before Reporting

Please include:

1. **Workflow Configuration**: Full YAML workflow file
2. **Error Message**: Complete error output from workflow logs
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **PR Insights Labeler Version**: Action version (e.g., `v1.2.3`)
6. **Repository Context**: Public/private, fork PR, etc.

---

## Related Documentation

- [Configuration Guide](configuration.md) - Complete input parameters reference
- [Advanced Usage Guide](advanced-usage.md) - Real-world examples and advanced configurations
- [Main README](../README.md) - Quick start and overview
