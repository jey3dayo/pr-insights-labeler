# Requirements Document

## Introduction

PR Insights Labelerアクションにおける例外依存のtry-catch処理を整理し、neverthrowのResult/ResultAsyncパターンへ統一的に移行することで、型安全なエラー伝播とハンドリングの一貫性を確保する。これにより、GitHub Actionsでの失敗要因の追跡が容易になり、既存のi18nログやサマリ出力と整合した運用を実現する。

## Requirements

### Requirement 1: アクションエントリポイントのResult化

**Objective:** アクション運用者として、`run()`実行時の失敗理由がResult経由で構造化されて記録されることで、PR Insights Labelerの実行失敗を素早く診断したい。

#### Acceptance Criteria

1. WHEN `run()` がアクションの主要パイプライン（初期化、分析、ラベル適用、終結）を順次呼び出す THEN PR Insights Labelerは各ステージから返るResult/ResultAsyncを連結して成功時にのみ`setFailed`を呼ばず終了する。
2. WHEN いずれかのステージがエラーResultを返す THEN PR Insights Labelerはエラー情報をi18nログへ出力し、Result内のAppErrorをメッセージ化して`setFailed`へ渡す。
3. IF 予期しない例外が投げられた THEN PR Insights Labelerは例外を`UnexpectedError`としてResultに変換し、例外スタックを失わずにロギングする。
4. WHEN `run()` が成功終了する THEN PR Insights Labelerは既存の成功ログとサマリ生成を従来どおり維持する。

### Requirement 2: GitHub API呼び出しのResult整備

**Objective:** GitHub Actionsオーナーとして、CIステータスやラベル操作などの外部API呼び出し失敗をResultで受け取り、再試行や警告判断を一貫した基準で行えるようにしたい。

#### Acceptance Criteria

1. WHEN `getCIStatus` がGitHub APIを呼び出す THEN PR Insights Labelerは通信失敗時に`GitHubAPIError`を含むErr Resultを返す。
2. IF `applyLabelsStage` がCIステータス取得Resultを受け取る AND それがErrである THEN PR Insights Labelerはエラー内容を警告ログとして記録し、CI依存処理なしで続行する。
3. WHEN コミット一覧取得処理がGitHub APIからRate Limitエラーを受け取る THEN PR Insights Labelerは`RateLimitError`をResultに含め、再試行待機時間をログへ出力する。
4. IF API呼び出しが成功する THEN PR Insights Labelerは既存の成功ログとデータ整形ロジックを維持し、ResultのOk経路で値を返す。

### Requirement 3: ログおよび翻訳メッセージの整合性

**Objective:** 運用チームとして、neverthrow導入後もエラーメッセージが多言語ロギングとActions Summaryに矛盾なく表示されるようにしたい。

#### Acceptance Criteria

1. WHEN Result Err をユーザー可視メッセージへ変換する THEN PR Insights Labelerは既存の`t()`や`log*I18n`関数を使い、メッセージキーとパラメータを維持する。
2. IF `writeSummary` 系処理でResult Err が発生する THEN PR Insights Labelerは要約出力の失敗を警告ログに残しつつ、アクション全体を失敗扱いにしない。
3. WHILE Result化した処理が内部で再試行ユーティリティを使用する THE PR Insights Labelerはシリアライズ可能なエラー情報をログへ添付し、デバッグに必要なステータスコードやリトライ回数を残す。
4. WHERE テストコードがResult化された関数を扱う THEN PR Insights Labelerはエラーパスと成功パスのユニットテストを更新し、型安全なアサーションで結果を検証する。
