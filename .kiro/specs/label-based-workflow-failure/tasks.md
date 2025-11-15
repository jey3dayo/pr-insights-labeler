# 実装計画

## 概要

Label-Based Workflow Failure Control機能の実装タスク。現在の`fail_on_violation`を非推奨化し、ラベルベースの個別失敗制御を実現する。後方互換性を維持しつつ、段階的な移行を可能にする。

---

- [ ] 1. GitHub Actions入力定義の拡張
  - action.ymlに3つの新規input（`fail_on_large_files`、`fail_on_too_many_files`、`fail_on_pr_size`）を追加
  - 各inputのデフォルト値を空文字列("")に設定し、明示的な指定と未指定を区別可能にする
  - `fail_on_violation`に非推奨の旨を明記し、移行先を示す
  - input descriptionで各パラメータの用途と有効な値を明確に記述
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. 入力型定義の更新と検証ロジックの実装
- [ ] 2.1 ActionInputsインターフェースの拡張
  - `ActionInputs`インターフェース（src/actions-io.ts）に3つの新規フィールドを追加
  - 既存の`fail_on_violation`フィールドを維持
  - `getActionInputs`関数で新規inputを取得するロジックを追加
  - 型定義コメントで明示的な指定可能な値（"" | "true" | "false"等）を記載
  - _Requirements: 1.5, 2.5_

- [ ] 2.2 Configインターフェースの拡張
  - `Config`インターフェース（src/input-mapper.ts）に`failOnLargeFiles: boolean`、`failOnTooManyFiles: boolean`、`failOnPrSize: string`を追加
  - 互換モード用の`legacyFailOnViolation: boolean`フィールドを追加
  - 既存のConfig構造を壊さずに新規フィールドを統合
  - _Requirements: 2.1, 2.2, 2.3, 2.6_

- [ ] 2.3 入力検証とマッピングロジックの実装
  - `mapActionInputsToConfig`関数で明示的な指定判定ロジックを実装（空文字列チェック）
  - 新規inputと`fail_on_violation`の優先順位制御ロジックを実装（新規input優先）
  - `fail_on_pr_size`の有効値バリデーション（"", "small", "medium", "large", "xlarge", "xxlarge"）
  - `size_enabled`依存チェック（`fail_on_pr_size`指定時に`size_enabled: false`ならConfigurationError）
  - 互換モード時の値マッピング（`fail_on_violation: true` → `failOnLargeFiles: true`, `failOnTooManyFiles: true`, `failOnPrSize: "large"`）
  - _Requirements: 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.6_

- [x] 3. ラベルベース失敗判定ロジックの実装
- [x] 3.1 ラベル一覧取得関数の実装
  - PRに適用されているラベル一覧を取得する`getCurrentPRLabels`関数を実装
  - GitHub REST API（`octokit.rest.issues.listLabelsOnIssue`）を使用
  - ラベル取得失敗時のGraceful Degradation（undefinedを返し、violationsで判定継続）
  - Railway-Oriented Programming（`Result<string[], GitHubAPIError>`）を採用
  - _Requirements: 3.1, 3.8_

- [x] 3.2 失敗条件評価関数の実装
  - `evaluateFailureConditions`関数を新規作成
  - 入力: Config、appliedLabels（string[] | undefined）、violations、metrics、sizeThresholds
  - 各失敗条件の判定ロジック（large files、too many files、per-file行数、PR追加行数、PR size）を実装
  - ラベルとviolationsの両方をOR条件でチェック（いずれか一方でも該当すれば失敗）
  - 重複検出用のfailureKeysセット（`Set<string>`）を使用し、**同じ失敗理由の重複のみを防ぐ**（異なる理由は両方とも追加）
  - i18n対応: キーで重複判定を行い、翻訳済み文字列の比較を避ける
  - 各違反理由（largeFiles、tooManyFiles、tooManyLines、excessiveChanges、prSize）は独立して追加される
  - サイズ比較のためのヘルパー関数`compareSizeThreshold`と`calculateSizeCategory`を実装
  - _Requirements: 3.2, 3.3, 3.4, 3.8_

- [x] 3.3 失敗メッセージ結合とワークフロー制御の統合
  - 失敗リストが空でない場合に`core.setFailed(failures.join(', '))`を呼び出すロジックを実装
  - 既存の`hasViolations && config.failOnViolation`判定を新しい`evaluateFailureConditions`ベースのロジックに置き換え
  - index.ts（run関数）のStep 10失敗判定セクションを更新
  - 互換モード時の挙動が既存ユーザーと一致することを保証
  - _Requirements: 3.5, 3.6, 3.7_

- [x] 4. サイズ比較ユーティリティの実装
- [x] 4.1 サイズ順序定義とcompareSizeThreshold関数
  - サイズ順序定数`SIZE_ORDER`を定義（small < medium < large < xlarge < xxlarge）
  - `compareSizeThreshold`関数を実装（actualSize >= threshold判定）
  - "size/"プレフィックスの除去ロジック
  - 無効なサイズ値の処理（false返却またはエラーログ）
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.2 サイズカテゴリ算出関数の実装
  - `calculateSizeCategory`関数を実装（totalAdditions → "size/small" | "size/medium" | ...）
  - SizeThresholds設定を用いた閾値比較
  - デフォルト閾値（small: 200, medium: 500, large: 1000, xlarge: 3000）を考慮
  - _Requirements: 4.1, 4.5_

- [x] 5. 多言語対応とエラーメッセージの整備
- [x] 5.1 i18nメッセージキーの追加
  - `src/locales/en/logs.json`に新規メッセージキーを追加（failures: largeFiles, tooManyFiles, tooManyLines, excessiveChanges, prSize、deprecation: failOnViolation、errors: invalidFailOnPrSize, failOnPrSizeRequiresSizeEnabled）
  - `src/locales/ja/logs.json`に日本語翻訳を追加
  - 既存のi18n関数（`t`、`logWarningI18n`）を活用
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5.2 非推奨警告の実装
  - `fail_on_violation`使用時に非推奨警告を出力する`logWarningI18n('deprecation.failOnViolation')`を実装
  - mapActionInputsToConfig関数内の互換モード判定時に警告を挿入
  - 警告メッセージに移行先input（`fail_on_large_files`、`fail_on_too_many_files`、`fail_on_pr_size`）を明記
  - _Requirements: 1.4, 5.3_

- [ ] 6. 包括的なテストの実装
- [ ] 6.1 入力検証とマッピングのユニットテスト
  - `__tests__/input-mapper.test.ts`に新規テストケースを追加
  - 明示的な指定判定のテスト（空文字列vs "true"/"false"）
  - 優先順位制御のテスト（新規input優先、互換モード）
  - `fail_on_pr_size`バリデーションテスト（有効値/無効値）
  - `size_enabled`依存チェックのテスト
  - _Requirements: 6.2_

- [ ] 6.2 失敗判定ロジックのユニットテスト
  - `__tests__/index.test.ts`または新規テストファイルに失敗判定テストを追加
  - 各フラグ（large_files、too_many_files、pr_size）の個別動作テスト
  - ラベルとviolationsのOR条件テスト
  - 複数の失敗条件が同時に発生した場合のテスト
  - 失敗メッセージの結合形式テスト
  - _Requirements: 6.3_

- [ ] 6.3 サイズ比較ロジックのユニットテスト
  - `__tests__/size-comparison.test.ts`（新規）またはヘルパー関数テストを作成
  - 各サイズの境界値テスト
  - プレフィックス除去のテスト
  - 無効なサイズ値の処理テスト
  - _Requirements: 6.4_

- [ ] 6.4 互換モードの統合テスト
  - `__tests__/integration.test.ts`に互換モードシナリオを追加
  - `fail_on_violation: true`の挙動が既存と一致することを検証
  - 新規inputと`fail_on_violation`の併用時の優先順位テスト
  - ラベル適用後の失敗判定フローのエンドツーエンドテスト
  - _Requirements: 6.5, 6.6_

- [ ] 6.5 i18n対応のテスト
  - 英語/日本語ロケールでの失敗メッセージ生成テスト
  - 非推奨警告メッセージの多言語出力テスト
  - _Requirements: 5.4, 6.5_

- [ ] 7. ドキュメントの更新
- [ ] 7.1 README.mdの更新
  - 新規input 3つの説明セクションを追加
  - 4つのユースケースパターンの例を記載（パターン1: large files厳格、パターン2: too many files厳格、パターン3: PR size厳格、パターン4: 組み合わせ）
  - `fail_on_violation`が非推奨になった旨と移行ガイドを記載
  - _Requirements: 7.2_

- [ ] 7.2 docs/API.mdの更新
  - Input定義セクションに新規input 3つを追加
  - `fail_on_violation`の非推奨化と互換動作を明記
  - バリデーションルール（`fail_on_pr_size`の有効値、`size_enabled`依存）を記載
  - _Requirements: 7.3_

- [ ] 7.3 CHANGELOG.mdの更新
  - 新機能の追加（Added）セクションに新規inputを記載
  - `fail_on_violation`の非推奨化（Deprecated）セクションを追加
  - 互換モードの説明と移行ステップへのリンクを記載
  - _Requirements: 7.4_

- [x] 8. 品質保証と最終確認
- [x] 8.1 lint・type-check・buildの実行
  - `pnpm lint`でESLintエラー0件を確認
  - `pnpm type-check`で型エラー0件を確認
  - `pnpm build`でビルド成功を確認
  - dist/index.jsが正しく生成されることを確認
  - _Requirements: すべての要件に対する技術的品質保証_

- [x] 8.2 全テストの実行とカバレッジ確認
  - `pnpm test:vitest`で全テスト成功を確認
  - `pnpm test:coverage`でカバレッジ90%以上を確認
  - 新規追加コードがテストでカバーされていることを確認
  - _Requirements: 6.1-6.6_

- [ ] 8.3 統合テストの実行
  - 実際のPRに対して新しいinputを使用した動作テストを実行
  - ラベル付与→失敗判定のフロー全体が正しく動作することを確認
  - 互換モード（`fail_on_violation: true`）が既存と同じ結果を返すことを確認
  - _Requirements: 6.5_

---

## タスク完了基準

すべてのタスクが完了し、以下の基準を満たすこと:

1. **機能完全性**: 全10要件カテゴリの60以上のAcceptance Criteriaが実装されている
2. **テストカバレッジ**: 新規コードのカバレッジが90%以上
3. **品質チェック**: lint/type-check/buildがすべて成功
4. **後方互換性**: 既存ユーザーの`fail_on_violation`が正しく動作
5. **ドキュメント**: README、API.md、CHANGELOGが更新されている
