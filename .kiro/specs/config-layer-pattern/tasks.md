# 実装計画

## 概要

Configuration Layer Pattern の実装により、PR Insights Labeler の設定管理を統一し、保守性とテスト容易性を向上させます。

## 実装タスク

- [x] 1. Environment Layer の実装
- [x] 1.1 環境変数読み込み機能の実装
  - 環境変数から設定を読み込む関数を作成
  - LANGUAGE または LANG 環境変数を優先順位に従って読み込む
  - GITHUB_TOKEN または GH_TOKEN 環境変数を優先順位に従って読み込む
  - 未設定の場合は undefined を返す
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.2 環境変数読み込み機能のテスト作成
  - LANGUAGE 環境変数が正しく読み込まれることを確認
  - LANGUAGE が LANG より優先されることを確認
  - 環境変数が未設定の場合に undefined が返されることを確認
  - GITHUB_TOKEN の読み込みをテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Input Parser Layer の実装
- [x] 2.1 Action inputs のパース・バリデーション機能の実装
  - 全ての action input を型安全な ParsedInputs に変換する関数を作成
  - 空文字列を undefined に変換する（language input）
  - GitHub token の必須チェックを実装
  - サイズ文字列（"100KB"）を数値に変換
  - _Requirements: 10.1, 10.2, 10.5, 10.7_

- [x] 2.2 既存の mapActionInputsToConfig ロジックの移植
  - JSON パースと単調性検証（small < medium < large）を実装
  - Boolean input の strict validation を実装
  - サイズ閾値のパースとバリデーションを実装
  - 複雑度閾値のパースとバリデーションを実装
  - エラーを Result<T, E> で返す
  - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 2.3 Input parser のテスト作成
  - 全ての input が正しくパースされることを確認
  - 不正なサイズ閾値でエラーが返されることを確認
  - 空文字列が undefined に変換されることを確認
  - Boolean input の strict validation をテスト
  - JSON パースエラーのハンドリングをテスト
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 3. Config Builder Layer の実装
- [x] 3.1 設定統合と優先順位解決機能の実装
  - ParsedInputs、LabelerConfig、EnvironmentConfig を統合する関数を作成
  - 優先順位（action input > labeler config > env > default）に従って設定を解決
  - CompleteConfig オブジェクトを構築
  - デバッグログで各ソースの値と最終決定値を出力
  - 設定値の由来（ConfigSource）を追跡可能にする
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4_

- [x] 3.2 言語コード正規化機能の実装
  - ロケール形式（'ja-JP', 'en-US'）を言語コード（'ja', 'en'）に正規化
  - 不正な言語コードの場合は警告ログを出力し、デフォルト値にフォールバック
  - 全ての設定ソース（action input, labeler config, environment）に正規化を適用
  - _Requirements: 3.4, 3.5, 3.6, 3.7_

- [x] 3.3 Config builder のテスト作成
  - Action input が labeler config より優先されることを確認
  - Labeler config が environment より優先されることを確認
  - Environment が使用されることを確認
  - 全てが未設定の場合にデフォルト値が使用されることを確認
  - 言語コードの正規化が全ソースで動作することを確認
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. i18n モジュールのリファクタリング
- [x] 4.1 i18n 初期化のシグネチャ変更
  - initializeI18n の引数を Config から LanguageCode に変更
  - 言語コードのみを受け取るようにリファクタリング
  - デバッグログで受け取った言語コードを出力
  - Result<void, ConfigurationError> でエラーハンドリング
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.2 determineLanguage 関数の削除
  - determineLanguage 関数を削除
  - process.env への直接参照を削除
  - 言語決定ロジックを Config Builder に統合
  - _Requirements: 3.1, 3.2, 3.3, 4.1_

- [x] 4.3 i18n テストの更新
  - 新しいシグネチャ initializeI18n(language: LanguageCode) をテスト
  - 英語で初期化されることを確認
  - 日本語で初期化されることを確認
  - エラーハンドリングをテスト
  - _Requirements: 4.1, 4.2, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. action.yml の修正
- [x] 5.1 language input の default 削除
  - action.yml から language input の default: "en" を削除
  - 未設定の場合は空文字列が返されることを確認
  - 優先順位チェーンが正しく機能することを確認
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6. LabelerConfig の型定義修正
- [x] 6.1 LabelerConfig.language の型を string に変更
  - LabelerConfig.language の型を 'en' | 'ja' から string | undefined に変更
  - ロケール形式（'ja-JP', 'en-US'）を許容
  - 正規化フローで最終的に LanguageCode に収束することを確認
  - _Requirements: 3.7_

- [x] 7. メインエントリーポイントの統合
- [x] 7.1 新しい設定フローの採用
  - index.ts で parseActionInputs を呼び出す
  - パースエラー時は即座に失敗させる
  - loadEnvironmentConfig で環境変数を読み込む
  - loadConfig で pr-labeler.yml を読み込む
  - buildCompleteConfig で設定を統合
  - initializeI18n に言語コードのみを渡す
  - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8, 4.1, 4.2_

- [x] 7.2 mapActionInputsToConfig の削除
  - input-mapper.ts から mapActionInputsToConfig を削除 (保留: 既存コードとの互換性のため残す)
  - 既存の呼び出し箇所を parseActionInputs に置き換え
  - Config インターフェースを CompleteConfig に統合または型エイリアスを作成
  - _Requirements: 2.1, 2.2, 10.1, 10.6_

- [x] 7.3 統合テストの作成
  - 優先順位チェーン全体のテストを作成
  - Action input > labeler config > env の優先順位を確認
  - 言語設定バグが修正されていることを確認（LANGUAGE=ja が動作）
  - エンドツーエンドの設定フローをテスト
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. 品質保証とドキュメント
- [x] 8.1 全テストの実行と修正
  - 全ての既存テストが成功することを確認
  - 新しいテストが全て成功することを確認
  - テストの失敗があれば修正
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8.2 カバレッジ確認（93%以上）
  - テストカバレッジレポートを生成
  - 93%以上のカバレッジを確認
  - カバレッジが不足している箇所を特定し、テストを追加
  - _Requirements: 6.2_

- [x] 8.3 lint/type-check の実行
  - pnpm lint がエラーなしで完了することを確認
  - pnpm type-check がエラーなしで完了することを確認
  - pnpm build が成功することを確認
  - any 型や型アサーションが使用されていないことを確認
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## 完了条件

- ✅ 全てのテストが成功する
- ✅ テストカバレッジが93%以上
- ✅ TypeScript strict mode でコンパイルエラーがない
- ✅ ESLint エラーがない
- ✅ ビルドが成功する
- ✅ 言語設定バグが修正される（LANGUAGE=ja が正しく動作）

## 実装の注意点

1. **TDD アプローチ**: 各タスクで RED → GREEN → REFACTOR のサイクルを遵守
2. **段階的な移行**: 既存機能を壊さないよう、段階的に実装
3. **型安全性**: TypeScript strict mode を遵守し、any 型を禁止
4. **エラーハンドリング**: Result<T, E> パターンを一貫して使用
5. **テスト容易性**: 依存注入により各レイヤーを独立してテスト可能に
