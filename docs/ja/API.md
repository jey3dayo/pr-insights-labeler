# 📘 API仕様書

**対象**: 開発者
**タグ**: `category/api`, `audience/developer`, `environment/development`

**言語**: 日本語（英語版は未整備）

PR Insights Labeler の入力・出力仕様、エラー種別、およびエラーファクトリーの多言語化（i18n）仕様をまとめたリファレンスです。

## 📥 Inputs

### 基本制限パラメータ

#### `file_size_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"100KB"`
- **説明**: 個別ファイルのサイズ上限を指定します
- **フォーマット**: 数値＋単位（`B`、`KB`、`MB`、`GB`）または数値のみ（バイト）
- バリデーション:
  - 単位の大文字・小文字は区別しません
  - 複数の単位を含む場合はエラーになります（例: `"10KB 20MB"`）
  - 負の値は指定できません
- 使用例:

  ```yaml
  file_size_limit: "100KB"    # 100キロバイト
  file_size_limit: "1.5MB"    # 1.5メガバイト
  file_size_limit: "500000"   # 500,000バイト
  ```

#### `file_size_limit_enabled`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: ファイルサイズチェックの有効・無効を切り替えます（`"false"` にすると `file_size_limit` による違反検出とラベル付与をスキップします）
- 使用例:

  ```yaml
  file_size_limit_enabled: "false"  # サイズ違反を無効化
  ```

#### `file_lines_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"500"`
- **説明**: 個別ファイルの行数上限を指定します（diff の追加行数ではなく、ファイル全体の行数が対象です）
- バリデーション:
  - 正の整数のみ指定できます
  - 数値以外はエラーになります
- 使用例:

  ```yaml
  file_lines_limit: "500"
  file_lines_limit: "1000"
  ```

#### `file_lines_limit_enabled`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: ファイル行数チェックの有効・無効を切り替えます（`"false"` にすると `file_lines_limit` による違反検出とラベル付与をスキップします）
- 使用例:

  ```yaml
  file_lines_limit_enabled: "false"  # 行数違反を無効化
  ```

#### `pr_additions_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"5000"`
- **説明**: PR 全体の追加行数上限を指定します（diff ベースで計算し、削除行数は含みません）
- **バリデーション**: 正の整数のみ指定できます
- 使用例:

  ```yaml
  pr_additions_limit: "5000"
  pr_additions_limit: "1000"
  ```

#### `pr_additions_limit_enabled`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: PR 全体の追加行数チェックの有効・無効を切り替えます（`"false"` にすると `pr_additions_limit` による違反検出とラベル付与をスキップします）
- 使用例:

  ```yaml
  pr_additions_limit_enabled: "false" # 追加行数チェックを無効化
  ```

#### `pr_files_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"50"`
- **説明**: PR 内の最大変更ファイル数を指定します（削除されたファイルは含みません）
- **バリデーション**: 正の整数のみ指定できます
- 使用例:

  ```yaml
  pr_files_limit: "50"
  pr_files_limit: "100"
  ```

#### `pr_files_limit_enabled`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: PR 内のファイル数チェックの有効・無効を切り替えます（`"false"` にすると `pr_files_limit` による違反検出とラベル付与をスキップします）
- 使用例:

  ```yaml
  pr_files_limit_enabled: "false" # ファイル数チェックを無効化
  ```

---

### ラベル設定パラメータ

#### `apply_size_labels`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: 内部パラメータです（PR Insights Labeler のサイズラベルが自動で適用されます）
- 使用例:

  ```yaml
  apply_size_labels: "true"
  ```

#### `size_label_thresholds`

- **型**: `string` (JSON)
- **必須**: ❌
- **デフォルト**: `'{"S": {"additions": 100, "files": 10}, "M": {"additions": 500, "files": 30}, "L": {"additions": 1000, "files": 50}}'`
- **説明**: 内部パラメータです（サイズラベルのしきい値は `.github/pr-labeler.yml` で設定してください）
- バリデーション:
  - `S`、`M`、`L` の3つのサイズ定義が必須です
  - 各サイズに `additions` と `files` フィールドが必須です
  - 値は非負の整数のみ指定できます
  - `additions` と `files` のそれぞれについて、`S ≤ M ≤ L` の単調性を満たす必要があります
- 使用例:

  ```yaml
  size_label_thresholds: '{"S": {"additions": 50, "files": 5}, "M": {"additions": 200, "files": 15}, "L": {"additions": 500, "files": 30}}'
  ```

- エラーパターン:
  - 必須フィールド欠如: `Missing required size thresholds (S, M, L)`
  - 単調性違反: `Size thresholds must be monotonic (S ≤ M ≤ L for additions)`
  - 負の値: `Threshold values for size S must be non-negative`

#### `large_files_label`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"auto/large-files"`
- **説明**: ファイルサイズまたは行数の制限違反を検出した際に付与するラベル名です
- 使用例:

  ```yaml
  large_files_label: "auto/large-files"
  large_files_label: "needs-splitting"
  ```

#### `too_many_files_label`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"auto/too-many-files"`
- **説明**: 変更ファイル数の制限違反を検出した際に付与するラベル名です
- 使用例:

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
- **説明**: Draft PR をスキップし、解析を実行しないようにします
- 使用例:

  ```yaml
  skip_draft_pr: "true"   # Draft PRをスキップ
  skip_draft_pr: "false"  # Draft PRも分析
  ```

#### `comment_on_pr`

- **型**: `string` (enum)
- **必須**: ❌
- **デフォルト**: `"auto"`
- **説明**: PR へのコメント投稿モードを指定します
- 指定可能な値:
  - `"auto"`: 違反がある場合のみコメントを投稿し、違反が解消されたらコメントを削除します
  - `"always"`: 常にコメントを投稿します
  - `"never"`: コメントを投稿しません（既存のコメントは削除します）
- 使用例:

  ```yaml
  comment_on_pr: "auto"     # 違反時のみコメント
  comment_on_pr: "always"   # 常にコメント
  comment_on_pr: "never"    # コメントなし
  ```

#### `fail_on_large_files`

- **型**: `string` (`""` | `"true"` | `"false"`)
- **必須**: ❌
- **デフォルト**: `""`（無効）
- **説明**: 大きなファイル（`auto/large-files` ラベルまたはサイズ違反）を検出したときにワークフローを失敗させます
- **判定条件**: `auto/large-files` ラベルが付与された場合、または実際のファイルサイズ違反が検出された場合
- 使用例:

  ```yaml
  fail_on_large_files: "true"   # 大きなファイル検出時に失敗
  fail_on_large_files: ""       # 無効（デフォルト）
  ```

#### 🆕 `fail_on_too_many_files`

- **型**: `string` (`""` | `"true"` | `"false"`)
- **必須**: ❌
- **デフォルト**: `""`（無効）
- **説明**: ファイル数超過（`auto/too-many-files` ラベルまたはファイル数違反）を検出したときにワークフローを失敗させます
- **判定条件**: `auto/too-many-files` ラベルが付与された場合、または実際のファイル数違反が検出された場合
- 使用例:

  ```yaml
  fail_on_too_many_files: "true"  # ファイル数超過時に失敗
  fail_on_too_many_files: ""      # 無効（デフォルト）
  ```

#### 🆕 `fail_on_pr_size`

- **型**: `string` (`""` | `"small"` | `"medium"` | `"large"` | `"xlarge"` | `"xxlarge"`)
- **必須**: ❌
- **デフォルト**: `""`（無効）
- **説明**: PR サイズが指定したしきい値以上になったときにワークフローを失敗させます
- 判定条件:
  - 適用されたサイズラベル（`size/large` など）、または
  - 実際の追加行数から算出されたサイズカテゴリ
- **依存関係**: `size_enabled: "true"` が必要です（このオプションを指定した状態で `size_enabled: "false"` にすると `ConfigurationError` になります）
- **バリデーション**: 無効な値を指定した場合は `ConfigurationError` を返します
- 使用例:

  ```yaml
  fail_on_pr_size: "large"      # PRサイズがlarge以上で失敗
  fail_on_pr_size: "xlarge"     # PRサイズがxlarge以上で失敗
  fail_on_pr_size: ""           # 無効（デフォルト）
  ```

- **サイズ順序**: `small < medium < large < xlarge < xxlarge`
- **しきい値の例**（デフォルト設定）:
  - `small`: 200 行未満
  - `medium`: 200〜499 行
  - `large`: 500〜999 行
  - `xlarge`: 1,000〜2,999 行
  - `xxlarge`: 3,000 行以上

#### `enable_summary`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: GitHub Actions Summary へ PR メトリクスを出力するかどうかを指定します
- 動作:
  - `"true"`: 解析結果を Actions Summary に表示します
  - `"false"`: Summary の出力をスキップします
- 使用例:

  ```yaml
  enable_summary: "true"   # Summary出力を有効化（デフォルト）
  enable_summary: "false"  # Summary出力を無効化
  ```

- 注意:
  - Summary の書き込みに失敗しても非致命的エラーとして扱い、警告ログを出力してアクションを継続します
  - ラベル付与やコメント投稿の機能とは独立して動作します

---

### 除外設定パラメータ

#### `additional_exclude_patterns`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `""`
- **説明**: デフォルトの除外パターンに追加で適用する除外パターンを指定します
- **フォーマット**: カンマ区切りまたは改行区切り
- **パターン構文**: `minimatch`（glob）
- 特殊処理:
  - `#` で始まる行はコメントとして無視します
  - 空行は無視します
  - 重複するパターンは自動で取り除きます
- 使用例:

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
- **説明**: GitHub API 認証に使用するトークンを指定します
- **優先順位**: `github_token` 入力 > `GITHUB_TOKEN` 環境変数 > `GH_TOKEN` 環境変数
- 権限要件:
  - `pull-requests: write` - ラベルの管理に必要です
  - `issues: write` - コメントの投稿に必要です
  - `contents: read` - ファイルの読み取りに必要です
- 使用例:

  ```yaml
  github_token: ${{ secrets.GITHUB_TOKEN }}
  ```

- エラーパターン:
  - トークン未設定: `GitHub token is required. Set github_token input or GITHUB_TOKEN/GH_TOKEN environment variable`

---

### 🌐 多言語設定パラメータ

#### `language`（設定ファイル: `.github/pr-labeler.yml`）

- **型**: `string`
- **必須**: ❌
- **デフォルト**: なし（優先順位チェーンの最終段で `'en'` を使用します）
- **説明**: 出力メッセージ、エラーメッセージ、ログ、PR コメントの表示言語を指定します
- **サポート言語**: `"en"` (English)、`"ja"` (日本語)
- 優先順位:
  1. GitHub Actions ワークフローの `with.language`
  2. `.github/pr-labeler.yml` の `language` フィールド
  3. 環境変数（`LANGUAGE` → `LANG`）
  4. デフォルト: `'en'` (English)
- 使用例:

  ```yaml
  # .github/pr-labeler.yml
  language: ja  # 日本語で出力

  size:
    thresholds:
      small: 100
      medium: 500
      large: 1000
  ```

  環境変数で指定する場合の例です。

  ```yaml
  # .github/workflows/pr-check.yml
  - uses: jey3dayo/pr-insights-labeler@v1
    with:
      github_token: ${{ secrets.GITHUB_TOKEN }}
    env:
      LANGUAGE: ja  # workflow input / pr-labeler.yml 未指定時のフォールバック
  ```

- 動作:
  - GitHub Actions Summary、エラーメッセージ、ログ、PR コメントが指定した言語で出力されます
  - GitHub API 呼び出しに使うラベル名（`label` フィールド）は常に英語のまま扱われます
  - カスタムラベルの表示名は `display_name` で多言語対応できます

#### `display_name`（カテゴリ設定の多言語表示名）

- **型**: `object`
- **必須**: ❌
- **説明**: カテゴリラベルの多言語表示名を指定します
- 構造:

  ```typescript
  {
    en: string;  // 英語表示名
    ja: string;  // 日本語表示名
  }
  ```

- 優先順位:
  1. `.github/pr-labeler.yml` の `display_name`（カスタム翻訳）
  2. 組み込みの翻訳リソース（`labels` 名前空間）
  3. ラベル名そのまま

- 使用例:

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

    - label: 'category/documentation'
      patterns:
        - 'docs/**'
        - '**/*.md'
      display_name:
        en: 'Documentation'
        ja: 'ドキュメント'
  ```

- 動作:
  - GitHub Actions Summary や PR コメントで、現在の言語に応じた表示名が使われます
  - たとえば `language: ja` の場合は「テストファイル」と表示されます
  - GitHub API 上では常に英語のラベル名（`label: 'category/tests'`）が使用されます

- バリデーション:
  - `display_name` を設定する場合は、`en` と `ja` の両方が必須です
  - どちらか一方しか指定しない場合はエラーになります

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
- **説明**: サイズまたは行数の制限を超過したファイルの詳細一覧です
- 構造:

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

- 使用例:

  ```yaml
  - name: Check large files
    if: steps.metrics.outputs.large_files != '[]'
    run: echo "Large files detected: ${{ steps.metrics.outputs.large_files }}"
  ```

### `pr_additions`

- **型**: `string`
- **説明**: PR 全体の総追加行数です（diff ベース）
- **例**: `"1523"`

### `pr_files`

- **型**: `string`
- **説明**: PR 内の総変更ファイル数です（削除されたファイルは含みません）
- **例**: `"42"`

### `exceeds_file_size`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: いずれかのファイルがサイズ制限を超過しているかを示します
- 使用例:

  ```yaml
  - name: Notify on large files
    if: steps.metrics.outputs.exceeds_file_size == 'true'
    run: echo "⚠️ Large files detected!"
  ```

### `exceeds_file_lines`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: いずれかのファイルが行数制限を超過しているかを示します

### `exceeds_additions`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: PR 全体の追加行数が制限を超過しているかを示します

### `exceeds_file_count`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: PR の変更ファイル数が制限を超過しているかを示します

### `has_violations`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: いずれかの制限違反が存在するかを示します（上記フラグの論理和です）
- 使用例:

  ```yaml
  - name: Block merge on violations
    if: steps.metrics.outputs.has_violations == 'true'
    run: exit 1
  ```

---

## 🚨 エラーパターンと対処法

### ConfigurationError

設定パラメータの検証に失敗したときに発生するエラーです。

#### よくあるエラー

1. ファイルサイズの解析に失敗した場合:

   ```
   [ConfigurationError] Invalid file size format: '10KB 20MB'.
   Multiple units detected. Use single value like '10KB' or '20MB'
   ```

   **対処**: 単一のサイズ値のみを指定してください。

2. 数値の解析に失敗した場合:

   ```
   [ConfigurationError] File lines limit must be a number
   ```

   **対処**: 数値文字列を指定してください（例: `"500"`）。

3. トークンが未設定の場合:

   ```
   [ConfigurationError] GitHub token is required.
   Set github_token input or GITHUB_TOKEN/GH_TOKEN environment variable
   ```

   **対処**: `github_token` を明示的に設定してください。

### ParseError

JSON の解析やバリデーションに失敗したときに発生するエラーです。

#### よくあるエラー

1. JSON の構文エラー:

   ```
   [ParseError] Invalid JSON for size thresholds
   ```

   **対処**: 正しい JSON 形式で記述してください。

2. 必須フィールドの欠如:

   ```
   [ParseError] Missing required size thresholds (S, M, L)
   ```

   **対処**: `S`、`M`、`L` のすべてを定義してください。

3. 単調性の違反:

   ```
   [ParseError] Size thresholds must be monotonic (S ≤ M ≤ L for additions)
   ```

   **対処**: `S ≤ M ≤ L` の順序を満たすように値を設定してください。

### GitHubAPIError

GitHub API の呼び出しに失敗したときに発生するエラーです。

#### よくあるエラー

1. 権限不足:

   ```
   [GitHubAPIError] Failed to update labels: Resource not accessible by integration
   ```

   **対処**: ワークフローに適切な `permissions` を設定してください。

2. レート制限:

   ```
   [GitHubAPIError] API rate limit exceeded
   ```

   **対処**: 時間をおいて再実行するか、ワークフローの実行頻度を調整してください。

3. ネットワークエラー:

   ```
   [GitHubAPIError] Failed to fetch diff files: Network error
   ```

   **対処**: 再実行するか、GitHub Status で障害情報を確認してください。

### FileAnalysisError

個別ファイルの解析に失敗したときに発生する非致命的なエラーです。

#### よくあるエラー

1. ファイルの読み取り失敗:

   ```
   [FileAnalysisError] Failed to read file src/test.ts: ENOENT
   ```

   **対処**: 該当ファイルは `filesWithErrors` に記録され、残りのファイルの解析は継続します。

2. 行数カウントの失敗:

   ```
   [FileAnalysisError] Failed to count lines in src/binary.dat
   ```

   **対処**: バイナリファイルは自動でスキップされ、解析は継続します。

---

## 💡 使用例とベストプラクティス

### 基本的な使用パターン

#### 1. シンプル設定（推奨）

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

#### 動作

- デフォルトの制限値を使用します
- 違反がある場合のみコメントを投稿します（`comment_on_pr: auto`）
- サイズラベルを自動で付与します
- GitHub Actions Summary に結果を出力します
- 違反があってもワークフロー自体は失敗させずに継続します

#### 2. カスタム制限

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    file_size_limit: "200KB"
    file_lines_limit: "800"
    pr_additions_limit: "2000"
    pr_files_limit: "30"
```

#### 3. 厳格モード

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    file_size_limit: "100KB"
    file_lines_limit: "300"
    pr_additions_limit: "500"
    fail_on_large_files: "true"    # 大きなファイル検出時に失敗
    fail_on_too_many_files: "true" # ファイル数超過時に失敗
    comment_on_pr: "always"        # 常にコメント
```

#### 4. Summary 出力のみ

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
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

#### 1. Slack 通知との連携

```yaml
- name: Check PR Metrics
  id: metrics
  uses: jey3dayo/pr-insights-labeler@v1
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
  uses: jey3dayo/pr-insights-labeler@v1
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
- uses: jey3dayo/pr-insights-labeler@v1
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

#### 4. フォークからの PR（セキュリティ考慮）

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
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - name: Check out the event PR head for analysis
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        shell: bash
        run: |
          git fetch --no-tags origin "refs/pull/${PR_NUMBER}/head"
          FETCHED_SHA="$(git rev-parse FETCH_HEAD)"
          if [[ "$FETCHED_SHA" != "$HEAD_SHA" ]]; then
            echo "PR head changed after this workflow was queued; refusing to analyze a different revision." >&2
            exit 1
          fi
          git checkout --detach "$FETCHED_SHA"

      - uses: jey3dayo/pr-insights-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

**注意**: `pull_request_target` はフォークからの PR でもベースリポジトリのコンテキストで実行されるため、セキュリティリスクがあります。リスクを理解したうえで、安全なワークフロー構成でのみ使用してください。なお、このイベントでは `.github/pr-labeler.yml` と `.github/directory-labeler.yml` のどちらも、ローカルチェックアウトの内容にかかわらず GitHub API 経由でベースの参照から読み込まれます。

上記のチェックアウトステップは、ワークフローがキューに入ったあとに PR が更新された場合、意図的に失敗する設計になっています。解析対象は常にイベントペイロードに記録された head SHA のみとし、PR の更新後に起動する新しい `synchronize` 実行が最新の head を解析します。**このステップには `continue-on-error` を付けないでください。** チェックアウト失敗を無視すると base のチェックアウトのままジョブが続き、行数や複雑度のようにローカルファイルを読む解析が PR head ではなく base リビジョンに対して計算されてしまいます。第二の防御として、アクション本体も `pull_request_target` 実行時は解析前にローカルの `HEAD` がイベントの head SHA と一致するかを検証し、一致しない場合は失敗させます。詳細は [advanced-usage.md](advanced-usage.md#フォークprの取り扱い) を参照してください。

---

## 🛡️ セキュリティとベストプラクティス

### トークンの取り扱い

- **推奨**: `${{ secrets.GITHUB_TOKEN }}` を使用します（自動生成され、スコープが限定されます）
- **非推奨**: Personal Access Token の使用は避けてください（不要な権限を持つ可能性があります）
- **自動マスキング**: トークンは `core.setSecret()` によってログから自動でマスクされます

### 権限の最小化

```yaml
permissions:
  pull-requests: write  # ラベル管理に必要
  issues: write         # コメント投稿に必要
  contents: read        # ファイル読み取りに必要
  # 他の権限は不要
```

### エラーハンドリング

- **非致命的エラー**: Summary の書き込み失敗やコメント投稿の失敗は警告ログのみを出力して継続します
- **致命的エラー**: 設定エラー、トークン未設定、PR 以外のイベントでの実行時は失敗として終了します
- **ワークフロー失敗制御**: `fail_on_large_files`、`fail_on_too_many_files`、`fail_on_pr_size` によって任意の失敗条件を設定できます

### パフォーマンス

- **大規模 PR 対応**: 100 ファイル以上の PR でも安定して処理できます
- **メモリ効率**: ストリーミング I/O を活用し、メモリ消費を抑えています
- **API 効率**: ページネーション、バッチ処理、キャッシュを組み合わせて API 呼び出しを最小化しています

---

## 🌍 エラーファクトリーの多言語化 (i18n Integration)

### 概要

すべてのエラーファクトリー関数は、i18next ベースの翻訳システムと連携しています。エラーメッセージは設定された言語（英語または日本語）に応じて自動で翻訳されます。

### サポートする言語

- `en` (English) - デフォルト
- `ja` (日本語)

### エラーファクトリー関数の基本シグネチャ

すべてのエラーファクトリー関数は、次のシグネチャパターンに従います。

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

#### 2. カスタムメッセージ（翻訳をスキップ）

```typescript
// 任意の言語環境
const error = createConfigurationError('field', 'value', 'Custom error message');
// => message: "Custom error message" (翻訳されない)
```

### エラーファクトリー関数リファレンス

#### createConfigurationError

設定パラメータの検証エラーを生成します。

```typescript
createConfigurationError(
  field: string,
  value: unknown,
  customMessage?: string
): ConfigurationError
```

**翻訳キー**: `errors.configuration.invalidField`

#### パラメータ

- `field`: 設定フィールド名（例: `"language"`、`"file_size_limit"`）
- `value`: 不正な値（デバッグ用にエラーオブジェクトへ保持します）
- `customMessage`: 任意のカスタムエラーメッセージ

#### 例

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

GitHub API 呼び出し時のエラーを生成します。

```typescript
createGitHubAPIError(
  message: string,
  status?: number
): GitHubAPIError
```

**翻訳キー**: `errors.github.apiError`

#### パラメータ

- `message`: エラーの詳細メッセージ（API レスポンスから取得します）
- `status`: 任意の HTTP ステータスコード

#### 例

```typescript
// EN: "GitHub API error: API request failed"
const error = createGitHubAPIError('API request failed', 404);

// JA: "GitHub APIエラー: APIリクエストが失敗しました"
initializeI18n({ language: 'ja' } as Config);
const errorJa = createGitHubAPIError('APIリクエストが失敗しました', 404);
```

#### createFileSystemError

ファイルシステム操作のエラーを生成します。

```typescript
createFileSystemError(
  path: string,
  operation?: 'read' | 'write' | 'notFound' | 'permission',
  customMessage?: string
): FileSystemError
```

#### 翻訳キー

- `errors.fileSystem.readError` - ファイル読み込みエラー
- `errors.fileSystem.writeError` - ファイル書き込みエラー
- `errors.fileSystem.fileNotFound` - ファイル未検出エラー
- `errors.fileSystem.permissionDenied` - 権限エラー

#### パラメータ

- `path`: ファイルパス（技術詳細としてそのまま保持します）
- `operation`: 任意の操作種別（デフォルトは `'read'`）
- `customMessage`: 任意のカスタムエラーメッセージ

#### 例

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

JSON などの解析・検証エラーを生成します。

```typescript
createParseError(
  input: string,
  customMessage?: string
): ParseError
```

**翻訳キー**: `errors.parsing.invalidFormat`

#### パラメータ

- `input`: 不正な入力文字列（技術詳細としてそのまま保持します）
- `customMessage`: 任意のカスタムエラーメッセージ

#### 例

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

個別ファイルの解析エラー（非致命的）を生成します。

```typescript
createFileAnalysisError(file: string): FileAnalysisError
```

**翻訳キー**: `errors.analysis.fileAnalysisError`

#### パラメータ

- `file`: ファイルパス

#### 例

```typescript
// EN: "Failed to analyze file: src/test.ts"
const error = createFileAnalysisError('src/test.ts');

// JA: "ファイルの分析に失敗しました: src/test.ts"
initializeI18n({ language: 'ja' } as Config);
const errorJa = createFileAnalysisError('src/test.ts');
```

#### createDiffError

差分（diff）取得時のエラーを生成します。

```typescript
createDiffError(
  source: 'local-git' | 'github-api',
  customMessage?: string
): DiffError
```

**翻訳キー**: `errors.analysis.diffError`

#### 例

```typescript
// EN: "Failed to get diff: git command failed"
const error = createDiffError('local-git', 'git command failed');

// JA: "差分の取得に失敗しました: gitコマンドが失敗しました"
initializeI18n({ language: 'ja' } as Config);
const errorJa = createDiffError('local-git', 'gitコマンドが失敗しました');
```

#### createPatternError

パターンマッチングのエラーを生成します。

```typescript
createPatternError(pattern: string): PatternError
```

**翻訳キー**: `errors.pattern.invalidPattern`

#### 例

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

翻訳されたエラーメッセージであっても、ファイルパスやステータスコードなどの技術詳細は**変更せずにそのまま保持**します。

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

#### `errors.json` の構造

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

#### ステップ1: 翻訳リソースにキーを追加する

`src/locales/en/errors.json` と `src/locales/ja/errors.json` の両方に翻訳キーを追加します。

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

#### ステップ2: エラー型定義を追加する

`src/errors/types.ts` にエラー型を定義します。

```typescript
export type MyNewError = {
  type: 'MyNewError';
  message: string;
  detail: string;
};
```

#### ステップ3: エラーファクトリー関数を実装する

`src/errors/factories.ts` にファクトリー関数を追加します。

```typescript
export const createMyNewError = (detail: string, customMessage?: string): MyNewError => ({
  type: 'MyNewError',
  message: customMessage || t('errors', 'myCategory.myNewError', { detail }),
  detail,
});
```

#### ステップ4: テストを追加する

`__tests__/error-factories-i18n.test.ts` に英語・日本語のテストを追加します。

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

#### ステップ5: 型定義を再生成する

```bash
pnpm build
```

このコマンドにより `scripts/generate-i18n-types.ts` が実行され、翻訳キーの型定義が自動で更新されます。

### 既存コードの移行ガイド

#### 移行前（ハードコードされたメッセージ）

```typescript
throw createConfigurationError('field', value, 'Hard-coded English message');
```

#### 移行後（翻訳キーを使用）

```typescript
// カスタムメッセージを削除し、翻訳キーに依存
throw createConfigurationError('field', value);
```

#### 移行チェックリスト

- [ ] 翻訳リソース（`src/locales/*/errors.json`）に対応するキーがあるか確認しています
- [ ] カスタムメッセージが必要な箇所にのみ `customMessage` パラメータを使っています
- [ ] テストで英語・日本語の両方の出力を確認しています
- [ ] ファイルパスやエラーコードなどの技術詳細が適切に保持されているか確認しています

#### カスタムメッセージが必要なケース

次のような場合は、`customMessage` パラメータを使用してください。

1. 翻訳リソースに収まりにくい詳細な技術情報を含むエラーの場合:

   ```typescript
   createConfigurationError(
     'file_size_limit',
     '10KB 20MB',
     'Multiple units detected. Use single value like "10KB" or "20MB"'
   );
   ```

2. 動的に組み立てる必要があり、固定の翻訳キーで表現できない場合:

   ```typescript
   const errorDetails = generateComplexErrorMessage();
   createParseError(input, errorDetails);
   ```

### ベストプラクティス

#### 1. 翻訳キーの命名規則

- **名前空間**: `errors`、`logs`、`summary` を使用します
- **カテゴリ分け**: 関連するエラーをカテゴリ単位でまとめます
  - `configuration.*` - 設定エラー
  - `github.*` - GitHub API エラー
  - `fileSystem.*` - ファイルシステムエラー
  - `parsing.*` - パースエラー
  - `analysis.*` - 分析エラー
  - `pattern.*` - パターンマッチングエラー
  - `violation.*` - 制限違反エラー
- **変数補間**: `{{variable}}` 形式を使用します

#### 2. 技術詳細の扱い

- **翻訳しない**: ファイルパス、エラーコード、HTTP ステータスコードは翻訳しません
- **変数補間で保持**: `{{path}}`、`{{code}}`、`{{message}}` などのプレースホルダーで埋め込みます
- **エラーオブジェクトに保持**: `error.path` や `error.status` などのプロパティにも格納します

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

- 既存のエラーファクトリー関数はすべて `customMessage` パラメータを引き続き受け付けます
- `customMessage` を渡した場合は翻訳をスキップしてその文字列をそのまま使用します
- 既存コードは書き換えなくても動作するため、破壊的変更はありません

### よくある質問 (FAQ)

#### Q1: カスタムメッセージと翻訳キーはどう使い分けますか？

**A**: 原則として翻訳キーを使用し、次のいずれかに当てはまる場合のみカスタムメッセージを使用します。

- 詳細な修正案内や技術情報を含み、翻訳リソースに収まらないエラー
- 実行時に動的に組み立てられるエラーメッセージ
- 翻訳リソースへ登録する前の一時的な対応

#### Q2: 翻訳リソースに新しいキーを追加したあと、型エラーが出ます

**A**: `pnpm build` を実行して型定義を再生成してください。`scripts/generate-i18n-types.ts` により翻訳キーの型定義が自動で更新されます。

#### Q3: 既存のエラーメッセージを翻訳対応にする手順を教えてください

**A**: 移行チェックリストに沿って、次の手順で進めます。

1. 翻訳リソースにキーを追加します
2. 呼び出し側の `customMessage` パラメータを削除します
3. テストで英語・日本語の両方の出力を確認します

#### Q4: 英語と日本語以外の言語を追加したいです

**A**: 現在は `en` と `ja` のみをサポートしています。新しい言語を追加する場合は、次の3箇所を更新してください。

1. `src/locales/{lang}/` ディレクトリを追加します
2. `src/types/i18n.d.ts` の `LanguageCode` に言語コードを追加します
3. `src/i18n.ts` の `normalizeLanguageCode` 関数を更新します

#### Q5: エラーメッセージに複数の変数を埋め込めますか？

**A**: はい、翻訳リソースに複数のプレースホルダーを定義して補間できます。

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
- [action.yml](../../action.yml) - アクション定義
- [pattern-matcher.ts](../../src/pattern-matcher.ts) - デフォルト除外パターン一覧
- [src/errors/factories.ts](../../src/errors/factories.ts) - エラーファクトリー実装
- [src/locales/](../../src/locales/) - 翻訳リソース
- [**tests**/error-factories-i18n.test.ts](../../__tests__/error-factories-i18n.test.ts) - i18n テスト
