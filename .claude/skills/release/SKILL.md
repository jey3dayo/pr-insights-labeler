---
name: release
model: sonnet
description: Specialized skill for PR Insights Labeler release automation. Automates semantic versioning releases (patch/minor/major) with quality checks, changelog generation, GitHub Release creation, and template-based release notes following .github/RELEASE_TEMPLATE.md format. Trigger when users mention "release", "リリース", version numbers (e.g., "v1.8.1"), or request version bumps ("patch", "minor", "major").
---

# Release

## Overview

Automate the complete release process for PR Insights Labeler, including version bumping, quality validation, changelog generation, GitHub Release creation, and the major-version-tag update, with standardized release notes.

## Release Workflow

The automated release process follows these steps:

### 1. Pre-Release Validation

Before starting the release:

1. Check working tree status

```bash
git status
```

Ensure no uncommitted changes exist.

1. Verify current branch

```bash
git branch --show-current
```

Must be on `main` branch.

1. Pull latest changes

```bash
git pull origin main
```

Sync with remote repository. This keeps both the automated script and a manual run from tagging on top of a stale `main`.

### 2. Automated Release Script

Use `scripts/release.sh` for the complete automated workflow:

```bash
./scripts/release.sh
```

The script provides an interactive menu:

```text
1) patch  - Bug fixes (v1.0.0 → v1.0.1)
2) minor  - New features (v1.0.0 → v1.1.0)
3) major  - Breaking changes (v1.0.0 → v2.0.0)
4) custom - Specify version manually
5) cancel - Abort release
```

The script automatically:

1. Runs quality checks (lint, tests, build)
2. Generates changelog from Conventional Commits
3. Updates `package.json` and `CHANGELOG.md`
4. Creates git commit and tags (v{version} and v{major})
5. Pushes to remote and creates GitHub Release

Release notes follow the standard format defined in `.github/RELEASE_TEMPLATE.md`.

`scripts/release.sh` requires an interactive terminal — it accepts no arguments or flags, and the version-type is chosen from its menu. Running it non-interactively fails at the pre-push confirmation prompt, leaving the commit and tag stuck locally. In a non-interactive session (this skill invoked by an agent), follow the "Manual / Command-Driven Release" workflow below instead.

### 3. Quality Metrics Collection

Both the script and the manual workflow collect and include:

- **Test count**: `pnpm vitest run 2>&1 | grep "Tests " | grep -oP '\d+ passed'`
- **ESLint status**: Verified via `pnpm lint`
- **TypeScript status**: Verified via type checking
- **Build status**: Verified via `pnpm build`
- **Contributors**: `git shortlog -s -n vPREV..HEAD | awk '{$1=""; name=substr($0,2); print "- " name " (@jey3dayo)"}'`

These metrics are included in the GitHub Release notes.

### 4. Release Notes Structure

Release notes are automatically generated following `.github/RELEASE_TEMPLATE.md`,
which is the single source of truth for the format. Do not duplicate the template
here — when manually editing release notes, read `.github/RELEASE_TEMPLATE.md` directly.

The `## 🚀 What's New` heading is always present regardless of change type; sub-headings with nothing to report are omitted. Classify `git log vPREV..HEAD --pretty=format:"%s"` commits into that heading's sections using the prefix → section mapping in `.github/RELEASE_TEMPLATE.md`; `scripts/release.sh`'s `generate_changelog` implements the same mapping.

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

## Manual / Command-Driven Release

Follow these steps when `scripts/release.sh` cannot be used (non-interactive session), or to run the release step by step.

### Step 1: Version Update

```bash
# Update package.json version
jq '.version = "1.8.1"' package.json > package.json.tmp
mv package.json.tmp package.json
```

Also update `CHANGELOG.md`: add a new entry at the top with the release date, generated from recent commits per the Changelog Generation Rules below.

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- feat: で始まるコミット

### Changed
- refactor: で始まるコミット

### Fixed
- fix: で始まるコミット

### Other
- その他のコミット

[X.Y.Z]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/vX.Y.Z
```

### Step 2: Quality Checks

Run all quality checks (skip only if explicitly told to, which is not recommended for a real release):

```bash
pnpm lint        # ESLint
pnpm type-check  # TypeScript
pnpm test        # Vitest
pnpm build       # ncc build
```

If any check fails, stop. Nothing has been changed yet, so no rollback is needed.

### Step 3: Create Commit and Tags

```bash
# Commit version change, changelog, and the built dist/ output
git add package.json CHANGELOG.md dist/
git commit -m "chore: release v1.8.1"

# Create version tag
git tag -a v1.8.1 -m "v1.8.1

<changelog content>"

# Update major version tag
git tag -f v1 v1.8.1^{}
```

If tag creation fails (e.g. duplicate tag), roll back the commit and restore `package.json` / `CHANGELOG.md` before retrying. To redo an existing tag, delete it first — remote tag deletion is hard to undo, so confirm the tag name before running it:

```bash
git tag -d v1.8.1 && git push origin :refs/tags/v1.8.1
```

### Step 4: Push Approval Gate

Before pushing, present the version, tags, and changes that will ship, and get explicit approval. This applies whether run via this skill or `scripts/release.sh` — both stop at the same point when push should be skipped (e.g. a `--no-push`-style manual run), so the release path used doesn't change the safety guarantee.

### Step 5: Push and Create Release

```bash
# Push changes
git push origin main
git push origin v1.8.1
git push origin v1 --force

# Create GitHub Release (notes follow .github/RELEASE_TEMPLATE.md)
gh release create v1.8.1 \
  --title "v1.8.1" \
  --notes "<release notes following RELEASE_TEMPLATE.md>"
```

If push fails, the commit and tag remain local. Either push manually (`git push origin main && git push origin v1.8.1 && git push origin v1 --force`) or roll back (`git reset --hard HEAD~1 && git tag -d v1.8.1 v1`).

### Step 6: Major Version Release Update (required, not optional)

Update the major-version tag's (v1, v2, ...) GitHub Release so it reflects the version it now points to:

```bash
gh release edit v1 \
  --title "v1 (Latest v1.x)" \
  --notes "<current version, summary of latest changes, @v1 usage note, recent version history>"
```

This step cannot be skipped: users referencing `@v1` in workflows get the latest v1.x automatically, and a stale v1 Release page describing an old version misleads them into thinking the wrong changes are live.

Generate the vX Release body in this standard format:

```
# Latest v1.x Release

This is a floating tag that always points to the latest v1.x release.

## Current Version: vX.Y.Z

For detailed release notes, see: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/vX.Y.Z

## Usage

```yaml
# Recommended: Use floating tag for automatic updates
- uses: jey3dayo/pr-insights-labeler@v1

# Or use specific version for stability
- uses: jey3dayo/pr-insights-labeler@vX.Y.Z
```

## What's New in vX.Y.Z

（最新バージョンの変更内容を簡潔に）

## Recent Versions

- [vX.Y.Z](URL) - YYYY-MM-DD
- [vX.Y.Z-1](URL) - YYYY-MM-DD
- [vX.Y.Z-2](URL) - YYYY-MM-DD

**Full Changelog**: <https://github.com/jey3dayo/pr-insights-labeler/compare/vPREV...vCURRENT>

```

### Step 7: Completion Report

Report the created tag, the GitHub Release URL, and what to check next (CI status, user announcement, etc).

### Step 8: Post-Release Verification

```bash
gh release view v1.8.1      # release was created
gh release view v1          # major-version release was updated
git tag -l "v*" | sort -V | tail -5
gh run list --branch main --limit 3
```

## Options

These apply to both the manual workflow and any agent-driven invocation of this skill:

- `--dry-run`: show what version bump, doc updates, commit, tags, push, and Release creation would happen, without changing anything.
- `--no-push`: run through commit and tag creation, then stop (skip Step 5 onward). Push manually later.
- `--skip-checks`: skip Step 2's quality checks. Not recommended for a production release.
- `--force`: delete and recreate the version tag and force-push it, instead of failing on a duplicate tag.

## Changelog Generation Rules

The script follows Conventional Commits for changelog categorization. The
commit prefix → section mapping is defined in `.github/RELEASE_TEMPLATE.md`
(`### 🚀 What's New` section), which is the source of truth; it is not
duplicated here.

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

The script automatically updates major version tags; the manual workflow's Step 6 covers the same requirement.

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

### Key features

- Interactive release type selection
- Automatic quality checks
- Changelog generation from git commits
- Breaking changes detection
- Contributors list generation
- GitHub Release creation

### .github/RELEASE_TEMPLATE.md

Standard release notes template defining the format and structure, including
section guidelines, emoji conventions, and PR reference requirements.

**Load this reference when editing release notes manually** to ensure consistency with project standards.

### docs/ja/release-process.md

Manual release procedure walkthrough (Japanese).
