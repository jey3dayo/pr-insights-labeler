---
name: release-automation
description: Specialized skill for PR Insights Labeler release automation. Automates semantic versioning releases (patch/minor/major) with quality checks, changelog generation, GitHub Release creation, and template-based release notes following .github/RELEASE_TEMPLATE.md format. Trigger when users mention "release", "リリース", version numbers (e.g., "v1.8.1"), or request version bumps ("patch", "minor", "major").
---

# Release Automation

## Overview

Automate the complete release process for PR Insights Labeler, including version bumping, quality validation, changelog generation, and GitHub Release creation with standardized release notes.

## When to Use

Trigger this skill when users request:

- Version releases: "v1.8.1としてリリースして", "release v2.0.0"
- Semantic version bumps: "patch release", "minor release", "major release"
- Release operations: "create a release", "bump version", "publish new version"
- Japanese release requests: "リリースして", "バージョンアップして"

## Release Workflow

The automated release process follows these steps:

### 1. Pre-Release Validation

Before starting the release:

1. **Check working tree status**

   ```bash
   git status
   ```

   Ensure no uncommitted changes exist.

2. **Verify current branch**

   ```bash
   git branch --show-current
   ```

   Must be on `main` branch.

3. **Pull latest changes**
   ```bash
   git pull origin main
   ```
   Sync with remote repository.

### 2. Automated Release Script

Use `scripts/release.sh` for the complete automated workflow:

```bash
./scripts/release.sh
```

The script provides an interactive menu:

- **1) patch** - Bug fixes (v1.0.0 → v1.0.1)
- **2) minor** - New features (v1.0.0 → v1.1.0)
- **3) major** - Breaking changes (v1.0.0 → v2.0.0)
- **4) custom** - Specify version manually
- **5) cancel** - Abort release

The script automatically:

1. Runs quality checks (lint, tests, build)
2. Generates changelog from Conventional Commits
3. Updates `package.json` and `CHANGELOG.md`
4. Creates git commit and tags (v{version} and v{major})
5. Pushes to remote and creates GitHub Release

**Release notes follow the standard format defined in `references/RELEASE_TEMPLATE.md`.**

### 3. Quality Metrics Collection

The script automatically collects and includes:

- **Test count**: Extracted from `pnpm test:vitest` output
- **ESLint status**: Verified via `pnpm lint`
- **TypeScript status**: Verified via type checking
- **Build status**: Verified via `pnpm build`

These metrics are included in the GitHub Release notes.

### 4. Release Notes Structure

Release notes are automatically generated following `.github/RELEASE_TEMPLATE.md`:

```markdown
## ⚠️ Breaking Changes (if applicable)
- Breaking change description (#PR)
  - **Migration Guide**: Step-by-step instructions
  - **Affected**: Which features are impacted
  - **Action Required**: What users need to do

## 🚀 What's New

### ✨ Added
- New feature (#PR)

### 🔄 Changed
- Modified behavior (#PR)

### 🐛 Fixed
- Bug fix (#PR)

### 🗑️ Removed (if applicable)
- Removed feature (#PR)

## 📊 Quality Metrics

- ✅ [N] tests passing
- ✅ 0 ESLint errors/warnings
- ✅ 0 TypeScript type errors
- ✅ Build successful

## 👥 Contributors

This release was made possible by:
- @contributor1
- @contributor2

## 🔗 Full Changelog

**Full Changelog**: https://github.com/jey3dayo/pr-insights-labeler/compare/v[PREVIOUS]...v[CURRENT]

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### 5. Breaking Changes Detection

The script automatically detects breaking changes from git commits:

- **BREAKING CHANGE: footer** (Conventional Commits)

  ```
  feat: new API endpoint

  BREAKING CHANGE: Removed deprecated /old-endpoint
  ```

- **! notation** (feat!, fix!, etc.)
  ```
  feat!: change default configuration format
  ```

When detected, breaking changes are prominently displayed at the top of release notes.

## Manual Release (Alternative)

If automated script cannot be used, follow these steps:

### Step 1: Version Update

```bash
# Update package.json version
jq '.version = "1.8.1"' package.json > package.json.tmp
mv package.json.tmp package.json
```

### Step 2: Quality Checks

Run all quality checks:

```bash
pnpm lint        # ESLint
pnpm type-check  # TypeScript
pnpm test        # Vitest
pnpm build       # ncc build
```

All must pass before proceeding.

### Step 3: Create Commit and Tags

```bash
# Commit version change
git add package.json
git commit -m "chore: release v1.8.1"

# Create version tag
git tag -a v1.8.1 -m "v1.8.1

<changelog content>"

# Update major version tag
git tag -f v1 v1.8.1^{}
```

### Step 4: Push and Create Release

```bash
# Push changes
git push origin main
git push origin v1.8.1
git push origin v1 --force

# Create GitHub Release
gh release create v1.8.1 \
  --title "v1.8.1" \
  --notes "<release notes following RELEASE_TEMPLATE.md>"
```

## Changelog Generation Rules

The script follows Conventional Commits for changelog categorization:

| Commit Prefix               | Category      | Example                      |
| --------------------------- | ------------- | ---------------------------- |
| `feat:`, `feat(*)`          | ✨ Added      | `feat: add new label type`   |
| `fix:`, `fix(*)`            | 🐛 Fixed      | `fix: resolve parsing error` |
| `chore:`, `docs:`, `style:` | 🔄 Changed    | `chore: update dependencies` |
| Other                       | Other Changes | `improve performance`        |

**PR number extraction**: Automatically extracts `(#123)` from commit messages.

## Version Strategies

### Semantic Versioning (SemVer)

Follow SemVer principles:

- **MAJOR** (v1.0.0 → v2.0.0): Breaking changes, API changes
- **MINOR** (v1.0.0 → v1.1.0): New features, backward compatible
- **PATCH** (v1.0.0 → v1.0.1): Bug fixes, backward compatible

### Major Version Tags

Always maintain major version tags (v1, v2, etc.) for GitHub Actions workflows:

```bash
# Users can reference @v1 in workflows
uses: jey3dayo/pr-insights-labeler@v1
```

The script automatically updates major version tags.

## Troubleshooting

### Merge Conflicts

If remote has new commits:

```bash
git pull --rebase origin main
# Resolve conflicts if any
git tag -f v1.8.1  # Recreate tag after rebase
git tag -f v1 v1.8.1^{}
git push origin main && git push origin v1.8.1 --force && git push origin v1 --force
```

### CI Checks Failure

If GitHub Actions fail after release:

1. Check workflow logs
2. Fix issues in a hotfix branch
3. Create patch release (v1.8.2)

### Incorrect Release Notes

Edit release on GitHub:

```bash
gh release edit v1.8.1 --notes "$(cat <<'EOF'
<corrected release notes>
EOF
)"
```

## Resources

This skill references:

### scripts/release.sh

Automated release script implementing the complete workflow. Execute without arguments for interactive mode.

**Key features:**

- Interactive release type selection
- Automatic quality checks
- Changelog generation from git commits
- Breaking changes detection
- Contributors list generation
- GitHub Release creation

### references/RELEASE_TEMPLATE.md

Standard release notes template defining the format and structure. The template includes:

- Section guidelines (Breaking Changes, What's New, Quality Metrics, Contributors)
- Emoji guide for consistent formatting
- Writing tips for effective release notes
- PR reference requirements
- Example release notes

**Load this reference when editing release notes manually** to ensure consistency with project standards.
