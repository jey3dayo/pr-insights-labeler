# 🚀 高度な使用例ガイド

**対象**: 開発者・メンテナー
**タグ**: `category/action`, `audience/developer`, `audience/user`

**言語**: [English](../en/advanced-usage.md) | 日本語

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
- **緩和策**: このアクションはPR headをデータとして読み取ってメトリクスを計算するだけです（ファイルサイズは `fs.stat`、行数は `wc -l`、複雑度は `overrideConfigFile: true` とこのアクション内蔵の parser / rule によるESLint実行で計算し、リポジトリ自体のESLint設定は読み込みません）。サンプルワークフローのどのステップも、PRのスクリプト・package hooks・PR側の設定ファイルを実行しません
- **ベストプラクティス**: ワークフローを承認する前にフォークPRをレビュー

#### ベースリポジトリをチェックアウトしたうえで、解析用にPR headをチェックアウトする

`pull_request_target` では、ローカルでのdiff計算にbaseとheadの両方のcommit、およびその間のmerge-baseまでの履歴がオブジェクトDBに必要です。`actions/checkout@v4` のデフォルト（`fetch-depth: 1`）にはこの履歴がなく、`fetch-depth: 0` も「チェックアウト元のremoteの全履歴」しか保証しません。ベースリポジトリをoriginとする安全な既定構成でも、フォークのhead commitは通常のbranch refの外にあるため取得されないままです。そのためフォークPRではhead commitを明示的にfetchする必要があります。必要な履歴が揃わない場合、このアクションは失敗するのではなくGitHub API経由でのdiff取得にフォールバックします。

```yaml
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check out PR head for analysis
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: |
          git fetch --no-tags origin "+refs/pull/${PR_NUMBER}/head:refs/remotes/pull/head"
          git checkout --detach "$HEAD_SHA"
```

head SHAは `git fetch` / `git checkout` に渡され、`actions/checkout` 自体には渡されません。`actions/checkout` 自身が持つ `pull_request_target` 向けの安全対策（近年のリリースにある `allow-unsafe-pr-checkout` など、既定でこのイベント下でのフォークhead checkoutを拒否する仕組み）は `checkout` アクションへ渡す対象に対するものであり、その後の素の `git checkout` には適用されません。このリポジトリが案内する `actions/checkout` のバージョンをv4より先に上げる際は、この違いを再確認してください。

ポリシー設定と解析対象は別に扱われます。イベントが `pull_request_target` の場合、`.github/pr-labeler.yml` と `.github/directory-labeler.yml` はどちらも、ローカルチェックアウトの内容にかかわらずGitHub API経由でベースの参照（取得できない場合はデフォルトブランチ）から読み込まれます。その結果、いずれかのファイルを変更するフォークPRでは新しい設定はプレビューされず、ベース側の設定が適用されます。通常の `pull_request` イベントでは、`.github/pr-labeler.yml` はGitHub API経由でheadの参照から、`.github/directory-labeler.yml` はローカルチェックアウトから読み込まれるため、同一リポジトリのPRでは従来どおり設定変更をプレビューできます。

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
          fetch-depth: 0
      - name: Check out PR head for analysis
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: |
          git fetch --no-tags origin "+refs/pull/${PR_NUMBER}/head:refs/remotes/pull/head"
          git checkout --detach "$HEAD_SHA"

      - uses: jey3dayo/pr-insights-labeler@v1
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

      - uses: jey3dayo/pr-insights-labeler@v1
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

      - uses: jey3dayo/pr-insights-labeler@v1
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

      - uses: jey3dayo/pr-insights-labeler@v1
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

      - uses: jey3dayo/pr-insights-labeler@v1
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

      - uses: jey3dayo/pr-insights-labeler@v1
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

### デフォルト: 複雑度ラベルのみ無効

デフォルトでは、size、category、risk ラベルは有効で、complexity ラベルのみ無効です:

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    # size、category、risk ラベルはデフォルトで有効
    # complexity ラベルはデフォルトで無効（有効化するには complexity_enabled: "true" を指定）
```

### 特定のラベルタイプを無効化

```yaml
# 例1: 複雑度ラベルを明示的に無効化（デフォルトと同じ）
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    complexity_enabled: "false"
    # size、category、risk ラベルは有効のまま
```

```yaml
# 例2: サイズとリスクラベルのみ
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    size_enabled: "true"
    complexity_enabled: "false"
    category_enabled: "false"
    risk_enabled: "true"
```

### 選択的有効化とカスタム閾値

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
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

`.github/pr-labeler.yml` でリポジトリ全体のデフォルトを定義します。完全なスキーマとデフォルト値は [Configuration Guide](../en/configuration.md#yaml-config-file) にあるため、ここでは参照を重複させず代表的な項目だけを示します。

```yaml
# .github/pr-labeler.yml (例の抜粋)
language: ja

size:
  thresholds:
    small: 50
    medium: 200

categories:
  - label: "category/tests"
    patterns:
      - "__tests__/**"
      - "**/*.test.ts"
    display_name:
      en: "Test Files"
      ja: "テストファイル"

labels:
  create_missing: true
  namespace_policies:
    "size/*": replace
    "category/*": additive

runtime:
  fail_on_error: false
```

`.github/pr-labeler.yml` がなくてもデフォルト設定ですぐ動作します。詳細情報とカスタムカテゴリの例は [カテゴリガイド](../en/categories.md) を参照してください。

## ディレクトリベースのラベリング

Globパターンを使用して、変更されたファイルパスに基づいて自動的にラベルを適用します。

### 機能概要

- **パスベースマッピング**: ディレクトリパターン（glob）からラベルを自動決定
- **優先度制御**: 優先度、最長マッチ、定義順による柔軟な制御
- **名前空間ポリシー**: 排他的（replace）/追加的（add）による競合解決
- **デフォルトON**: 既定で有効。不要な場合は `enable_directory_labeling: "false"` で無効化
- **ラベル自動作成**: 不足しているラベルを自動作成

### 設定例

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

      - uses: jey3dayo/pr-insights-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          enable_directory_labeling: true  # 既定で有効。不要なら "false" を指定
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

### 例

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

- [設定ガイド - ディレクトリベースのラベリング](../en/configuration.md#directory-based-labeling)
- [`.github/directory-labeler.yml.example`](../../.github/directory-labeler.yml.example)

## 多言語サポート

PR Insights LabelerはGitHub Actions Summary、エラーメッセージ、ログ、PRコメントの英語と日本語出力をサポートしています。

### 言語設定方法

ローカライズの優先順位チェーンは [Configuration Guide](../en/configuration.md#multi-language-support) に記載されています。ワークフローに合うレイヤーを選んで設定してください。

```yaml
# ワークフローごとの明示指定（最優先）
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    language: ja

# リポジトリ共通のデフォルトと表示名（ワークフロー入力で上書き可）
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

# 入力/設定ファイルがない場合の環境変数フォールバック
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
  env:
    LANGUAGE: ja
```

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

- [設定ガイド](../en/configuration.md) - 完全な入力パラメータリファレンス
- [トラブルシューティングガイド](../en/troubleshooting.md) - よくある問題と解決策
- [メインREADME](../README.md) - クイックスタートと概要
