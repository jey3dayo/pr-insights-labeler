# 実装計画

## 実装タスク

- [ ] 1. 新カテゴリをデフォルト設定に追加
- [ ] 1.1 category/featureの定義を追加
  - 新機能を示すカテゴリを定義
  - パターン: src/features/**, features/**, src/components/**
  - テストファイルを除外するexcludeパターンを設定
  - 多言語表示名（Feature / 新機能）を追加
  - _Requirements: 2.1, 2.2, 2.6, 3.2_

- [ ] 1.2 category/infrastructureの定義を追加
  - インフラ・DevOps変更を示すカテゴリを定義
  - パターン: .github/**, Dockerfile*, terraform/**, k8s/**, 等
  - 多言語表示名（Infrastructure / インフラ）を追加
  - _Requirements: 2.3, 2.4, 2.6, 3.3_

- [ ] 1.3 category/securityの定義を追加
  - セキュリティ関連変更を示すカテゴリを定義
  - パターン: `**/auth*/**`, `**/*jwt*.ts`, `.env*`, `secrets/**`, 等
  - 多言語表示名（Security / セキュリティ）を追加
  - _Requirements: 2.5, 2.6, 3.4_

- [ ] 2. カテゴリ検出ロジックのテストを追加
- [ ] 2.1 category/featureのテストケースを実装
  - src/features/auth.ts → category/featureを適用するテスト
  - src/components/Button.tsx → category/featureを適用するテスト
  - src/components/Button.test.tsx → category/testsを適用（category/featureは適用しない）するテスト
  - excludeパターンが正常に機能することを検証
  - _Requirements: 5.1, 7.3_

- [ ] 2.2 category/infrastructureのテストケースを実装
  - .github/workflows/ci.yml → category/infrastructureを適用するテスト
  - Dockerfile → category/infrastructureを適用するテスト
  - terraform/main.tf → category/infrastructureを適用するテスト
  - k8s/deployment.yaml → category/infrastructureを適用するテスト
  - _Requirements: 5.2, 7.2_

- [ ] 2.3 category/securityのテストケースを実装
  - src/lib/auth/middleware.ts → category/securityを適用するテスト
  - src/utils/jwt.ts → category/securityを適用するテスト
  - .env.local → category/securityを適用するテスト
  - secrets/api-keys.json → category/securityを適用するテスト
  - _Requirements: 5.3_

- [ ] 2.4 既存カテゴリとの統合テストを実装
  - 複数カテゴリの同時適用が正常に動作することを検証
  - 既存6カテゴリの動作に影響がないことを確認
  - 加法的ポリシーが維持されることを検証
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 3. カテゴリ専用ドキュメントを作成
- [ ] 3.1 docs/en/categories.mdの基本構造を作成
  - カテゴリラベルの概要セクションを作成
  - デフォルトカテゴリ一覧テーブル（9種類）を作成
  - 各カテゴリごとの詳細説明セクションを作成
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 3.2 カテゴリの詳細情報を追加
  - 各カテゴリの検出対象、パターン、用途、適用例を記述
  - 多言語表示名（英語/日本語）を記載
  - カスタムカテゴリの作成方法をYAMLコード例付きで説明
  - 複数カテゴリ適用時の動作（加法的ポリシー）を説明
  - _Requirements: 1.3, 1.4, 1.5, 1.6_

- [ ] 4. 既存ドキュメントからの相互参照を整備
- [ ] 4.1 README.mdとREADME.ja.mdに相互参照リンクを追加
  - カテゴリラベルセクション（L115-126付近）にdocs/en/categories.mdへのリンクを追加
  - 日本語版READMEには日本語説明付きリンクを追加
  - _Requirements: 4.1, 4.2, 4.5_

- [ ] 4.2 docs/en/configuration.mdに相互参照リンクを追加
  - カテゴリ設定セクション（L358付近）にdocs/en/categories.mdへのリンクを追加
  - _Requirements: 4.3, 4.5_

- [ ] 4.3 docs/en/advanced-usage.mdに相互参照リンクを追加
  - カスタムカテゴリセクション（L320付近）にdocs/en/categories.mdへのリンクを追加
  - _Requirements: 4.4, 4.5_

- [ ] 5. 品質保証とドキュメント検証
- [ ] 5.1 TypeScript型チェックとESLintチェックを実行
  - pnpm type-checkで型エラー0件を確認
  - pnpm lintでリンター違反0件を確認
  - 既存の型定義（CategoryConfig）に準拠していることを確認
  - _Requirements: 3.1, 3.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5.2 テストカバレッジの検証
  - pnpm test:vitestで全テスト成功を確認
  - pnpm test:coverageでカバレッジ93%以上を確認
  - 新カテゴリのテストが正常に実行されることを確認
  - _Requirements: 5.4, 5.5, 5.6_

- [ ] 5.3 ドキュメントリンク検証
  - markdown-link-checkでdocs/en/categories.mdのリンク切れがないことを確認
  - README.md、configuration.md、advanced-usage.mdからのリンクが正確であることを確認
  - マークダウン記法がGitHub Flavored Markdown（GFM）に準拠していることを確認
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. 統合確認とビルド検証
- [ ] 6.1 全品質チェックを実行
  - pnpm check:all（lint + type-check + test）を実行
  - pnpm buildでビルド成功を確認
  - 既存機能に影響がないことを確認
  - _Requirements: 7.1, 7.2, 7.5, 8.1, 8.5_

- [ ] 6.2 CIパイプラインの事前確認
  - ローカルで全品質チェックが成功することを確認
  - ドキュメント品質チェックが成功することを確認
  - 実装がステアリングドキュメント（structure.md、tech.md、product.md）に準拠していることを確認
  - _Requirements: 全要件_
