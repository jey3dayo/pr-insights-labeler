# Requirements Document

## Introduction

Label-Based Workflow Failure Control機能は、PR Insights Labelerアクションにおいて、適用されたラベルに基づいて個別にワークフローの成否を制御する機能です。

現在の`fail_on_violation`は、すべての違反を一括で制御するため、運用上の柔軟性に欠けています。本機能により、「大きいファイルの検出は厳格にチェックするが、PRサイズは警告のみ」といった細かい制御が可能になり、チームの開発ポリシーに応じた柔軟な運用を実現します。

**ビジネス価値**:

- チーム固有の品質ポリシーを技術的に担保
- レビュープロセスの効率化（小さいPRの推奨）
- 段階的なポリシー導入が可能（警告→エラーへの移行）
- 直感的な設定（ラベル名に対応したinput名）

## Requirements

### Requirement 1: 新規Input定義と既存Input互換運用

**Objective:** GitHub Actionの利用者として、ラベルベースでワークフロー失敗を個別制御できるinputを使用したい。これにより、チームのポリシーに応じた柔軟な運用が可能になる。

#### Acceptance Criteria

1. WHEN PR Insights Labelerが起動される THEN PR Insights Labelerは`fail_on_large_files` inputを受け付けなければならない
   - 型: boolean (文字列 "true" または "false")
   - デフォルト値: "false"
   - 説明: "Fail workflow when 'auto/large-files' label is applied"

2. WHEN PR Insights Labelerが起動される THEN PR Insights Labelerは`fail_on_too_many_files` inputを受け付けなければならない
   - 型: boolean (文字列 "true" または "false")
   - デフォルト値: "false"
   - 説明: "Fail workflow when 'auto/too-many-files' label is applied"

3. WHEN PR Insights Labelerが起動される THEN PR Insights Labelerは`fail_on_pr_size` inputを受け付けなければならない
   - 型: string (空文字列 or サイズ閾値)
   - 有効な値: "", "small", "medium", "large", "xlarge", "xxlarge"
   - デフォルト値: ""（無効）
   - 説明: "Fail when PR size reaches threshold (small/medium/large/xlarge/xxlarge). Empty to disable."

4. WHEN PR Insights Labelerがバージョンアップされる THEN `fail_on_violation` inputは**非推奨として維持**され、ユーザーに移行を促す警告を出力しなければならない
   - `action.yml`には`deprecated`記法または説明文で非推奨である旨を明記
   - 実行時に`fail_on_violation`が指定された場合、ログに移行ガイダンスを出力する（i18n対応）
   - 挙動: `fail_on_violation: true` の場合は以下の互換モードを適用する
     - `fail_on_large_files`/`fail_on_too_many_files`/`fail_on_pr_size`を内部的に`true`/`"large"`として評価し、既存ユーザーの挙動が変わらないようにする

5. WHEN `fail_on_violation` inputが指定される THEN 新しいラベルベース設定にマッピングされた値が、明示的な新規inputよりも優先度が低い（優先度: 新規input > 既存互換入力）ことを保証しなければならない

6. WHEN ユーザーが無効な`fail_on_pr_size`値を指定する THEN PR Insights Labelerはバリデーションエラーをthrowしなければならない
   - 有効な値以外（例: "huge", "tiny", "123"）は受け付けない
   - エラーメッセージに有効な値のリストを含める

### Requirement 2: Input検証とマッピング

**Objective:** 開発者として、入力値が適切に検証され、型安全な内部Configにマッピングされることを保証したい。これにより、実行時エラーを防ぎ、堅牢な動作を実現する。

#### Acceptance Criteria

1. WHEN `fail_on_large_files` inputが提供される THEN PR Insights Labelerは値を`Config.failOnLargeFiles: boolean`にマッピングしなければならない

2. WHEN `fail_on_too_many_files` inputが提供される THEN PR Insights Labelerは値を`Config.failOnTooManyFiles: boolean`にマッピングしなければならない

3. WHEN `fail_on_pr_size` inputが提供される THEN PR Insights Labelerは値を`Config.failOnPrSize: string`にマッピングしなければならない
   - 空文字列の場合は空文字列のまま保持
   - 有効なサイズ値の場合はそのまま保持

4. IF `fail_on_pr_size`が指定されている AND `size_enabled`が`false`である THEN PR Insights Labelerは`ConfigurationError`をthrowしなければならない
   - エラーメッセージ: "fail_on_pr_size requires size_enabled to be true"
   - サイズラベルが付与されない状態で失敗判定はできない

5. WHEN `fail_on_violation` inputが互換モードとして扱われる THEN `ActionInputs`インターフェースには継続して`fail_on_violation: string`フィールドが存在しなければならない

6. WHEN `fail_on_violation` inputが互換モードとして扱われる THEN `Config`インターフェースには新規フィールドを追加しつつ、内部的に互換設定を格納するための`legacyFailOnViolation?: boolean`等のフラグが保持されなければならない

### Requirement 3: ラベルベース失敗判定ロジック

**Objective:** GitHub Actions利用者として、適用されたラベルに基づいてワークフローを失敗させることで、チームの品質ポリシーを技術的に担保したい。

#### Acceptance Criteria

1. WHEN PR Insights Labelerがラベル適用を完了する THEN PR Insights Labelerは現在PRに適用されているラベル一覧を取得し、さらにラベルが付与されていない場合に備えて分析結果（violations）も参照できなければならない
   - GitHub API経由で最新のラベル一覧を取得
   - ラベル適用後の状態を正確に反映
   - `apply_labels: false` や権限不足でラベルが付与されない場合でも、分析結果を用いて失敗判定が行えること

2. IF `fail_on_large_files`が`true` AND (`auto/large-files`ラベルが適用されている OR 分析結果の`violations.largeFiles`が存在する) THEN PR Insights Labelerは失敗リストに"Large files detected"を追加しなければならない

3. IF `fail_on_too_many_files`が`true` AND (`auto/too-many-files`ラベルが適用されている OR `violations.exceedsFileCount`が`true`) THEN PR Insights Labelerは失敗リストに"Too many files in PR"を追加しなければならない

4. IF `fail_on_pr_size`が指定されている AND (適用されたサイズラベルが閾値以上 OR 分析結果から算出したサイズカテゴリが閾値以上である) THEN PR Insights Labelerは失敗リストに"PR size ({適用サイズ}) exceeds threshold ({閾値})"を追加しなければならない
   - ラベルが存在しない場合は `analysis.metrics.totalAdditions` と `size_thresholds` を用いてサイズカテゴリを算出し、比較に利用する

5. WHEN 失敗リストが空でない THEN PR Insights Labelerは`core.setFailed()`をすべての失敗理由を結合したメッセージで呼び出さなければならない
   - 結合形式: `failures.join(', ')`
   - 例: "Large files detected, PR size (size/xlarge) exceeds threshold (large)"

6. WHEN 失敗リストが空である THEN PR Insights Labelerはワークフローを成功で終了しなければならない

7. WHEN 新しいラベルベース判定ロジックが導入される THEN 既存の`hasViolations && config.failOnViolation`判定ロジックは、互換モードと同等の条件を満たす内部ヘルパーに置き換えられ、既存ユーザーの期待する結果を維持しなければならない

8. WHEN `apply_labels` が `false` である or ラベル付与に失敗した場合 THEN ラベルが参照できない状況でも、分析情報をもとに失敗判定が継続されなければならない

### Requirement 4: PRサイズ閾値比較ロジック

**Objective:** 開発者として、PRサイズラベル（size/small, size/medium等）と閾値文字列を適切に比較できる機能を実装したい。これにより、正確な失敗判定を実現する。

#### Acceptance Criteria

1. WHEN PR Insights Labelerが初期化される THEN サイズ順序定義`["small", "medium", "large", "xlarge", "xxlarge"]`が利用可能でなければならない

2. WHEN 適用サイズラベル（例: "size/large"）と閾値（例: "medium"）が提供される THEN PR Insights Labelerは適用サイズが閾値以上かどうかを判定しなければならない
   - "size/small" vs "medium" → false（閾値未満）
   - "size/medium" vs "medium" → true（閾値と同じ）
   - "size/large" vs "medium" → true（閾値超過）
   - "size/xlarge" vs "medium" → true（閾値超過）
   - "size/xxlarge" vs "medium" → true（閾値超過）

3. WHEN 適用サイズラベルが"size/"プレフィックスを持つ THEN PR Insights Labelerはプレフィックスを除去してサイズ値を抽出しなければならない
   - 例: "size/xlarge" → "xlarge"

4. WHEN サイズ値がサイズ順序定義に存在しない THEN PR Insights Labelerは比較を失敗として扱わなければならない
   - インデックスが-1の場合は比較不可

5. WHEN 複数のサイズラベルが適用されている（異常ケース） THEN PR Insights Labelerは最初に見つかったサイズラベルを使用しなければならない
   - `appliedLabels.find(l => l.startsWith('size/'))`の結果を使用

### Requirement 5: i18n対応

**Objective:** 多言語環境のユーザーとして、エラーメッセージや失敗理由が使用言語で表示されることを期待する。これにより、グローバルなプロジェクトでの利用が促進される。

#### Acceptance Criteria

1. WHEN 失敗メッセージが生成される THEN PR Insights Labelerは`src/locales/{language}/logs.json`から対応するメッセージキーを取得しなければならない

2. WHEN 英語ロケールが使用される THEN 以下のメッセージキーが定義されていなければならない:

   ```json
   {
     "failures": {
       "largeFiles": "Large files detected",
       "tooManyFiles": "Too many files in PR",
       "prSize": "PR size ({size}) exceeds threshold ({threshold})"
     }
   }
   ```

3. WHEN 日本語ロケールが使用される THEN 以下のメッセージキーが定義されていなければならない:

   ```json
   {
     "failures": {
       "largeFiles": "大きなファイルが検出されました",
       "tooManyFiles": "PRのファイル数が多すぎます",
       "prSize": "PRサイズ（{size}）が閾値（{threshold}）を超えています"
     }
   }
   ```

4. WHEN `fail_on_pr_size`バリデーションエラーが発生する THEN エラーメッセージは使用言語で出力されなければならない
   - 無効な値エラー:
     - 英語: "Invalid fail_on_pr_size value. Valid values: '', 'small', 'medium', 'large', 'xlarge', 'xxlarge'"
     - 日本語: "fail_on_pr_sizeの値が無効です。有効な値: '', 'small', 'medium', 'large', 'xlarge', 'xxlarge'"
   - 設定制約エラー:
     - 英語: "fail_on_pr_size requires size_enabled to be true"
     - 日本語: "fail_on_pr_sizeはsize_enabledがtrueである必要があります"

### Requirement 6: テスト要件

**Objective:** 開発者として、すべての新機能が包括的にテストされ、品質が保証されることを確認したい。

#### Acceptance Criteria

1. WHEN 新規inputが追加される THEN `actions-io.test.ts`に対応するテストケースが追加されなければならない
   - デフォルト値の検証
   - 値の取得とパースの検証

2. WHEN input検証ロジックが追加される THEN `input-mapper.test.ts`に以下のテストケースが追加されなければならない:
   - `fail_on_pr_size`の有効な値のテスト（空文字列、各サイズ値）
   - 無効な値に対するエラーthrowのテスト
   - `fail_on_pr_size`指定時に`size_enabled: false`の場合のエラーテスト
   - 3つの新規フィールドのマッピングテスト

3. WHEN 失敗判定ロジックが実装される THEN `index.test.ts`に以下のテストケースが追加されなければならない:
   - 各フラグ（large_files, too_many_files, pr_size）の個別動作テスト
   - 複数の失敗条件が同時に発生した場合のテスト
   - 失敗メッセージの結合形式のテスト

4. WHEN サイズ比較ロジックが実装される THEN 専用のテストファイル（例: `size-comparison.test.ts`）またはヘルパー関数テストが追加されなければならない:
   - 各サイズの境界値テスト
   - プレフィックス除去のテスト
   - 無効なサイズ値の処理テスト

5. WHEN 統合テストが実行される THEN `integration.test.ts`に以下のシナリオが追加されなければならない:
   - ラベル適用後の失敗判定フローのエンドツーエンドテスト
   - 複数パターン（パターン1〜4）のテスト

6. WHEN すべてのテストが完了する THEN 既存の`fail_on_violation`に関連するテストケースは互換モードに合わせて更新され、非推奨警告や新しいマッピングの挙動を検証しなければならない
   - 5箇所のテストファイル（`__tests__/input-mapper.test.ts`, `__tests__/integration.test.ts`, `__tests__/index.test.ts`, `__tests__/i18n.test.ts`, `__tests__/actions-io.test.ts`）を洗い出し、必要に応じて互換テストへ置き換える

### Requirement 7: ドキュメント更新

**Objective:** ユーザーとして、新機能の使い方や移行方法が明確にドキュメント化されていることを期待する。

#### Acceptance Criteria

1. WHEN `action.yml`が更新される THEN 新規inputの説明がaction定義に含まれなければならない

2. WHEN `README.md`が更新される THEN 以下のセクションが含まれなければならない:
   - 新規input 3つの説明
   - 4つのユースケースパターンの例
   - `fail_on_violation`が非推奨になった旨と移行ガイド

3. WHEN `docs/en/API.md`が更新される THEN Input定義セクションが最新の状態に更新されなければならない
   - `fail_on_violation`の非推奨化と互換動作を明記
   - 新規input 3つの追加

4. WHEN `CHANGELOG.md`が更新される THEN 新機能の追加と`fail_on_violation`の非推奨化が「Deprecations」または「Changed」セクションに記載されなければならない
   - 内容: 新しいinputの概要、互換モードの説明、移行ステップへのリンク

5. WHEN ドキュメントが更新される THEN ユーザーが既存設定から新設定へ移行する手順が明記されなければならない
   - 既存設定例 → 新設定例の対応表を掲載する

### Requirement 8: 後方互換性とBreaking Change管理

**Objective:** プロジェクトメンテナーとして、既存ユーザーに影響を与えずに新機能へ移行させたい。

#### Acceptance Criteria

1. WHEN `fail_on_violation`が使用されているワークフローが存在する THEN 新機能リリース後も同等の失敗判定が継続されなければならない
   - 互換モードで`fail_on_violation`を解釈し、新フラグへマッピングする

2. WHEN 新機能がリリースされる THEN バージョン番号はセマンティックバージョニングに従い、互換性維持のためMinorバージョンアップで対応しなければならない

3. WHEN ユーザーが`fail_on_violation`を指定した場合 THEN ログには非推奨警告と移行先の設定例が表示されなければならない（i18n対応）

4. WHEN リリースノートが作成される THEN 非推奨通知と推奨設定への移行手順が明確に記載されなければならない

### Requirement 9: エラーハンドリングとロギング

**Objective:** 開発者およびユーザーとして、エラー発生時に適切な診断情報が提供されることを期待する。

#### Acceptance Criteria

1. WHEN 設定エラーが発生する THEN PR Insights Labelerは`ConfigurationError`型のエラーをthrowしなければならない
   - neverthrowの`Result<T, E>`パターンに従う
   - エラーメッセージは具体的で実行可能なアクションを含む

2. WHEN ラベル取得に失敗する THEN PR Insights Labelerはエラーをログに記録し、適切にハンドリングしなければならない
   - GitHub API呼び出しの失敗を想定
   - リトライロジックまたはフォールバック動作

3. WHEN 失敗判定が実行される THEN PR Insights Labelerは判定プロセスをログに記録しなければならない
   - デバッグレベル: 各フラグの評価結果
   - インフォレベル: 最終的な失敗判定結果

4. WHEN 複数の失敗条件が同時に満たされる THEN すべての失敗理由がログに記録されなければならない
   - ユーザーが一度にすべての問題を把握できる

### Requirement 10: パフォーマンスと効率性

**Objective:** 開発者として、新機能が既存のパフォーマンスに悪影響を与えないことを確認したい。

#### Acceptance Criteria

1. WHEN ラベル一覧を取得する THEN PR Insights Labelerは最小限のAPI呼び出しで実現しなければならない
   - 既存のラベル適用処理の結果を再利用できる場合は再利用

2. WHEN サイズ比較ロジックが実行される THEN O(1)の計算量で完了しなければならない
   - 配列のindexOf検索のみ（線形探索だが要素数は5個固定）

3. WHEN 失敗判定ロジックが実行される THEN 追加のオーバーヘッドは100ms未満でなければならない
   - ラベル取得とサイズ比較の合計時間

4. WHEN 既存の処理フローが変更される THEN 全体の実行時間は現状と同等またはそれ以下でなければならない
