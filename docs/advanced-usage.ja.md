# 高度な使用例

PR Insights Labelerの実践的な例と高度な設定です。

## 目次

- [フォークPRの取り扱い](#フォークprの取り扱い)
- [条件付き実行](#条件付き実行)
- [厳格モード](#厳格モード)
- [サマリー専用モード](#サマリー専用モード)
- [ラベルの選択的有効化](#ラベルの選択的有効化)
- [PR Insights Labeler YAML設定](#pr-insights-labeler-yaml設定)
- [ディレクトリベースのラベリング](#ディレクトリベースのラベリング)
- [多言語サポート](#多言語サポート)

## フォークPRの取り扱い

フォークからのPRを処理する場合、権限が制限されます。適切なアクセスのために `pull_request_target` イベントを使用してください。

### セキュリティ上の考慮事項

⚠️ **重要**: `pull_request_target` はベースリポジトリのコンテキストで実行され、書き込み権限が付与されます。このイベントは必要な場合にのみ使用し、セキュリティへの影響を理解した上で使用してください。

- **リスク**: フォークPR内の悪意あるコードがシークレットにアクセスする可能性
- **緩和策**: このアクションはファイルの読み取りとラベルの適用のみを行い、PRからのコードは実行しません
- **ベストプラクティス**: ワークフローを承認する前にフォークPRをレビュー

### 設定例

```yaml
name: PR Check (Fork-friendly)

on:
  pull_request_target:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest

    permissions:
      pull-requests: write  # ラベル管理
      issues: write         # コメント投稿
      contents: read        # ファイル読み取り

    steps:
      - uses: actions/checkout@v4
        with:
          # 重要: ベースブランチではなく、PRのコードをチェックアウト
          ref: ${{ github.event.pull_request.head.sha }}

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### 使用すべき場合

- ✅ 外部コントリビューションを受け入れるオープンソースプロジェクト
- ✅ フォークPRがあるパブリックリポジトリ
- ❌ プライベートリポジトリ（代わりに `pull_request` イベントを使用）

## 条件付き実行

特定のファイルやパスが変更された場合にのみPR Insights Labelerを実行します。

### 特定ファイルのスキップ

```yaml
name: PR Check

on:
  pull_request:
    # これらのパスに対してのみ実行
    paths:
      - 'src/**'
      - '!src/**/*.test.ts'  # テストファイルを除外

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # 除外する追加パターン
          additional_exclude_patterns: |
            **/*.generated.ts
            **/*.min.js
```

### ラベルによるスキップ

特定のラベルが存在する場合にPR Insights Labelerをスキップ:

```yaml
name: PR Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest
    # PRに "skip-check" ラベルがある場合はスキップ
    if: "!contains(github.event.pull_request.labels.*.name, 'skip-check')"

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### ブランチによるスキップ

特定のブランチをスキップ:

```yaml
name: PR Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest
    # リリースブランチをスキップ
    if: "!startsWith(github.head_ref, 'release/')"

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## 厳格モード

違反が検出された場合にワークフローを失敗させます。コード品質基準の強制に便利です。

### 例: 大きなファイルで失敗

```yaml
name: PR Check (Strict)

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest

    permissions:
      pull-requests: write
      issues: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          file_size_limit: "100KB"
          file_lines_limit: "300"
          pr_additions_limit: "500"
          fail_on_large_files: "true"       # ファイルが制限を超えた場合失敗
          fail_on_too_many_files: "true"    # ファイル数が多すぎる場合失敗
          fail_on_pr_size: "large"          # PRサイズが "large" 以上で失敗
          size_enabled: "true"              # fail_on_pr_size に必要
          comment_on_pr: "always"           # 違反時は常にコメント
```

### 厳格モードのユースケース

- ✅ 大きな変更にレビューが必要なミッションクリティカルなコードベース
- ✅ コードスタイルと複雑度の基準を強制
- ✅ 大きなファイルの誤コミットを防止
- ❌ オープンソースプロジェクト（コントリビューションを妨げる可能性）

## サマリー専用モード

ラベルやコメントを適用せずに、GitHub Actions Summaryで可視性を提供します。

### 例: 読み取り専用分析

```yaml
name: PR Analysis (Summary Only)

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  analyze:
    runs-on: ubuntu-latest

    permissions:
      contents: read  # 読み取りのみ必要

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}

          # すべてのラベルを無効化
          size_enabled: "false"
          complexity_enabled: "false"
          category_enabled: "false"
          risk_enabled: "false"

          # コメントを無効化
          comment_on_pr: "never"

          # Summaryのみ出力
          enable_summary: "true"
```

### 使用すべき場合

- ✅ `pull-requests: write` 権限のないリポジトリ
- ✅ ラベル適用が不可能なフォークPR
- ✅ PRワークフローに影響を与えない内部分析

## ラベルの選択的有効化

ラベルタイプを個別に制御します。

### デフォルト: すべてのラベルを有効化

デフォルトでは、すべてのラベルタイプ（size、complexity、category、risk）が有効です:

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    # すべてのラベルタイプがデフォルトで有効
```

### 特定のラベルタイプを無効化

```yaml
# 例1: 複雑度ラベルのみ無効化
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    complexity_enabled: "false"
    # size、category、risk ラベルは有効のまま
```

```yaml
# 例2: サイズとリスクラベルのみ
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    size_enabled: "true"
    complexity_enabled: "false"
    category_enabled: "false"
    risk_enabled: "true"
```

### 選択的有効化とカスタム閾値

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

    # サイズラベル: カスタム閾値
    size_enabled: "true"
    size_thresholds: '{"small": 50, "medium": 200, "large": 500, "xlarge": 1500}'

    # 複雑度ラベル: カスタム閾値（明示的に有効化）
    complexity_enabled: "true"
    complexity_thresholds: '{"medium": 15, "high": 30}'

    # カテゴリラベル: 無効化
    category_enabled: "false"

    # リスクラベル: 有効（デフォルト）
    risk_enabled: "true"
```

### 命名規則

- `*_enabled`: 各ラベルタイプの有効/無効
- `*_thresholds`: サイズと複雑度ラベルの閾値をカスタマイズ

## PR Insights Labeler YAML設定

`.github/pr-labeler.yml` を作成してPR Insights Labelerの動作をカスタマイズします。

### 完全な例

```yaml
# .github/pr-labeler.yml

# 言語設定（オプション）
language: ja  # 'en' または 'ja'。ワークフロー入力が未指定の場合に適用

# サイズラベル設定
size:
  thresholds:
    small: 50      # Small PR閾値（デフォルト: 200）
    medium: 200    # Medium PR閾値（デフォルト: 500）
    large: 500     # Large PR閾値（デフォルト: 1000）
    xlarge: 1500   # Extra large PR閾値（デフォルト: 3000）

# カテゴリラベル設定

詳細情報とカスタムカテゴリの例については、[カテゴリガイド](categories.md)を参照してください。

categories:
  # ビルトインカテゴリ（カスタマイズ可能）
  - label: "category/tests"
    patterns:
      - "__tests__/**"
      - "**/*.test.ts"
      - "**/*.test.tsx"
      - "**/*.spec.ts"
    display_name:
      en: "Test Files"
      ja: "テストファイル"

  - label: "category/ci-cd"
    patterns:
      - ".github/workflows/**"
      - ".github/actions/**"
    display_name:
      en: "CI/CD"
      ja: "CI/CD"

  - label: "category/documentation"
    patterns:
      - "docs/**"
      - "**/*.md"
      - "**/*.mdx"
    display_name:
      en: "Documentation"
      ja: "ドキュメント"

  - label: "category/config"
    patterns:
      - "**/tsconfig*.json"
      - "**/eslint.config.*"
      - "**/.prettierrc*"
    display_name:
      en: "Configuration"
      ja: "設定ファイル"

  # カスタムカテゴリ
  - label: "category/frontend"
    patterns:
      - "src/components/**"
      - "src/pages/**"
      - "**/*.tsx"
    display_name:
      en: "Frontend"
      ja: "フロントエンド"

  - label: "category/backend"
    patterns:
      - "src/api/**"
      - "src/services/**"
      - "src/controllers/**"
    display_name:
      en: "Backend"
      ja: "バックエンド"

  - label: "category/database"
    patterns:
      - "src/models/**"
      - "src/migrations/**"
      - "**/*.sql"
    display_name:
      en: "Database"
      ja: "データベース"

# リスク評価設定
risk:
  high_if_no_tests_for_core: true  # テストなしのコア変更は高リスク
  core_paths:
    - "src/**"
    - "lib/**"
  config_files:
    - ".github/workflows/**"
    - "package.json"
    - "tsconfig.json"
    - "eslint.config.js"

# ラベル操作設定
labels:
  create_missing: true  # 不足しているラベルを自動作成
  namespace_policies:
    "size/*": replace      # サイズラベルは排他的（1つのみ）
    "category/*": additive # カテゴリラベルは追加的（複数可）
    "risk/*": replace      # リスクラベルは排他的

# ランタイム設定
runtime:
  fail_on_error: false  # ラベリング失敗時もワークフローを継続
```

### ファイルなしでの設定

PR Insights Labelerは `.github/pr-labeler.yml` なしでもデフォルト設定ですぐに動作します。

### 表示名の優先順位

ラベル表示名は以下の優先順位で決定されます:

1. `.github/pr-labeler.yml` の `display_name`（カスタム翻訳）
2. ビルトイン翻訳リソース（`labels` 名前空間）
3. ラベル名そのまま

**注意:** GitHub API呼び出しは常に英語のラベル名（`label` フィールド）を使用します。`display_name` はSummary/コメントでの表示にのみ使用されます。

## ディレクトリベースのラベリング

Globパターンを使用して、変更されたファイルパスに基づいて自動的にラベルを適用します。

### 機能概要

- **パスベースマッピング**: ディレクトリパターン（glob）からラベルを自動決定
- **優先度制御**: 優先度、最長マッチ、定義順による柔軟な制御
- **名前空間ポリシー**: 排他的（replace）/追加的（add）による競合解決
- **安全な設計**: デフォルトで無効、明示的な有効化が必要
- **ラベル自動作成**: 不足しているラベルを自動作成するオプション

### 機能の有効化

```yaml
name: PR Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest

    permissions:
      pull-requests: write
      issues: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          enable_directory_labeling: true  # 機能を有効化
```

### 設定ファイル

`.github/directory-labeler.yml` を作成:

```yaml
version: 1

rules:
  # フロントエンド変更
  - label: 'area:frontend'
    include:
      - 'src/components/**'
      - 'src/pages/**'
      - '**/*.tsx'
    exclude:
      - '**/__tests__/**'
      - '**/*.test.tsx'
    priority: 20

  # バックエンド変更
  - label: 'area:backend'
    include:
      - 'src/api/**'
      - 'src/services/**'
      - 'src/controllers/**'
    priority: 20

  # データベース変更
  - label: 'area:database'
    include:
      - 'src/models/**'
      - 'src/migrations/**'
      - '**/*.sql'
    priority: 30  # より高い優先度

  # ドキュメント変更
  - label: 'scope:documentation'
    include:
      - 'docs/**'
      - '**/*.md'
    priority: 10

# 名前空間ポリシー
namespaces:
  exclusive: ['area']  # 'area:*' ラベルは1つのみ
  additive: ['scope']  # 'scope:*' ラベルは複数可
```

### 高度な設定

```yaml
version: 1

rules:
  # 高優先度のクリティカルファイル
  - label: 'priority:critical'
    include:
      - 'src/core/**'
      - 'src/auth/**'
    priority: 100  # 最高優先度

  # 言語固有のラベル
  - label: 'lang:typescript'
    include:
      - '**/*.ts'
      - '**/*.tsx'
    exclude:
      - '**/*.d.ts'  # 型定義を除外

  - label: 'lang:python'
    include:
      - '**/*.py'

  # 除外を伴う複数条件
  - label: 'scope:testing'
    include:
      - '__tests__/**'
      - '**/*.test.*'
      - '**/*.spec.*'
    exclude:
      - '**/fixtures/**'  # テストフィクスチャを除外

namespaces:
  exclusive: ['area', 'priority']
  additive: ['lang', 'scope']
```

### 優先度とマッチングルール

1. **優先度**（高い数値 = 高い優先度）
2. **最長マッチ**（より具体的なパスが優先）
3. **定義順**（同順位の場合、ファイル内で先に定義されたものが優先）

**例:**

```yaml
rules:
  - label: 'area:frontend'  # 優先度 20
    include: ['src/**']
    priority: 20

  - label: 'area:backend'   # 優先度 20、ただしより具体的
    include: ['src/api/**']
    priority: 20
```

`src/api/users.ts` の場合:

- 両方のルールがマッチ
- `area:backend` が優先（最長マッチ）

### 関連情報

- [設定ガイド - ディレクトリベースのラベリング](configuration.md#directory-based-labeling)
- [`.github/directory-labeler.yml.example`](../.github/directory-labeler.yml.example)

## 多言語サポート

PR Insights LabelerはGitHub Actions Summary、エラーメッセージ、ログ、PRコメントの英語と日本語出力をサポートしています。

### 言語設定方法

ローカライズは優先順位チェーンで解決されます。必要なレイヤーのみ設定してください。

#### 方法1: ワークフロー入力（最優先）

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    language: ja  # このワークフロー実行に対して明示的に上書き
```

#### 方法2: `.github/pr-labeler.yml`

リポジトリ共通のデフォルトを定義しつつ、ワークフローからの上書きを許可します。

```yaml
# 言語設定（オプション）
language: ja  # ワークフロー入力が未指定の場合に適用。さらに環境変数/デフォルトへフォールバック

# 多言語表示名を持つカテゴリラベル
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

#### 方法3: 環境変数（`LANGUAGE` / `LANG`）

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
  env:
    LANGUAGE: ja  # ワークフロー入力とpr-labeler.ymlが未指定の場合にのみ使用
```

### 言語決定の優先順位

1. ワークフローの `with.language`
2. `.github/pr-labeler.yml` の `language`
3. 環境変数 (`LANGUAGE` → `LANG`)
4. デフォルト: 英語（`en`）

### 表示名の優先順位

ラベル表示名は以下で決定されます:

1. `.github/pr-labeler.yml` の `display_name`（カスタム翻訳）
2. ビルトイン翻訳リソース（`labels` 名前空間）
3. ラベル名そのまま

**注意:** GitHub API呼び出しは常に英語のラベル名（`label` フィールド）を使用します。`display_name` は表示にのみ使用されます。

### サポート言語

- **英語**: `en`, `en-US`, `en-GB`
- **日本語**: `ja`, `ja-JP`

### 翻訳される内容

- ✅ GitHub Actions Summary出力
- ✅ エラーメッセージと警告
- ✅ PRコメント（有効時）
- ✅ ログメッセージ
- ✅ ラベル表示名（Summary/コメント内）
- ❌ GitHub APIのラベル名（常に英語）

---

## 関連ドキュメント

- [設定ガイド](configuration.md) - 完全な入力パラメータリファレンス
- [トラブルシューティングガイド](troubleshooting.md) - よくある問題と解決策
- [メインREADME](../README.md) - クイックスタートと概要
