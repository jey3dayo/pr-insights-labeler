# Documentation Index

**対象**: 利用者・メンテナー
**タグ**: `category/documentation`, `audience/user`, `audience/maintainer`

This index organizes project documentation by audience (Users / Maintainers). Each entry links to every language the document exists in.

## For Users

Documentation for people configuring or using the PR Insights Labeler GitHub Action.

| Document                       | Languages                                                   | Description                                              |
| ------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------- |
| Configuration Guide            | [EN](./en/configuration.md)                                 | All configuration options and defaults.                  |
| Advanced Usage Guide           | [EN](./en/advanced-usage.md) / [JA](./ja/advanced-usage.md) | Advanced workflows and customization examples.           |
| Labeling Rules Quick Reference | [EN](./en/labeling-rules.md) / [JA](./ja/labeling-rules.md) | Quick reference for size/complexity/category/risk rules. |
| Category Labels                | [EN](./en/categories.md)                                    | Category label definitions and matching rules.           |
| Troubleshooting Guide          | [EN](./en/troubleshooting.md)                               | Common issues and how to resolve them.                   |

## For Maintainers

Documentation for people maintaining, releasing, or extending this repository. Maintainer docs are Japanese-only.

| Document                                                                 | Languages | Description                                     |
| ------------------------------------------------------------------------ | --------- | ----------------------------------------------- |
| [API仕様書](./ja/API.md)                                                 | `JA`      | Internal API specification.                     |
| [リリース手順](./ja/release-process.md)                                  | `JA`      | Release process and versioning steps.           |
| [GitHub Actions Marketplace リリースガイド](./ja/marketplace-release.md) | `JA`      | Marketplace publishing steps.                   |
| [エラーファクトリーi18n移行ガイド](./ja/i18n-error-migration-guide.md)   | `JA`      | Migration guide for the i18n error factory.     |
| [ドキュメント管理ガイドライン](./ja/documentation-guidelines.md)         | `JA`      | Documentation metadata, tags, and update rules. |

Shared images live in [`docs/assets/`](./assets/).

## Canonical Language Policy

- **User-facing documentation** is canonical in English (`docs/en/`). Rationale: this GitHub Action's users are predominantly English-speaking. Japanese versions, where they exist, follow the English source.
- **Maintainer-facing documentation** may exist in Japanese only; there is no obligation to translate it.

## Translation Gaps

The following user-facing documents exist only in English. Japanese translations are not required by the policy above.

| Document              | English | Japanese |
| --------------------- | ------- | -------- |
| Configuration Guide   | ✅      | 未翻訳   |
| Category Labels       | ✅      | 未翻訳   |
| Troubleshooting Guide | ✅      | 未翻訳   |
