# Requirements Document

## Introduction

Configuration Layer Pattern は、PR Insights Labelerの設定管理を統一し、保守性とテスト容易性を向上させるためのアーキテクチャパターンです。現在、`Config` (action input由来) と `LabelerConfig` (pr-labeler.yml由来) が個別に管理され、環境変数も各所で直接参照されているため、優先順位が不明確でテストが困難です。本機能により、全ての設定ソースを統合し、明確な優先順位と疎結合な設計を実現します。

**ビジネス価値:**

- PRコメントの言語設定バグを修正し、ユーザー体験を向上
- 設定の由来を追跡可能にし、デバッグ効率を向上
- 各関数を疎結合化し、テストカバレッジを維持・向上
- 将来的な設定ソース追加を容易にし、拡張性を確保

## Requirements

### Requirement 1: Environment Layer の導入

**Objective:** 開発者として、環境変数アクセスが一箇所に集約されることで、テストが容易で依存関係が明確なコードベースを維持したい

#### Acceptance Criteria

1. WHEN PR Insights Labelerが起動時に環境変数を読み込む THEN PR Insights Labeler System SHALL `loadEnvironmentConfig()` 関数を通じて全ての環境変数を取得する
2. WHEN `loadEnvironmentConfig()` が呼び出される THEN PR Insights Labeler System SHALL 以下の環境変数を `EnvironmentConfig` オブジェクトとして返す
   - `LANGUAGE` または `LANG` を `language` フィールドにマッピング
   - `GITHUB_TOKEN` または `GH_TOKEN` を `githubToken` フィールドにマッピング
3. WHERE ビジネスロジック層 THE PR Insights Labeler System SHALL `process.env` を直接参照せず、`EnvironmentConfig` オブジェクトから値を取得する
4. WHEN 環境変数が複数ソース（例: `LANGUAGE` と `LANG`）で提供される THEN PR Insights Labeler System SHALL 優先順位に従って1つの値を選択する
5. IF 環境変数が設定されていない THEN PR Insights Labeler System SHALL `undefined` を返し、後続の優先順位処理に委ねる

### Requirement 2: 統合Config構築

**Objective:** 開発者として、全ての設定ソースが統合された CompleteConfig を使用することで、設定の優先順位が明確で保守しやすいコードを実現したい

#### Acceptance Criteria

1. WHEN PR Insights Labelerが設定を構築する THEN PR Insights Labeler System SHALL `buildCompleteConfig()` 関数で全ての設定ソースを統合する
2. WHEN `buildCompleteConfig()` が呼び出される THEN PR Insights Labeler System SHALL 以下の引数を受け取る
   - `parsedInputs: ParsedInputs` (パース・バリデーション済みの型安全なデータ)
   - `labelerConfig: LabelerConfig` (pr-labeler.yml)
   - `envConfig: EnvironmentConfig` (環境変数)
3. WHEN 設定値が複数ソースで提供される THEN PR Insights Labeler System SHALL 以下の優先順位で値を決定する
   - 優先度1: `actionInputs` (action input)
   - 優先度2: `labelerConfig` (pr-labeler.yml)
   - 優先度3: `envConfig` (環境変数)
   - 優先度4: デフォルト値
4. WHEN `buildCompleteConfig()` が設定を統合する THEN PR Insights Labeler System SHALL `CompleteConfig` 型のオブジェクトを返す
5. WHERE デバッグログが有効 THE PR Insights Labeler System SHALL 各設定値の由来（どのソースから取得したか）をログ出力する
6. WHEN action inputs をパースする THEN PR Insights Labeler System SHALL `parseActionInputs()` 関数で全ての文字列入力を型安全な値に変換し、バリデーションエラーを Result<T,E> で返す
7. WHEN `buildCompleteConfig()` が parsedInputs を受け取る THEN PR Insights Labeler System SHALL 既にパース済みの型安全なデータとして扱い、追加のパース処理を実施しない
8. IF `parseActionInputs()` がエラーを返す THEN PR Insights Labeler System SHALL エラーを伝播し、アクションを即座に失敗させる

### Requirement 3: 言語決定ロジックの明確化

**Objective:** ユーザーとして、action inputで `language: ja` を指定した際に、確実に日本語でPRコメントが表示されることを期待する

#### Acceptance Criteria

1. WHEN PR Insights Labelerが言語を決定する THEN PR Insights Labeler System SHALL `determineLanguage()` 関数を使用する
2. WHEN `determineLanguage()` が呼び出される THEN PR Insights Labeler System SHALL 以下の引数を受け取る
   - `actionInputLanguage?: string` (action inputの言語設定)
   - `configFileLanguage?: string` (pr-labeler.ymlの言語設定)
   - `envLanguage?: string` (環境変数の言語設定)
3. WHEN 複数の言語設定が提供される THEN PR Insights Labeler System SHALL 以下の優先順位で言語を決定する
   - 優先度1: `actionInputLanguage`
   - 優先度2: `configFileLanguage`
   - 優先度3: `envLanguage`
   - 優先度4: デフォルト値 `'en'`
4. WHEN 言語コードが不正な値（例: `'fr'`）である THEN PR Insights Labeler System SHALL 警告ログを出力し、デフォルト値 `'en'` にフォールバックする
5. WHEN 言語コードがロケール形式（例: `'ja-JP'`, `'en-US'`）である THEN PR Insights Labeler System SHALL 先頭2文字を正規化して使用する
6. WHEN 言語コードを正規化する THEN PR Insights Labeler System SHALL 全てのソース（action input, labeler config, environment）に対して `normalizeLanguageCode()` を適用する
7. WHEN `LabelerConfig.language` の型を定義する THEN PR Insights Labeler System SHALL `string | undefined` 型を使用し、ロケール形式（'ja-JP', 'en-US'）を許容する

### Requirement 4: i18n初期化の疎結合化

**Objective:** 開発者として、i18nモジュールが設定構造に依存しないことで、テストが容易で再利用可能なコードを実現したい

#### Acceptance Criteria

1. WHEN i18nを初期化する THEN PR Insights Labeler System SHALL `initializeI18n(language: LanguageCode)` 関数を呼び出す
2. WHEN `initializeI18n()` が呼び出される THEN PR Insights Labeler System SHALL 言語コード（`'en'` または `'ja'`）のみを引数として受け取る
3. IF `Config` オブジェクト全体が渡される THEN PR Insights Labeler System SHALL コンパイルエラーを発生させる
4. WHEN i18n初期化が成功する THEN PR Insights Labeler System SHALL `Result<void, ConfigurationError>` で成功を返す
5. WHEN i18n初期化が失敗する THEN PR Insights Labeler System SHALL エラー詳細を含む `ConfigurationError` を返す

### Requirement 5: デバッグログとトレーサビリティ

**Objective:** 開発者として、設定値の由来を追跡可能にすることで、問題発生時のデバッグを迅速に行いたい

#### Acceptance Criteria

1. WHEN `buildCompleteConfig()` が設定を構築する THEN PR Insights Labeler System SHALL デバッグログで以下の情報を出力する
   - 各設定ソースから読み込まれた生の値
   - 優先順位処理後の最終決定値
   - 各値がどのソースから採用されたか
2. WHEN `initializeI18n()` が呼び出される THEN PR Insights Labeler System SHALL 以下の情報をデバッグログに出力する
   - 受け取った言語コード
   - i18next初期化の成否
3. WHERE GitHub Actions環境 THE PR Insights Labeler System SHALL デバッグログを `@actions/core` の `debug()` APIで出力する
4. WHEN デバッグログが有効でない THEN PR Insights Labeler System SHALL ログ出力のオーバーヘッドを最小化する
5. IF 設定値の決定で予期しない動作が発生する THEN 開発者 SHALL デバッグログから原因を特定できる

### Requirement 6: 既存テストの互換性維持

**Objective:** 開発者として、リファクタリング後もテストカバレッジ93%以上を維持し、既存機能が正常に動作することを保証したい

#### Acceptance Criteria

1. WHEN リファクタリングが完了する THEN PR Insights Labeler System SHALL 全ての既存テストが成功する
2. WHEN テストスイートを実行する THEN PR Insights Labeler System SHALL テストカバレッジ93%以上を維持する
3. WHEN 新しいモジュール（`config-builder.ts`, `environment-loader.ts`）を追加する THEN PR Insights Labeler System SHALL 対応するテストファイルを作成する
4. WHEN i18nテスト（`__tests__/i18n.test.ts`）を更新する THEN PR Insights Labeler System SHALL 新しいシグネチャ `initializeI18n(language: LanguageCode)` をテストする
5. IF テストが失敗する THEN PR Insights Labeler System SHALL 失敗理由を明確なエラーメッセージで報告する

### Requirement 7: 型安全性の保証

**Objective:** 開発者として、TypeScriptの型システムを最大限活用し、コンパイル時にエラーを検出できるコードを維持したい

#### Acceptance Criteria

1. WHEN `CompleteConfig` インターフェースを定義する THEN PR Insights Labeler System SHALL 全ての必須フィールドを型安全に定義する
2. WHEN `EnvironmentConfig` インターフェースを定義する THEN PR Insights Labeler System SHALL 環境変数の値を `string | undefined` 型で表現する
3. WHERE 型推論が不十分な箇所 THE PR Insights Labeler System SHALL 明示的な型注釈を追加する
4. WHEN TypeScript strict modeでコンパイルする THEN PR Insights Labeler System SHALL エラーなくコンパイルが完了する
5. IF `any` 型または型アサーション（`as`）を使用する THEN PR Insights Labeler System SHALL ESLintエラーを発生させる

### Requirement 8: デフォルト値とnullable値の区別

**Objective:** 開発者として、設定の「未設定」と「デフォルト値」を明確に区別することで、優先順位が正しく機能するコードを実現したい

#### Acceptance Criteria

1. WHEN ActionInputs型を定義する THEN PR Insights Labeler System SHALL nullable型（string | undefined）を使用する
2. WHEN getActionInputs()がinputを読み込む THEN PR Insights Labeler System SHALL 空文字列の場合はundefinedを返す
3. WHEN buildCompleteConfig()が設定をマージする THEN PR Insights Labeler System SHALL undefined値を次の優先順位にスキップする
4. WHERE デフォルト値の適用 THE PR Insights Labeler System SHALL 全ての優先順位をチェックした後の最終ステップで適用する
5. WHEN テストでデフォルト動作を検証する THEN PR Insights Labeler System SHALL 環境変数が優先されることを確認する

### Requirement 9: action.yml の変更

**Objective:** 開発者として、action.yml の default 値を削除することで、優先順位チェーンが正しく機能するインターフェースを実現したい

#### Acceptance Criteria

1. WHEN action.yml を変更する THEN PR Insights Labeler System SHALL `language` input の `default: "en"` を削除する
2. WHEN `language` input が未設定である THEN GitHub Actions SHALL 空文字列を `core.getInput('language')` に返す
3. WHEN `getActionInputs()` が空文字列を受け取る THEN PR Insights Labeler System SHALL `undefined` に変換する
4. WHEN `buildCompleteConfig()` が `actionInputs.language === undefined` を検出する THEN PR Insights Labeler System SHALL 次の優先順位（pr-labeler.yml → 環境変数 → デフォルト値）にフォールバックする
5. WHEN ユーザーが明示的に `language: en` を指定する THEN PR Insights Labeler System SHALL action input を最優先で使用する

### Requirement 10: Input Parser Layer の導入

**Objective:** 開発者として、action input の変換・バリデーションが一箇所に集約されることで、既存の検証ロジックを保持しつつ、参考コード（action-cache）のパターンに整合した設計を実現したい

#### Acceptance Criteria

1. WHEN `parseActionInputs()` が呼び出される THEN PR Insights Labeler System SHALL 全ての action input を型安全な `ParsedInputs` に変換する
2. WHEN JSON パースが必要な input を処理する THEN PR Insights Labeler System SHALL 単調性検証（small < medium < large）を実施する
3. WHEN boolean input を処理する THEN PR Insights Labeler System SHALL strict validation（"true" または "false" のみ許可）を実施する
4. WHEN サイズ input ("100KB") を処理する THEN PR Insights Labeler System SHALL 数値（102400）に変換する
5. IF パース・バリデーションが失敗する THEN PR Insights Labeler System SHALL `Result<ParsedInputs, ConfigurationError | ParseError>` でエラーを返す
6. WHEN 既存の `mapActionInputsToConfig()` を移行する THEN PR Insights Labeler System SHALL 全ての検証ロジック（約130行）を100%保持する
7. WHEN `language` input が空文字列である THEN PR Insights Labeler System SHALL `undefined` に変換し、優先順位チェーンを機能させる

## Out of Scope

以下は本要件の対象外とします：

1. **新しい設定ソースの追加** - ファイルシステム設定ファイル、データベース等の追加は対象外
2. **他モジュールのリファクタリング** - 設定管理以外のモジュール（label-manager, comment-manager等）の変更は対象外
3. **パフォーマンス最適化** - 設定読み込みの高速化や キャッシュ機構の追加は対象外
4. **action input の追加や削除** - 既存の input を変更することは対象内だが、新しい input の追加は対象外
5. **後方互換性の保証** - まだリリース前のため、既存ワークフローへの互換性を保証する必要はない

## Constraints

1. **Node.js互換性**: Node.js 20以上で動作すること
2. **TypeScript strict mode**: 全てのstrictオプションを有効にすること
3. **neverthrowパターン**: エラーハンドリングは`Result<T, E>`型を使用すること
4. **テストカバレッジ**: 93%以上を維持すること
5. **既存APIの互換性**: `@actions/core`, `@actions/github`のAPIバージョンを変更しないこと
6. **ビルドサイズ**: `dist/index.js`のサイズを大幅に増加させないこと（5%以内）
