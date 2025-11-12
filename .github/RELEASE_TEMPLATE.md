# Release Notes Template

This template defines the standard format for pr-labeler release notes. It is automatically used by `scripts/release.sh` when creating new releases.

## Standard Format

```markdown
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

### 🗑️ Removed
- Removed feature 1 (if applicable)

## 📊 Quality Metrics

- ✅ [N] tests passing
- ✅ 0 ESLint errors/warnings
- ✅ 0 TypeScript type errors
- ✅ Build successful

## 🔗 Full Changelog

**Full Changelog**: https://github.com/jey3dayo/pr-insights-labeler/compare/v[PREVIOUS]...v[CURRENT]
```

## Section Guidelines

### 🚀 What's New

Main section containing all changes, organized by type.

**Subsections (use as needed):**

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

### 🔗 Full Changelog

Link to GitHub's compare view showing all commits between releases.

## Emoji Guide

| Emoji | Meaning    | Usage                |
| ----- | ---------- | -------------------- |
| 🚀    | What's New | Main changes section |
| ✨    | Added      | New features         |
| 🔄    | Changed    | Modifications        |
| 🐛    | Fixed      | Bug fixes            |
| 🗑️    | Removed    | Deprecated features  |
| 📊    | Metrics    | Quality metrics      |
| 🔗    | Links      | External references  |
| ⚠️    | Warning    | Breaking changes     |
| 🎯    | Focus      | Key highlights       |

## Writing Tips

### 1. Be Specific

❌ "Improved performance"
✅ "Reduced CI status fetch time by 40% using parallel requests"

### 2. User-Focused

❌ "Refactored config transformer"
✅ "Simplified configuration validation with better error messages"

### 3. Link to PRs (Optional)

```markdown
- Enhanced risk assessment documentation (#84)
- Fixed undefined CI status error (#79)
```

### 4. Highlight Breaking Changes

```markdown
### ⚠️ Breaking Changes

- Changed default label prefix from `auto:` to `auto/`
  - Migration: Update workflow files to use `auto/too-many-lines` instead of `auto:too-many-lines`
```

## Example Release Notes

See [v1.5.0](https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.5.0) for a complete example following this template.

## Automation

The `scripts/release.sh` script automatically:

1. Generates changelog from git commits (Conventional Commits format)
2. Runs quality checks and captures metrics
3. Creates release notes following this template
4. Publishes to GitHub Releases

For manual releases, copy the template above and fill in the details.
