# Requirements Document

## イントロダクション

PR Insights Labelerは、PRのメトリクス分析に基づいて自動的にラベルを付与するGitHub Actionです。既存のpr-labelerで計算されたメトリクス（サイズ、複雑度、リスク）を活用し、GitHub Actions labelerでは実現できないインテリジェントなラベル付けを提供します。

### ビジネス価値

- **コードレビュー効率化**: PRの特性を一目で把握し、適切なレビュアーへのアサインを容易にする
- **品質管理の自動化**: 高リスクや高複雑度のPRを早期検出し、より慎重なレビューを促す
- **開発プロセスの可視化**: PRのサイズ分布やカテゴリ分類により、チームの開発パターンを可視化
- **既存資産の活用**: pr-labelerの計算ロジックを再利用し、開発コストを削減

### プロジェクト背景

- pr-labelerで既にPRメトリクス計算機能を実装済み
- actions/labelerはパスベースのみで、メトリクスベースのラベル付けは不可能
- メトリクス（サイズ、複雑度、リスク）に基づくインテリジェントなラベル付けが必要

## Requirements

### Requirement 1: サイズベースの自動ラベル付け

**Objective:** As a 開発者, I want PRの追加行数に基づいて自動的にサイズラベルが付与されること, so that レビュアーがPRの大きさを一目で把握できる

#### Acceptance Criteria

1. WHEN PRの追加行数が100行未満 THEN PR Insights Labelerアクション SHALL `size/small` ラベルを付与する
2. WHEN PRの追加行数が100行以上500行未満 THEN PR Insights Labelerアクション SHALL `size/medium` ラベルを付与する
3. WHEN PRの追加行数が500行以上1000行未満 THEN PR Insights Labelerアクション SHALL `size/large` ラベルを付与する
4. WHEN PRの追加行数が1000行以上 THEN PR Insights Labelerアクション SHALL `size/xlarge` ラベルを付与する
5. WHEN PRのサイズが変更された THEN PR Insights Labelerアクション SHALL 古いサイズラベルを削除し、新しいラベルを付与する
6. WHERE 設定ファイルでサイズ閾値がカスタマイズされている THEN PR Insights Labelerアクション SHALL 設定された閾値に基づいてラベルを付与する

#### 仕様補足（サイズ）

- 判定対象行数は `additions` のみを用いる（`additions + deletions` は使用しない）。
- 既定の範囲は `[0,100)`, `[100,500)`, `[500,1000)`, `[1000,∞)` とする（下限含む・上限排他）。
- 除外パターンに一致するファイル（例: `dist/**`, `*.d.ts`, `*.map`）はカウント対象から除外する（`pattern-matcher` の既定＋設定の追加除外を適用）。
- サイズ系ラベル（`size/*`）は置換ポリシー：既存の `size/*` をすべて削除し、新しいサイズラベルを1つだけ付与する。

### Requirement 2: 複雑度ベースの自動ラベル付け

**Objective:** As a テックリード, I want PRの循環的複雑度に基づいて複雑度ラベルが付与されること, so that 複雑なコード変更に対してより慎重なレビューを実施できる

#### Acceptance Criteria

1. WHEN PRに含まれるファイルの循環的複雑度が閾値を超過 THEN PR Insights Labelerアクション SHALL `complexity/high` ラベルを付与する
2. WHEN PRに含まれるファイルの循環的複雑度が一定範囲内 THEN PR Insights Labelerアクション SHALL `complexity/medium` ラベルを付与する
3. WHEN PRに含まれるファイルの循環的複雑度が低い THEN PR Insights Labelerアクション SHALL 複雑度ラベルを付与しない
4. WHERE 設定ファイルで複雑度閾値が指定されている THEN PR Insights Labelerアクション SHALL 設定された閾値に基づいて複雑度を判定する
5. WHEN 複雑度計算対象の拡張子が設定されている THEN PR Insights Labelerアクション SHALL 指定された拡張子のファイルのみを複雑度分析対象とする

#### 仕様補足（複雑度）

- 指標は循環的複雑度（cyclomatic complexity）を用いる。
- PR全体の複雑度は、対象ファイルの複雑度の最大値（max）で判定する（将来拡張で avg/weighted を許容）。
- 既定の対象拡張子は `.ts`, `.tsx`。未対応拡張子は複雑度集計から除外する。
- 既定閾値例：`medium: 10`, `high: 20`（設定で上書き可能）。
- 複雑度算出に失敗または未対応の場合でも、他の要件処理は継続し、警告に留める。

### Requirement 3: カテゴリベースの自動ラベル付け

**Objective:** As a プロジェクトマネージャー, I want 変更されたディレクトリやファイルパターンに基づいてカテゴリラベルが付与されること, so that 変更の影響範囲を把握し適切な担当者にレビューを依頼できる

#### Acceptance Criteria

1. WHEN PRが `src/components/` 配下のファイルを変更 THEN PR Insights Labelerアクション SHALL `category/components` ラベルを付与する
2. WHEN PRが `.github/workflows/` 配下のファイルを変更 THEN PR Insights Labelerアクション SHALL `category/ci-cd` ラベルを付与する
3. WHEN PRが `docs/` 配下のファイルを変更 THEN PR Insights Labelerアクション SHALL `category/documentation` ラベルを付与する
4. WHEN PRが `__tests__/` または `*.test.ts` ファイルを変更 THEN PR Insights Labelerアクション SHALL `category/tests` ラベルを付与する
5. WHERE 設定ファイルでカスタムカテゴリパターンが定義されている THEN PR Insights Labelerアクション SHALL 定義されたパターンに基づいてカテゴリラベルを付与する
6. WHEN PRが複数のカテゴリに該当する THEN PR Insights Labelerアクション SHALL 該当するすべてのカテゴリラベルを付与する
7. WHEN カテゴリパターンがminimatch形式で指定されている THEN PR Insights Labelerアクション SHALL minimatchライブラリを使用してパターンマッチングを実行する

#### 仕様補足（カテゴリ）

- 複数カテゴリ該当時は該当するすべてのカテゴリラベルを付与する（加法ポリシー）。
- パターン評価は変更ファイルのヘッド側パスを対象に行い、リネームは新パスで評価する。
- カテゴリラベルの付与順序は安定化する（設定定義順）。

### Requirement 4: リスクベースの自動ラベル付け

**Objective:** As a 品質保証担当者, I want PRのリスクレベルに基づいてリスクラベルが付与されること, so that 高リスクな変更に対して適切な品質管理プロセスを適用できる

#### Acceptance Criteria

1. WHEN PRがテストファイルなしでコア機能ファイル（`src/` 配下）を変更 THEN PR Insights Labelerアクション SHALL `risk/high` ラベルを付与する
2. WHEN PRが既存の公開API（exportされた関数・クラス）を変更 AND テストカバレッジが閾値未満 THEN PR Insights Labelerアクション SHALL `risk/high` ラベルを付与する
3. WHEN PRが既存の公開APIを変更 AND テストカバレッジが十分 THEN PR Insights Labelerアクション SHALL `risk/medium` ラベルを付与する
4. WHEN PRが設定ファイル（`.github/workflows/`, `package.json`, `tsconfig.json`）を変更 THEN PR Insights Labelerアクション SHALL `risk/medium` ラベルを付与する
5. WHERE 設定ファイルでリスク判定ルールがカスタマイズされている THEN PR Insights Labelerアクション SHALL 設定されたルールに基づいてリスクを判定する
6. WHEN PRがドキュメントのみを変更 THEN PR Insights Labelerアクション SHALL リスクラベルを付与しない

#### 仕様補足（リスク）

- 「テストなし」の定義：PRの変更に `__tests__/` または `*.test.*`（設定可能）が含まれない場合を指す。
- コア機能変更の定義：`src/**`（設定可能）に該当する変更。
- 公開API変更検知は段階的導入：初期はヒューリスティック（公開エクスポートを含むファイルの変更）とし、将来AST差分へ拡張可能とする。
- カバレッジ閾値は設定（例: `coverage_threshold: 80`）から取得し、提供されない場合は適用しない（高/中の判定ルールからカバレッジ条件を除外）。

### Requirement 5: 設定の柔軟性とカスタマイズ性

**Objective:** As a リポジトリ管理者, I want YAML設定ファイルで各種閾値とラベルルールをカスタマイズできること, so that プロジェクト固有の要件に合わせてラベル付けをカスタマイズできる

#### Acceptance Criteria

1. WHEN リポジトリに `.github/pr-labeler.yml` ファイルが存在する THEN PR Insights Labelerアクション SHALL 設定ファイルを読み込んで適用する
2. IF `.github/pr-labeler.yml` ファイルが存在しない THEN PR Insights Labelerアクション SHALL デフォルト設定を使用する
3. WHERE 設定ファイルでサイズ閾値が定義されている THEN PR Insights Labelerアクション SHALL 定義された閾値（small/medium/large/xlarge）を使用する
4. WHERE 設定ファイルで複雑度閾値が定義されている THEN PR Insights Labelerアクション SHALL 定義された閾値（medium/high）を使用する
5. WHERE 設定ファイルでカテゴリパターンが定義されている THEN PR Insights Labelerアクション SHALL 定義されたパターンとラベル名を使用する
6. WHERE 設定ファイルでリスク判定ルールが定義されている THEN PR Insights Labelerアクション SHALL 定義されたルールを使用する
7. WHEN 設定ファイルのフォーマットが不正 THEN PR Insights Labelerアクション SHALL エラーメッセージを出力し、デフォルト設定にフォールバックする
8. WHEN 設定ファイルで無効な閾値（負の数、非数値）が指定されている THEN PR Insights Labelerアクション SHALL バリデーションエラーを返す

#### 設定スキーマ（例）

```yaml
# .github/pr-labeler.yml
size:
  thresholds:
    small: 100
    medium: 500
    large: 1000
complexity:
  enabled: true
  metric: cyclomatic
  thresholds:
    medium: 10
    high: 20
  extensions: [".ts", ".tsx"]
categories:
  - label: "category/tests"
    patterns: ["__tests__/**", "**/*.test.ts"]
  - label: "category/ci-cd"
    patterns: [".github/workflows/**"]
risk:
  high_if_no_tests_for_core: true
  core_paths: ["src/**"]
  coverage_threshold: 80
  config_files: [".github/workflows/**", "package.json", "tsconfig.json"]
exclude:
  additional: ["dist/**", "*.d.ts", "*.map"]
labels:
  create_missing: true
  namespace_policies:
    "size/*": replace
    "category/*": additive
runtime:
  fail_on_error: false
  dry_run: false
```

#### 設定バリデーション

- 閾値は非負整数、かつ `small < medium < large < xlarge` の整合性をチェックする。
- 未知キーは警告とし無視する（厳格モードは将来拡張）。
- 型不一致はエラーとしてデフォルトへフォールバックする。

### Requirement 6: GitHub Actions統合とエラーハンドリング

**Objective:** As a CI/CD管理者, I want PR Insights Labelerが堅牢なエラーハンドリングでGitHub Actionsと統合されること, so that ワークフローが安定して動作し、問題発生時に適切なフィードバックが得られる

#### Acceptance Criteria

1. WHEN PR Insights Labelerアクションが実行される THEN アクション SHALL GitHub Actions入力パラメータから設定を取得する
2. WHEN GitHub APIへのリクエストが失敗 THEN アクション SHALL neverthrowの`Result<T, E>`型でエラーを返す
3. WHEN 設定ファイルのパースが失敗 THEN アクション SHALL エラー詳細をActions Summaryに出力し、`core.setFailed()`を呼び出す
4. WHEN ラベル付与操作が成功 THEN アクション SHALL 付与されたラベルのリストをActions Outputに設定する
5. WHERE `fail_on_error`入力が`true` AND エラーが発生 THEN アクション SHALL ワークフローを失敗させる
6. WHERE `fail_on_error`入力が`false` AND エラーが発生 THEN アクション SHALL 警告を出力するがワークフローは継続する
7. アクション実行中は、進行状況をActions Summary（Markdown形式）に逐次出力する
8. WHEN すべての処理が完了 THEN アクション SHALL 付与されたラベルのサマリーをActions Outputに設定する

#### 仕様補足（統合・権限）

- 必要権限：`pull-requests: write`、`issues: write`。不足時はラベル操作をスキップし、Summaryに結果を出力する（フォークPR想定）。
- 対象イベント：`pull_request` の `opened` / `synchronize` / `reopened`（draftやclosedはスキップ）。
- 同時実行：`concurrency` で最新実行のみがラベル変更を適用する。

### Requirement 7: コアロジックの再利用と型安全性

**Objective:** As a 開発者, I want pr-labelerのコアロジックを再利用し、型安全なコードベースを維持すること, so that 開発効率を高め、バグを最小限に抑える

#### Acceptance Criteria

1. WHEN ファイルメトリクスを計算する THEN アクション SHALL pr-labelerの`file-metrics.ts`モジュールを再利用する
2. WHEN Git差分を取得する THEN アクション SHALL pr-labelerの`diff-strategy.ts`モジュールを再利用する
3. WHEN ファイル除外パターンを適用する THEN アクション SHALL pr-labelerの`pattern-matcher.ts`モジュールを再利用する
4. WHERE すべての非同期処理とエラーが発生しうる処理 THE アクション SHALL neverthrowの`Result<T, E>`型を使用する
5. WHERE すべての関数とモジュール THE アクション SHALL TypeScript strict modeの全設定を満たす
6. WHEN 型アサーション（`as`）を使用する場合 THEN コード SHALL 最小限に留め、コメントで正当性を説明する
7. WHEN 配列やオブジェクトにアクセスする THEN コード SHALL `noUncheckedIndexedAccess`に準拠し、`T | undefined`を適切に処理する

### Requirement 8: テスト要件と品質保証

**Objective:** As a 品質保証担当者, I want 90%以上のテストカバレッジと包括的なテストスイートが提供されること, so that 本番環境での不具合を最小限に抑え、継続的な品質向上を実現できる

#### Acceptance Criteria

1. WHEN ユニットテストを実行 THEN テストカバレッジ SHALL 90%以上を達成する
2. WHEN 各モジュールに対応するテストファイル THEN `__tests__/[module-name].test.ts`形式のファイル SHALL 存在する
3. WHERE すべてのEARS要件 THE 対応する受け入れテスト SHALL 存在する
4. WHEN サイズベースラベル機能をテスト THEN テスト SHALL 各閾値境界値（99行、100行、499行、500行、999行、1000行、1001行）をカバーする
5. WHEN 複雑度ベースラベル機能をテスト THEN テスト SHALL 複雑度計算のモックとラベル付与ロジックを検証する
6. WHEN カテゴリベースラベル機能をテスト THEN テスト SHALL minimatchパターンマッチングの正確性を検証する
7. WHEN リスクベースラベル機能をテスト THEN テスト SHALL テストファイル有無とAPIコア変更の組み合わせをカバーする
8. WHEN GitHub API統合をテスト THEN テスト SHALL Octokitクライアントのモックを使用する
9. WHEN エラーハンドリングをテスト THEN テスト SHALL 各エラー型（ParseError、GitHubAPIError、ConfigurationError）の処理を検証する
10. WHEN CIパイプラインでテストを実行 THEN `pnpm lint && pnpm type-check && pnpm test && pnpm build` SHALL すべて成功する

### Requirement 9: 非機能要件（冪等性・性能・運用）

**Objective:** 安定かつ冪等に動作し、GitHub APIの制約下で効率よく実行できること

#### Acceptance Criteria

1. WHEN 同一PRで再実行 THEN ラベルの最終状態は常に一意となり、重複付与や不要削除が発生しない（冪等）。
2. WHEN GitHub APIを呼び出す THEN 1実行あたりのAPI呼び出しは上限N（例: 50）以内に収まるよう最小化される。
3. WHEN レートリミットに達した場合 THEN 適切な待機とリトライ（指数バックオフ）を行うか、警告の上で安全に中断する。
4. WHEN 実行完了 THEN Actions Summaryに閾値、対象ファイル数、付与/削除ラベル一覧、スキップ理由（権限不足等）を出力する。
5. WHEN 生成物（dist等）による誤検知が想定される場合 THEN 既定の除外パターンを適用し、設定で拡張できる。
