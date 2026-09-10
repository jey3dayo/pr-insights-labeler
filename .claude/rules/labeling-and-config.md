---
paths:
  - "action.yml"
  - ".github/pr-labeler.yml"
  - "docs/en/labeling-rules.md"
  - "docs/ja/labeling-rules.md"
  - "docs/en/categories.md"
  - "docs/en/configuration.md"
  - "docs/en/advanced-usage.md"
---

# Labeling & Configuration Rules

## 目的と範囲

- PR Insights Labelerのラベル付与・設定ポリシーとデフォルト値を明示する。

## ラベルファミリー

- size: 追加行数ベース。デフォルト閾値 small<200, medium<500, large<1000, xlarge<3000, xxlarge>=3000（`size_thresholds`で変更可）。
- category: パスベース。主なマッピング  
  - tests: `__tests__/**`, `**/*.test.ts?(x)`  
  - ci-cd: `.github/workflows/**`  
  - documentation: `docs/**`, `**/*.md`（spec配下除外）  
  - config: `**/*.config.*`, `**/tsconfig.json`, `**/.eslintrc*`, `**/.prettierrc*`, `**/mise.toml`, `**/action.y?(a)ml`  
  - spec: `.kiro/**`, `.specify/**`, `spec/**`, `specs/**`  
  - dependencies: `**/package.json`, lockfiles  
  - feature: `src/features/**`, `src/components/**`  
  - infrastructure: `.github/**`, `Dockerfile`, `terraform/**`  
  - security: `**/auth*/**`, `.env*`, `secrets/**`
- risk: CI失敗や設定ファイル変更で`risk/medium`以上、CI失敗やテスト欠如の`feat`系で`risk/high`。
- complexity: デフォルトOFF（`complexity_enabled`でON）。閾値 medium>=15, high>=30（ESLint complexity）。
- policy violations (`auto/*`): `auto/large-files`, `auto/too-many-files`, `auto/too-many-lines`, `auto/excessive-changes` など。`fail_on_*`でワークフロー失敗制御可。

## 入力とデフォルト

- `enable_summary: true`（GH Actions Summary出力は維持）。  
- 選択的有効化: `size_enabled=true`, `category_enabled=true`, `risk_enabled=true`, `complexity_enabled=false`（デフォルト）。  
- `directory_labeler`はデフォルトON。設定ファイルは`.github/directory-labeler.yml`、`max_labels`デフォルト10。  
- ラベル自動作成は常時有効（color/description入力は廃止）。`pull-requests: write`権限を必須とする。

## YAML設定/パス依存

- `.github/pr-labeler.yml`のパスラベルはdocs/en/categories.mdの表と同期させる。変更時は英日両方のドキュメントを更新する。
- パターン追加時は`category_enabled`がtrueであることを確認し、`path_labels`に追記する。

## 失敗ポリシー

- 厳格運用時: `fail_on_large_files=true`, `fail_on_too_many_files=true`, `fail_on_pr_size=<threshold>`を組み合わせる。`fail_on_pr_size`利用時は`size_enabled=true`が必須。
- リスク許容度に応じ、summary-onlyモードでは`comment_on_pr=never`かつ`enable_summary=true`とする。

## セキュリティ配慮（fork/PR）

- `pull_request_target`利用時はPRのhead SHAでcheckoutし、秘密情報の書き込みを行わない。必要権限は最小限（pull-requests/issues: write, contents: read）。
