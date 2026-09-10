---
paths:
  - ".github/workflows/**"
  - "action.yml"
  - "docs/ja/release-process.md"
  - ".claude/commands/release.md"
  - "CHANGELOG.md"
---

# Workflows & Release Rules

## 目的と範囲

- ブランチ/PRルール、CI必須項目、リリース手順のガードレールを定義する。

## PR/ブランチ運用

- 実装後は `pnpm lint && pnpm type-check && pnpm test && pnpm build` をローカルで成功させてからプッシュする。
- すべてのCIチェック（Code Quality, Integration Tests (Node 22 / 24), Documentation Quality, PR Insights Labeler Self-Check, Quality Gate）が通るまでマージしない。
- PRはテンプレートに従い、変更内容を要約する。レビュー承認を取得してからマージする。

## リリース

- 推奨: `/release <patch|minor|major>` で自動化。  
- 手動リリース時もセマンティックバージョニングを守り、タグ `vX.Y.Z` とメジャーの可変タグ `vX` を更新する。CHANGELOGを同期し、GitHub Releaseを作成する。
- Marketplace公開は docs/ja/marketplace-release.md に従う。権限設定の誤りは公開後に外から気付けないため、公開前に確認する。

## Summary出力

- GitHub Actions Summary出力（`enable_summary: true`）は必須。PR分析結果をSummaryに載せる仕様を維持する。
