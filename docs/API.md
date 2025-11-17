# API仕様書

PR Insights Labelerの詳細なAPI仕様書です。

## 📥 Inputs

### 基本制限パラメータ

#### `file_size_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"100KB"`
- **説明**: 個別ファイルのサイズ上限
- **フォーマット**: 数値 + 単位（B, KB, MB, GB）または数値のみ（バイト）
- **バリデーション**:
  - 単位は大文字小文字を区別しない
  - 複数の単位を含む場合はエラー（例: `"10KB 20MB"`）
  - 負の値は不可
- **使用例**:

  ```yaml
  file_size_limit: "100KB"    # 100キロバイト
  file_size_limit: "1.5MB"    # 1.5メガバイト
  file_size_limit: "500000"   # 500,000バイト
  ```

#### `file_lines_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"500"`
- **説明**: 個別ファイルの行数上限（ファイル全体の行数、diff追加行数ではない）
- **バリデーション**:
  - 正の整数のみ
  - 非数値はエラー
- **使用例**:

  ```yaml
  file_lines_limit: "500"
  file_lines_limit: "1000"
  ```

#### `pr_additions_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"5000"`
- **説明**: PR全体の追加行数上限（diff-based、削除行数は含まない）
- **バリデーション**: 正の整数のみ
- **使用例**:

  ```yaml
  pr_additions_limit: "5000"
  pr_additions_limit: "1000"
  ```

#### `pr_files_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"50"`
- **説明**: PR内の最大ファイル数（削除されたファイルは除く）
- **バリデーション**: 正の整数のみ
- **使用例**:

  ```yaml
  pr_files_limit: "50"
  pr_files_limit: "100"
  ```

---

### ラベル設定パラメータ

#### `auto_remove_labels`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: 制限違反が解消された際に自動的にラベルを削除
- **使用例**:

  ```yaml
  auto_remove_labels: "true"
  ```

#### `apply_size_labels`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: 内部パラメータ（PR Insights Labeler のサイズラベルが自動的に適用されます）
- **使用例**:

  ```yaml
  apply_size_labels: "true"
  ```

#### `size_label_thresholds`

- **型**: `string` (JSON)
- **必須**: ❌
- **デフォルト**: `'{"S": {"additions": 100, "files": 10}, "M": {"additions": 500, "files": 30}, "L": {"additions": 1000, "files": 50}}'`
- **説明**: 内部パラメータ（`.github/pr-labeler.yml` でサイズラベルの閾値を設定してください）
- **バリデーション**:
  - S, M, Lの3つのサイズが必須
  - 各サイズに`additions`と`files`フィールドが必須
  - 値は非負の整数
  - 単調性: S ≤ M ≤ L（additionsとfilesそれぞれで）
- **使用例**:

  ```yaml
  size_label_thresholds: '{"S": {"additions": 50, "files": 5}, "M": {"additions": 200, "files": 15}, "L": {"additions": 500, "files": 30}}'
  ```

- **エラーパターン**:
  - 必須フィールド欠如: `Missing required size thresholds (S, M, L)`
  - 単調性違反: `Size thresholds must be monotonic (S ≤ M ≤ L for additions)`
  - 負の値: `Threshold values for size S must be non-negative`

#### `large_files_label`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"auto/large-files"`
- **説明**: ファイルサイズまたは行数制限違反時に適用されるラベル
- **使用例**:

  ```yaml
  large_files_label: "auto/large-files"
  large_files_label: "needs-splitting"
  ```

#### `too_many_files_label`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"auto/too-many-files"`
- **説明**: ファイル数制限違反時に適用されるラベル
- **使用例**:

  ```yaml
  too_many_files_label: "auto/too-many-files"
  too_many_files_label: "too-large-pr"
  ```

---

### 動作設定パラメータ

#### `skip_draft_pr`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: Draft PRをスキップ（分析を実行しない）
- **使用例**:

  ```yaml
  skip_draft_pr: "true"   # Draft PRをスキップ
  skip_draft_pr: "false"  # Draft PRも分析
  ```

#### `comment_on_pr`

- **型**: `string` (enum)
- **必須**: ❌
- **デフォルト**: `"auto"`
- **説明**: コメント投稿モード
- **受け入れ値**:
  - `"auto"`: 違反がある場合のみコメント投稿、違反解消時は削除
  - `"always"`: 常にコメント投稿
  - `"never"`: コメント投稿しない（既存コメントは削除）
- **使用例**:

  ```yaml
  comment_on_pr: "auto"     # 違反時のみコメント
  comment_on_pr: "always"   # 常にコメント
  comment_on_pr: "never"    # コメントなし
  ```

#### `fail_on_large_files`

- **型**: `string` (`""` | `"true"` | `"false"`)
- **必須**: ❌
- **デフォルト**: `""`（無効）
- **説明**: 大きなファイル（`auto/large-files`ラベルまたは違反）が検出された場合にワークフローを失敗させる
- **判定条件**: ラベル（`auto/large-files`）または実際のファイルサイズ違反のいずれか
- **使用例**:

  ```yaml
  fail_on_large_files: "true"   # 大きなファイル検出時に失敗
  fail_on_large_files: ""       # 無効（デフォルト）
  ```

#### 🆕 `fail_on_too_many_files`

- **型**: `string` (`""` | `"true"` | `"false"`)
- **必須**: ❌
- **デフォルト**: `""`（無効）
- **説明**: ファイル数超過（`auto/too-many-files`ラベルまたは違反）が検出された場合にワークフローを失敗させる
- **判定条件**: ラベル（`auto/too-many-files`）または実際のファイル数違反のいずれか
- **使用例**:

  ```yaml
  fail_on_too_many_files: "true"  # ファイル数超過時に失敗
  fail_on_too_many_files: ""      # 無効（デフォルト）
  ```

#### 🆕 `fail_on_pr_size`

- **型**: `string` (`""` | `"small"` | `"medium"` | `"large"` | `"xlarge"` | `"xxlarge"`)
- **必須**: ❌
- **デフォルト**: `""`（無効）
- **説明**: PRサイズが指定閾値以上の場合にワークフローを失敗させる
- **判定条件**:
  - 適用されたサイズラベル（`size/large`など）または
  - 実際の追加行数から計算されたサイズカテゴリ
- **依存関係**: `size_enabled: "true"`が必要（指定時に`size_enabled: false`ならConfigurationError）
- **バリデーション**: 無効な値が指定された場合はConfigurationErrorを返す
- **使用例**:

  ```yaml
  fail_on_pr_size: "large"      # PRサイズがlarge以上で失敗
  fail_on_pr_size: "xlarge"     # PRサイズがxlarge以上で失敗
  fail_on_pr_size: ""           # 無効（デフォルト）
  ```

- **サイズ順序**: `small < medium < large < xlarge < xxlarge`
- **閾値例**（デフォルト設定）:
  - `small`: < 200行
  - `medium`: 200-499行
  - `large`: 500-999行
  - `xlarge`: 1000-2999行
  - `xxlarge`: 3000行以上

#### `enable_summary`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: GitHub Actions SummaryにPRメトリクスを出力
- **動作**:
  - `"true"`: 分析結果をActions Summaryに表示
  - `"false"`: Summary出力をスキップ
- **使用例**:

  ```yaml
  enable_summary: "true"   # Summary出力を有効化（デフォルト）
  enable_summary: "false"  # Summary出力を無効化
  ```

- **注意**:
  - Summary書き込み失敗は非致命的エラー（警告ログのみ、アクション継続）
  - ラベル・コメント機能とは独立して動作

---

### 除外設定パラメータ

#### `additional_exclude_patterns`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `""`
- **説明**: デフォルト除外パターンに追加する除外パターン
- **フォーマット**: カンマ区切りまたは改行区切り
- **パターン構文**: minimatch（glob）
- **特殊処理**:
  - `#`で始まる行はコメントとして無視
  - 空白行は無視
  - 重複パターンは自動削除
- **使用例**:

  ```yaml
  additional_exclude_patterns: "**/*.generated.ts,**/*.min.js"
  ```

  ```yaml
  additional_exclude_patterns: |
    # 生成ファイル
    **/*.generated.ts
    **/*.gen.ts
    # 最小化ファイル
    **/*.min.js
    **/*.min.css
  ```

---

### 認証パラメータ

#### `github_token`

- **型**: `string`
- **必須**: ✅
- **説明**: GitHub API認証トークン
- **優先順位**: `github_token`入力 > `GITHUB_TOKEN`環境変数 > `GH_TOKEN`環境変数
- **権限要件**:
  - `pull-requests: write` - ラベル管理用
  - `issues: write` - コメント投稿用
  - `contents: read` - ファイル読み取り用
- **使用例**:

  ```yaml
  github_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- **エラーパターン**:
  - トークン未設定: `GitHub token is required. Set github_token input or GITHUB_TOKEN/GH_TOKEN environment variable`

---

### 🌐 多言語設定パラメータ

#### `language`（設定ファイル: `.github/pr-labeler.yml`）

- **型**: `string`
- **必須**: ❌
- **デフォルト**: なし（優先順位チェーンの最終段で `'en'` を使用）
- **説明**: 出力メッセージ、エラーメッセージ、ログ、PRコメントの言語設定
- **サポート言語**: `"en"` (English), `"ja"` (日本語)
- **優先順位**:
  1. GitHub Actions ワークフローの `with.language`
  2. `.github/pr-labeler.yml` の `language` フィールド
  3. 環境変数 (`LANGUAGE` → `LANG`)
  4. デフォルト: `'en'` (English)
- **使用例**:

  ```yaml
  # .github/pr-labeler.yml
  language: ja  # 日本語で出力

  size:
    thresholds:
      small: 100
      medium: 500
      large: 1000
  ```

  または環境変数で指定:

  ```yaml
  # .github/workflows/pr-check.yml
  - uses: jey3dayo/pr-labeler@v1
    with:
      github_token: ${{ secrets.GITHUB_TOKEN }}
    env:
      LANGUAGE: ja  # workflow input / pr-labeler.yml 未指定時のフォールバック
  ```

- **動作**:
  - GitHub Actions Summary、エラーメッセージ、ログ、PRコメントが指定した言語で出力されます
  - GitHub API呼び出し時のラベル名（`label` フィールド）は常に英語のまま使用されます
  - カスタムラベル表示名は `display_name` で多言語対応できます

#### `display_name`（カテゴリ設定の多言語表示名）

- **型**: `object`
- **必須**: ❌
- **説明**: カテゴリラベルの多言語表示名
- **構造**:

  ```typescript
  {
    en: string;  // 英語表示名
    ja: string;  // 日本語表示名
  }
  ```

- **優先順位**:
  1. `.github/pr-labeler.yml` の `display_name`（カスタム翻訳）
  2. 組み込みの翻訳リソース（`labels` 名前空間）
  3. ラベル名そのまま

- **使用例**:

  ```yaml
  # .github/pr-labeler.yml
  language: ja

  categories:
    - label: 'category/tests'
      patterns:
        - '__tests__/**'
        - '**/*.test.ts'
      display_name:
        en: 'Test Files'
        ja: 'テストファイル'

    - label: 'category/docs'
      patterns:
        - 'docs/**'
        - '**/*.md'
      display_name:
        en: 'Documentation'
        ja: 'ドキュメント'
  ```

- **動作**:
  - GitHub Actions SummaryやPRコメントで、現在の言語に応じた表示名が使用されます
  - 例: `language: ja` の場合、「テストファイル」と表示されます
  - GitHub APIでは常に英語のラベル名（`label: 'category/tests'`）が使用されます

- **バリデーション**:
  - `display_name` が設定される場合、`en` と `ja` の両方が必須です
  - どちらか一方のみの設定はエラーになります

  ```yaml
  # ❌ エラー: ja が欠けている
  categories:
    - label: 'category/tests'
      patterns: ['**/*.test.ts']
      display_name:
        en: 'Tests'
        # ja がない！

  # ✅ 正しい設定
  categories:
    - label: 'category/tests'
      patterns: ['**/*.test.ts']
      display_name:
        en: 'Tests'
        ja: 'テスト'
  ```

---

## 📤 Outputs

### `large_files`

- **型**: `string` (JSON array)
- **説明**: サイズまたは行数制限を超過したファイルの詳細情報
- **構造**:

  ```json
  [
    {
      "file": "src/large.ts",
      "actualValue": 2000000,
      "limit": 1000000,
      "violationType": "size",
      "severity": "critical"
    }
  ]
  ```

- **使用例**:

  ```yaml
  - name: Check large files
    if: steps.metrics.outputs.large_files != '[]'
    run: echo "Large files detected: ${{ steps.metrics.outputs.large_files }}"
  ```

### `pr_additions`

- **型**: `string`
- **説明**: PR全体の総追加行数（diff-based）
- **例**: `"1523"`

### `pr_files`

- **型**: `string`
- **説明**: PR内の総ファイル数（削除されたファイルは除く）
- **例**: `"42"`

### `exceeds_file_size`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: いずれかのファイルがサイズ制限を超過しているか
- **使用例**:

  ```yaml
  - name: Notify on large files
    if: steps.metrics.outputs.exceeds_file_size == 'true'
    run: echo "⚠️ Large files detected!"
  ```

### `exceeds_file_lines`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: いずれかのファイルが行数制限を超過しているか

### `exceeds_additions`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: PR全体の追加行数が制限を超過しているか

### `exceeds_file_count`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: PRのファイル数が制限を超過しているか

### `has_violations`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: いずれかの違反が存在するか（上記すべての論理和）
- **使用例**:

  ```yaml
  - name: Block merge on violations
    if: steps.metrics.outputs.has_violations == 'true'
    run: exit 1
  ```

---

## 🚨 エラーパターンと対処法

### ConfigurationError

設定パラメータの検証エラー

**一般的なエラー**:

1. **ファイルサイズ解析失敗**:

   ```
   [ConfigurationError] Invalid file size format: '10KB 20MB'.
   Multiple units detected. Use single value like '10KB' or '20MB'
   ```

   **対処**: 単一の値のみを指定

2. **数値解析失敗**:

   ```
   [ConfigurationError] File lines limit must be a number
   ```

   **対処**: 数値文字列を指定（例: `"500"`）

3. **トークン未設定**:

   ```
   [ConfigurationError] GitHub token is required.
   Set github_token input or GITHUB_TOKEN/GH_TOKEN environment variable
   ```

   **対処**: `github_token`を明示的に設定

### ParseError

JSON解析・検証エラー

**一般的なエラー**:

1. **JSON構文エラー**:

   ```
   [ParseError] Invalid JSON for size thresholds
   ```

   **対処**: 有効なJSON構文を使用

2. **必須フィールド欠如**:

   ```
   [ParseError] Missing required size thresholds (S, M, L)
   ```

   **対処**: S, M, Lすべてを含める

3. **単調性違反**:

   ```
   [ParseError] Size thresholds must be monotonic (S ≤ M ≤ L for additions)
   ```

   **対処**: S ≤ M ≤ Lの順序を保つ

### GitHubAPIError

GitHub API呼び出しエラー

**一般的なエラー**:

1. **権限不足**:

   ```
   [GitHubAPIError] Failed to update labels: Resource not accessible by integration
   ```

   **対処**: workflowに適切な`permissions`を設定

2. **レート制限**:

   ```
   [GitHubAPIError] API rate limit exceeded
   ```

   **対処**: リトライまたは実行頻度を調整

3. **ネットワークエラー**:

   ```
   [GitHubAPIError] Failed to fetch diff files: Network error
   ```

   **対処**: リトライまたはGitHub Statusを確認

### FileAnalysisError

ファイル分析エラー（非致命的）

**一般的なエラー**:

1. **ファイル読み取り失敗**:

   ```
   [FileAnalysisError] Failed to read file src/test.ts: ENOENT
   ```

   **対処**: ファイルは`filesWithErrors`にリストされ、分析は継続

2. **行数カウント失敗**:

   ```
   [FileAnalysisError] Failed to count lines in src/binary.dat
   ```

   **対処**: バイナリファイルは自動スキップ、分析は継続

---

## 💡 使用例とベストプラクティス

### 基本的な使用パターン

#### 1. シンプル設定（推奨）

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

**動作**:

- デフォルト制限値を使用
- 違反時のみコメント投稿（`comment_on_pr: auto`）
- サイズラベル自動適用
- GitHub Actions Summaryに出力
- 違反時もワークフローは継続

#### 2. カスタム制限

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    file_size_limit: "200KB"
    file_lines_limit: "800"
    pr_additions_limit: "2000"
    pr_files_limit: "30"
```

#### 3. 厳格モード

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    file_size_limit: "100KB"
    file_lines_limit: "300"
    pr_additions_limit: "500"
    fail_on_large_files: "true"    # 大きなファイル検出時に失敗
    fail_on_too_many_files: "true" # ファイル数超過時に失敗
    comment_on_pr: "always"        # 常にコメント
```

#### 4. Summary出力のみ

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    # すべてのラベルを無効化
    size_enabled: "false"
    complexity_enabled: "false"
    category_enabled: "false"
    risk_enabled: "false"
    comment_on_pr: "never"
    enable_summary: "true"         # Summaryのみ
```

### 高度な使用パターン

#### 1. Slack通知との連携

```yaml
- name: Check PR Metrics
  id: metrics
  uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

- name: Notify Slack on violations
  if: steps.metrics.outputs.has_violations == 'true'
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "⚠️ PR ${{ github.event.pull_request.number }} has violations",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Additions: ${{ steps.metrics.outputs.pr_additions }}\nFiles: ${{ steps.metrics.outputs.pr_files }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### 2. 条件付きマージブロック

```yaml
- name: Check PR Metrics
  id: metrics
  uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

- name: Check for critical violations
  if: steps.metrics.outputs.exceeds_file_size == 'true'
  run: |
    echo "::error::Critical file size violations detected"
    exit 1
```

#### 3. カスタム除外パターン（モノレポ対応）

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    additional_exclude_patterns: |
      # プロジェクトA
      packages/project-a/generated/**
      packages/project-a/**/*.spec.ts
      # プロジェクトB
      packages/project-b/migrations/**
      # 共通
      **/fixtures/**
      **/__mocks__/**
```

#### 4. フォークからのPR（セキュリティ考慮）

```yaml
on:
  pull_request_target:
    types: [opened, synchronize, reopened]

jobs:
  metrics:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      issues: write
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

**注意**: `pull_request_target`はフォークからのPRでもベースリポジトリのコンテキストで実行されるため、セキュリティリスクがあります。信頼できるコードのみに使用してください。

---

## 🛡️ セキュリティとベストプラクティス

### トークンの取り扱い

- **推奨**: `${{ secrets.GITHUB_TOKEN }}`を使用（自動生成、スコープ限定）
- **非推奨**: Personal Access Tokenの使用（不要な権限を持つ可能性）
- **自動マスキング**: トークンは`core.setSecret()`で自動的にログからマスクされます

### 権限の最小化

```yaml
permissions:
  pull-requests: write  # ラベル管理に必要
  issues: write         # コメント投稿に必要
  contents: read        # ファイル読み取りに必要
  # 他の権限は不要
```

### エラーハンドリング

- **非致命的エラー**: Summary書き込み失敗、コメント投稿失敗（警告ログのみ）
- **致命的エラー**: 設定エラー、トークン未設定、PR以外での実行
- **ワークフロー失敗制御**: `fail_on_large_files`、`fail_on_too_many_files`、`fail_on_pr_size`によるユーザー制御の失敗条件

### パフォーマンス

- **大規模PR対応**: 100+ファイルのPRでもパフォーマンス劣化なし
- **メモリ効率**: ストリーミングI/Oでメモリ使用量を最小化
- **API効率**: ページネーション、バッチ処理、キャッシュ活用

---

## 🌍 エラーファクトリーの多言語化 (i18n Integration)

### 概要

全てのエラーファクトリー関数は、i18nextベースの翻訳システムと統合されています。エラーメッセージは、ユーザーが設定した言語（英語または日本語）に応じて自動的に翻訳されます。

### サポートする言語

- `en` (English) - デフォルト
- `ja` (日本語)

### エラーファクトリー関数の基本シグネチャ

全てのエラーファクトリー関数は、以下のパターンに従います:

```typescript
createXxxError(
  ...requiredParams: T[],
  customMessage?: string  // オプション: カスタムメッセージ
): XxxError
```

### 翻訳統合の仕組み

#### 1. デフォルト動作（翻訳キーを使用）

```typescript
// 英語環境 (language: 'en')
const error = createConfigurationError('language', 'invalid');
// => message: "Invalid configuration field: language"

// 日本語環境 (language: 'ja')
const error = createConfigurationError('language', 'invalid');
// => message: "設定フィールドが無効です: language"
```

#### 2. カスタムメッセージ（翻訳をバイパス）

```typescript
// 任意の言語環境
const error = createConfigurationError('field', 'value', 'Custom error message');
// => message: "Custom error message" (翻訳されない)
```

### エラーファクトリー関数リファレンス

#### createConfigurationError

設定パラメータの検証エラー

```typescript
createConfigurationError(
  field: string,
  value: unknown,
  customMessage?: string
): ConfigurationError
```

**翻訳キー**: `errors.configuration.invalidField`

**パラメータ**:

- `field`: 設定フィールド名（例: `"language"`, `"file_size_limit"`）
- `value`: 不正な値（デバッグ用、エラーオブジェクトに保持）
- `customMessage`: オプション - カスタムエラーメッセージ

**例**:

```typescript
// 翻訳版 (EN: "Invalid configuration field: file_size_limit")
const error = createConfigurationError('file_size_limit', '10KB 20MB');

// 翻訳版 (JA: "設定フィールドが無効です: file_size_limit")
initializeI18n({ language: 'ja' } as Config);
const errorJa = createConfigurationError('file_size_limit', '10KB 20MB');

// カスタムメッセージ版
const errorCustom = createConfigurationError(
  'file_size_limit',
  '10KB 20MB',
  'Multiple units detected. Use single value like "10KB" or "20MB"'
);
```

#### createGitHubAPIError

GitHub API呼び出しエラー

```typescript
createGitHubAPIError(
  message: string,
  status?: number
): GitHubAPIError
```

**翻訳キー**: `errors.github.apiError`

**パラメータ**:

- `message`: エラーの詳細メッセージ（APIレスポンスから取得）
- `status`: オプション - HTTPステータスコード

**例**:

```typescript
// EN: "GitHub API error: API request failed"
const error = createGitHubAPIError('API request failed', 404);

// JA: "GitHub APIエラー: APIリクエストが失敗しました"
initializeI18n({ language: 'ja' } as Config);
const errorJa = createGitHubAPIError('APIリクエストが失敗しました', 404);
```

#### createFileSystemError

ファイルシステム操作エラー

```typescript
createFileSystemError(
  path: string,
  operation?: 'read' | 'write' | 'notFound' | 'permission',
  customMessage?: string
): FileSystemError
```

**翻訳キー**:

- `errors.fileSystem.readError` - ファイル読み込みエラー
- `errors.fileSystem.writeError` - ファイル書き込みエラー
- `errors.fileSystem.fileNotFound` - ファイル未検出
- `errors.fileSystem.permissionDenied` - 権限エラー

**パラメータ**:

- `path`: ファイルパス（技術詳細として保持）
- `operation`: オプション - 操作種別（デフォルト: `'read'`）
- `customMessage`: オプション - カスタムエラーメッセージ

**例**:

```typescript
// EN: "Failed to read file: /path/to/file"
const error = createFileSystemError('/path/to/file', 'read');

// JA: "ファイルの読み込みに失敗しました: /path/to/file"
initializeI18n({ language: 'ja' } as Config);
const errorJa = createFileSystemError('/path/to/file', 'read');

// EN: "File not found: /missing.ts"
const errorNotFound = createFileSystemError('/missing.ts', 'notFound');
```

#### createParseError

JSON解析・検証エラー

```typescript
createParseError(
  input: string,
  customMessage?: string
): ParseError
```

**翻訳キー**: `errors.parsing.invalidFormat`

**パラメータ**:

- `input`: 不正な入力文字列（技術詳細として保持）
- `customMessage`: オプション - カスタムエラーメッセージ

**例**:

```typescript
// EN: "Invalid format: 100XYZ"
const error = createParseError('100XYZ');

// JA: "無効な形式: 100XYZ"
initializeI18n({ language: 'ja' } as Config);
const errorJa = createParseError('100XYZ');

// カスタムメッセージ（JSONパースエラー用）
const errorCustom = createParseError(
  '{"invalid": json}',
  'Invalid JSON for size thresholds'
);
```

#### createFileAnalysisError

ファイル分析エラー（非致命的）

```typescript
createFileAnalysisError(file: string): FileAnalysisError
```

**翻訳キー**: `errors.analysis.fileAnalysisError`

**パラメータ**:

- `file`: ファイルパス

**例**:

```typescript
// EN: "Failed to analyze file: src/test.ts"
const error = createFileAnalysisError('src/test.ts');

// JA: "ファイルの分析に失敗しました: src/test.ts"
initializeI18n({ language: 'ja' } as Config);
const errorJa = createFileAnalysisError('src/test.ts');
```

#### createDiffError

Diff取得エラー

```typescript
createDiffError(
  source: 'local-git' | 'github-api',
  customMessage?: string
): DiffError
```

**翻訳キー**: `errors.analysis.diffError`

**例**:

```typescript
// EN: "Failed to get diff: git command failed"
const error = createDiffError('local-git', 'git command failed');

// JA: "差分の取得に失敗しました: gitコマンドが失敗しました"
initializeI18n({ language: 'ja' } as Config);
const errorJa = createDiffError('local-git', 'gitコマンドが失敗しました');
```

#### createPatternError

パターンマッチングエラー

```typescript
createPatternError(pattern: string): PatternError
```

**翻訳キー**: `errors.pattern.invalidPattern`

**例**:

```typescript
// EN: "Invalid pattern: *.invalid"
const error = createPatternError('*.invalid');

// JA: "無効なパターン: *.invalid"
initializeI18n({ language: 'ja' } as Config);
const errorJa = createPatternError('*.invalid');
```

#### その他のエラーファクトリー

- `createCacheError(key: string)` - キャッシュエラー
- `createComplexityAnalysisError(reason, context)` - 複雑度分析エラー
- `createPermissionError(required: string)` - 権限エラー
- `createRateLimitError(retryAfter: number)` - レート制限エラー
- `createUnexpectedError(originalError: Error)` - 予期しないエラー
- `createViolationError(violations)` - 制限違反エラー

詳細は `src/errors/factories.ts` を参照してください。

### 技術詳細の保持

翻訳されたエラーメッセージでも、以下の技術詳細は**変更されずに保持**されます:

```typescript
// ファイルパスの保持
const error = createFileSystemError('/path/to/file', 'read');
// error.path === '/path/to/file' (変更されない)
// error.message に "/path/to/file" が含まれる

// HTTPステータスコードの保持
const error2 = createGitHubAPIError('API error', 401);
// error2.status === 401 (変更されない)

// パターン文字列の保持
const error3 = createPatternError('**/*.test.ts');
// error3.pattern === '**/*.test.ts' (変更されない)
// error3.message に "**/*.test.ts" が含まれる
```

### 翻訳リソースの構造

#### ファイル構成

```
src/locales/
├── en/
│   ├── errors.json    # エラーメッセージ (英語)
│   ├── logs.json      # ログメッセージ (英語)
│   └── summary.json   # サマリーメッセージ (英語)
└── ja/
    ├── errors.json    # エラーメッセージ (日本語)
    ├── logs.json      # ログメッセージ (日本語)
    └── summary.json   # サマリーメッセージ (日本語)
```

#### errors.json の構造

```json
{
  "configuration": {
    "invalidLanguage": "Invalid language code: {{code}}. Falling back to English.",
    "invalidField": "Invalid configuration field: {{field}}",
    "parsingFailed": "Failed to parse configuration: {{message}}",
    "invalidValue": "Invalid value for {{field}}: {{value}}"
  },
  "github": {
    "apiError": "GitHub API error: {{message}}",
    "rateLimitExceeded": "Rate limit exceeded. Retry after: {{resetTime}}",
    "authenticationFailed": "Authentication failed. Check GITHUB_TOKEN.",
    "notFound": "Resource not found: {{resource}}",
    "permissionDenied": "Permission denied: {{operation}}"
  },
  "fileSystem": {
    "fileNotFound": "File not found: {{path}}",
    "readError": "Failed to read file: {{path}}",
    "writeError": "Failed to write file: {{path}}",
    "permissionDenied": "Permission denied: {{path}}"
  },
  // ... その他のカテゴリ
}
```

### 新しいエラーの追加方法

#### ステップ1: 翻訳リソースにキーを追加

`src/locales/en/errors.json` と `src/locales/ja/errors.json` の両方にキーを追加:

```json
// src/locales/en/errors.json
{
  "myCategory": {
    "myNewError": "My new error message: {{detail}}"
  }
}
```

```json
// src/locales/ja/errors.json
{
  "myCategory": {
    "myNewError": "新しいエラーメッセージ: {{detail}}"
  }
}
```

#### ステップ2: エラー型定義を追加

`src/errors/types.ts` にエラー型を定義:

```typescript
export type MyNewError = {
  type: 'MyNewError';
  message: string;
  detail: string;
};
```

#### ステップ3: エラーファクトリー関数を実装

`src/errors/factories.ts` にファクトリー関数を追加:

```typescript
export const createMyNewError = (detail: string, customMessage?: string): MyNewError => ({
  type: 'MyNewError',
  message: customMessage || t('errors', 'myCategory.myNewError', { detail }),
  detail,
});
```

#### ステップ4: テストを追加

`__tests__/error-factories-i18n.test.ts` にテストを追加:

```typescript
describe('MyNewError', () => {
  it('should return English message', () => {
    initializeI18n({ language: 'en' } as Config);
    const error = createMyNewError('test detail');
    expect(error.message).toContain('My new error message');
    expect(error.message).toContain('test detail');
  });

  it('should return Japanese message', () => {
    initializeI18n({ language: 'ja' } as Config);
    const error = createMyNewError('テスト詳細');
    expect(error.message).toContain('新しいエラーメッセージ');
    expect(error.message).toContain('テスト詳細');
  });
});
```

#### ステップ5: 型定義の再生成

```bash
pnpm build
```

これにより、`scripts/generate-i18n-types.ts` が実行され、翻訳キーの型定義が自動生成されます。

### 既存コードの移行ガイド

#### 移行前（ハードコードされたメッセージ）

```typescript
throw createConfigurationError('field', value, 'Hard-coded English message');
```

#### 移行後（翻訳キー使用）

```typescript
// カスタムメッセージを削除し、翻訳キーに依存
throw createConfigurationError('field', value);
```

#### 移行チェックリスト

- [ ] 翻訳リソース（`src/locales/*/errors.json`）に対応するキーが存在するか確認
- [ ] カスタムメッセージが必要な場合のみ、`customMessage` パラメータを使用
- [ ] テストで両言語（英語・日本語）の出力を確認
- [ ] 技術詳細（ファイルパス、エラーコード等）が適切に保持されているか確認

#### カスタムメッセージが必要なケース

以下の場合は、`customMessage` パラメータを使用してください:

1. **詳細な技術情報を含むエラー**:

   ```typescript
   createConfigurationError(
     'file_size_limit',
     '10KB 20MB',
     'Multiple units detected. Use single value like "10KB" or "20MB"'
   );
   ```

2. **動的な翻訳が不可能な場合**:

   ```typescript
   const errorDetails = generateComplexErrorMessage();
   createParseError(input, errorDetails);
   ```

### ベストプラクティス

#### 1. 翻訳キーの命名規則

- **名前空間**: `errors`, `logs`, `summary` を使用
- **カテゴリ分け**: 関連するエラーをカテゴリでグループ化
  - `configuration.*` - 設定エラー
  - `github.*` - GitHub APIエラー
  - `fileSystem.*` - ファイルシステムエラー
  - `parsing.*` - パースエラー
  - `analysis.*` - 分析エラー
  - `pattern.*` - パターンマッチングエラー
  - `violation.*` - 制限違反エラー
- **変数補間**: `{{variable}}` 形式を使用

#### 2. 技術詳細の扱い

- **翻訳しない**: ファイルパス、エラーコード、HTTPステータスコード
- **変数補間で保持**: `{{path}}`, `{{code}}`, `{{message}}` などを使用
- **エラーオブジェクトに保持**: `error.path`, `error.status` などのプロパティに格納

#### 3. テストパターン

```typescript
describe('Error Factory i18n', () => {
  // 英語テスト
  it('should return English message', () => {
    initializeI18n({ language: 'en' } as Config);
    const error = createXxxError(...);
    expect(error.message).toContain('Expected English text');
  });

  // 日本語テスト
  it('should return Japanese message', () => {
    initializeI18n({ language: 'ja' } as Config);
    const error = createXxxError(...);
    expect(error.message).toContain('期待される日本語テキスト');
  });

  // 技術詳細保持テスト
  it('should preserve technical details', () => {
    const error = createXxxError('/path/to/file');
    expect(error.path).toBe('/path/to/file');
    expect(error.message).toContain('/path/to/file');
  });
});
```

#### 4. 後方互換性

- 既存のエラーファクトリー関数は、`customMessage` パラメータをサポート
- `customMessage` を渡すと、翻訳をバイパスしてカスタムメッセージを使用
- 既存コードは変更なしで動作（破壊的変更なし）

### よくある質問 (FAQ)

#### Q1: カスタムメッセージと翻訳キーの使い分けは？

**A**: 基本的には翻訳キーを使用し、以下の場合のみカスタムメッセージを使用します:

- 詳細な技術情報を含むエラー（翻訳リソースに収まらない）
- 動的に生成されるエラーメッセージ
- 一時的な対応（翻訳リソース登録前）

#### Q2: 翻訳リソースに新しいキーを追加した後、型エラーが出る

**A**: `pnpm build` を実行して型定義を再生成してください。`scripts/generate-i18n-types.ts` が自動的に型定義を更新します。

#### Q3: 既存のエラーメッセージを翻訳対応にするには？

**A**: 移行チェックリストに従って以下を実施:

1. 翻訳リソースにキーを追加
2. `customMessage` パラメータを削除
3. テストで両言語の出力を確認

#### Q4: 英語と日本語以外の言語をサポートしたい

**A**: 現在は `en` と `ja` のみサポートしています。他の言語を追加するには:

1. `src/locales/{lang}/` ディレクトリを追加
2. `src/types/i18n.d.ts` の `LanguageCode` に言語コードを追加
3. `src/i18n.ts` の `normalizeLanguageCode` 関数を更新

#### Q5: エラーメッセージに複数の変数を含めたい

**A**: 翻訳リソースで複数の変数を定義できます:

```json
{
  "myError": "Error in {{file}} at line {{line}}: {{message}}"
}
```

```typescript
t('errors', 'myError', { file: 'test.ts', line: 42, message: 'syntax error' });
// => "Error in test.ts at line 42: syntax error"
```

---

## 📚 関連ドキュメント

- [README.md](../README.md) - 基本的な使用方法
- [action.yml](../action.yml) - アクション定義
- [pattern-matcher.ts](../src/pattern-matcher.ts) - デフォルト除外パターン一覧
- [src/errors/factories.ts](../src/errors/factories.ts) - エラーファクトリー実装
- [src/locales/](../src/locales/) - 翻訳リソース
- [**tests**/error-factories-i18n.test.ts](../__tests__/error-factories-i18n.test.ts) - i18nテスト
