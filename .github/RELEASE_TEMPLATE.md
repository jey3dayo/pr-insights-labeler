# Release Notes Template

This template defines the standard format for PR Insights Labeler release notes. It is automatically used by `scripts/release.sh` when creating new releases.

## Standard Format

```markdown
## ⚠️ Breaking Changes (if applicable)

- Breaking change description (#PR)
  - **Migration Guide**: Step-by-step instructions for existing users
  - **Affected**: Which features are impacted
  - **Action Required**: What users need to do

## 🚀 What's New

### ✨ Added
- New feature 1
- New feature 2

### 🔄 Changed
- Changed behavior 1
- Changed behavior 2

### 🐛 Fixed
- Bug fix 1
- Bug fix 2

### 🗑️ Removed (if applicable)
- Removed feature 1

## 📊 Quality Metrics

- ✅ [N] tests passing (e.g., Vitest: 796 tests)
- ✅ 0 ESLint errors/warnings
- ✅ 0 TypeScript type errors
- ✅ Build successful

## 👥 Contributors

This release was made possible by:
- @contributor1
- @contributor2

## 🔗 Full Changelog

**Full Changelog**: https://github.com/jey3dayo/pr-insights-labeler/compare/v[PREVIOUS]...v[CURRENT]
```

## Section Guidelines

### ⚠️ Breaking Changes

### Critical changes that may affect existing users

Include this section when:

- API changes that break backward compatibility
- Configuration format changes
- Deprecated features removed
- Behavior changes that require user action

### Required information

- Clear description of what changed
- Migration guide with step-by-step instructions
- Which features/workflows are affected
- Action required from users

### 🚀 What's New

Main section containing all changes, organized by type.

This template is the source of truth for how a commit's Conventional Commits
prefix maps to a release-notes subsection. `scripts/release.sh` and
`.claude/commands/release.md` follow this table; do not duplicate it
elsewhere.

| Commit prefix | Section |
| --- | --- |
| `feat:` / `feat(...)` | `### ✨ Added` |
| `fix:` / `fix(...)` | `### 🐛 Fixed` |
| Everything else (`chore:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `build:`, `ci:`, and no prefix) | `### 🔄 Changed` |

Breaking changes are detected separately (see `⚠️ Breaking Changes` above)
and are not covered by this table.

### Subsections (use as needed)

- **✨ Added**: New features, capabilities, or enhancements
- **🔄 Changed**: Modifications to existing functionality
- **🐛 Fixed**: Bug fixes and error corrections
- **🗑️ Removed**: Deprecated or removed features (breaking changes)

### 📊 Quality Metrics

Automated quality assurance results. Include:

- Total test count
- Linting status
- Type checking status
- Build status

### 👥 Contributors

List of contributors for this release. Automatically generated from git commits.

### Auto-generated content

- Extracted using `git shortlog -s -n`
- Ordered by number of commits (descending)
- GitHub usernames with @ prefix

### 🔗 Full Changelog

Link to GitHub's compare view showing all commits between releases.

## Emoji Guide

| Emoji | Meaning | Usage |
| ----- | ---------------- | ----------------------------- |
| ⚠️ | Breaking Changes | Critical compatibility issues |
| 🚀 | What's New | Main changes section |
| ✨ | Added | New features |
| 🔄 | Changed | Modifications |
| 🐛 | Fixed | Bug fixes |
| 🗑️ | Removed | Deprecated features |
| 📊 | Metrics | Quality metrics |
| 🔗 | Links | External references |
| 🎯 | Focus | Key highlights |

## Writing Tips

### 1. Be Specific

❌ "Improved performance"
✅ "Reduced CI status fetch time by 40% using parallel requests"

### 2. User-Focused

❌ "Refactored config transformer"
✅ "Simplified configuration validation with better error messages"

### 3. Link to PRs (Required)

### Always include PR references for traceability

```markdown
- Enhanced risk assessment documentation (#84)
- Fixed undefined CI status error (#79)
- Add snapshot exclusion patterns (#90)
```

### Why PR links are required

- Enables users to see the full context of changes
- Provides access to discussions and decisions
- Helps with troubleshooting and understanding impact
- Automatically extracted by `scripts/release.sh` from commit messages

### 4. Highlight Breaking Changes

```markdown
### ⚠️ Breaking Changes

- Changed default label prefix from `auto:` to `auto/`
  - Migration: Update workflow files to use `auto/too-many-lines` instead of `auto:too-many-lines`
```

## Example Release Notes

See [v1.8.1](https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.8.1) for a complete example following this template.

## Automation

The `scripts/release.sh` script automatically:

1. Generates changelog from git commits (Conventional Commits format)
2. Runs quality checks and captures metrics
3. Creates release notes following this template
4. Publishes to GitHub Releases

For manual releases, copy the template above and fill in the details.
