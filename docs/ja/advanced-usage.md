# 🚀 高度な使用例ガイド

**対象**: 開発者・メンテナー
**タグ**: `category/action`, `audience/developer`, `audience/user`

**言語**: [English](../en/advanced-usage.md) | 日本語

PR Insights Labeler の実践的な活用例と、高度な設定方法をまとめたガイドです。

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

フォークからの PR を処理する場合、通常の `pull_request` イベントでは権限が制限されます。ラベル付与やコメント投稿を行うには、`pull_request_target` イベントを使用してください。

### セキュリティ上の考慮事項

⚠️ **重要**: `pull_request_target` はベースリポジトリのコンテキストで実行されるため、書き込み権限が付与されます。セキュリティへの影響を十分に理解したうえで、必要な場合にのみ使用してください。

- **リスク**: フォーク PR に含まれる悪意あるコードが実行されると、シークレットへアクセスされる可能性があります
- **緩和策**: このアクションは PR head をデータとして読み取ってメトリクスを計算するだけです。ファイルサイズは `fs.stat`、行数は `wc -l`、複雑度は `overrideConfigFile: true` とアクション内蔵のパーサー・ルールを用いた ESLint 実行で計算し、対象リポジトリ側の ESLint 設定は読み込みません。また、サンプルワークフローのどのステップでも、PR 内のスクリプトやパッケージフック、PR 側の設定ファイルは実行しません
- **ベストプラクティス**: ワークフローの実行を承認する前に、フォーク PR の変更内容をレビューしてください

#### ベースリポジトリをチェックアウトしたうえで、解析用に PR head をチェックアウトする

`pull_request_target` でローカルの diff 計算を行うには、base と head の両コミット、およびその間の merge-base までの履歴がローカルのオブジェクト DB に必要です。`actions/checkout@v7` のデフォルト（`fetch-depth: 1`）では履歴が不足しており、`fetch-depth: 0` を指定しても「チェックアウト先のリモートの全履歴」しか取得されません。ベースリポジトリを `origin` とする安全な既定構成では、フォークの head コミットは通常のブランチ ref の外にあるため取得されないままになります。そのため、フォーク PR では head コミットを明示的に fetch する必要があります。なお、必要な履歴が揃わない場合でもアクション自体は失敗せず、GitHub API 経由での diff 取得にフォールバックします。

```yaml
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
```

ここでは head SHA を `git fetch` と `git checkout` に直接渡しており、`actions/checkout` 自体には渡していません。`actions/checkout` が備えている `pull_request_target` 向けの安全対策（近年のリリースにある `allow-unsafe-pr-checkout` など、既定でフォーク head のチェックアウトを拒否する仕組み）は、`checkout` アクションへ渡した対象に適用されるものであり、後続の素の `git checkout` には適用されません。案内バージョンを v7 に引き上げる際、この違いを v7 のソースコードで再確認しています。v7 の安全対策は `repository`、`ref`、解決されたコミットのいずれかがフォークの PR head を指す場合にのみチェックアウトを拒否するため、この手順では該当しません。なお、この確認は v7 のソースコード読解によるもので、実際のフォーク PR 上での実行検証は未実施です。

また、このステップが解析対象とするのは、`pull_request_target` イベントのペイロードに記録された head SHA のみであり、可変の ref そのものではありません。`refs/pull/${PR_NUMBER}/head` は可変のため、ワークフローがキューに入ってから PR が更新されると、fetch したコミットは `HEAD_SHA` と一致しなくなります。その場合、このステップは別のリビジョンをチェックアウトせずに意図的に失敗します。PR の更新によって新たに起動される `synchronize` イベントの実行が最新の head を解析するため、そのまま自然に回復します。

**このステップには `continue-on-error` を設定しないでください。** チェックアウトが失敗してもジョブを続行してしまうと、解析が PR head ではなく base のチェックアウトに対して実行されます。GitHub API 経由の diff フォールバック自体は動きますが、行数や複雑度のようにローカルファイルの内容を読む解析は、PR の実際の変更ではなく base リビジョンを対象に計算されてしまいます。

第二の防御として、このアクション本体でも `pull_request_target` 実行時は解析前にローカルの `HEAD` がイベントの head SHA と一致するかを検証しています。一致しない場合は、誤ったリビジョンにラベルを付けるのではなくアクションを失敗させます。

ポリシー設定ファイルと解析対象コードは分けて扱われます。イベントが `pull_request_target` の場合、`.github/pr-labeler.yml` と `.github/directory-labeler.yml` はどちらも、ローカルチェックアウトの内容にかかわらず GitHub API 経由でベースの参照（取得できない場合はデフォルトブランチ）から読み込まれます。そのため、これらの設定ファイルを変更するフォーク PR では新しい設定はプレビューされず、ベース側の設定が適用されます。一方、通常の `pull_request` イベントでは、`.github/pr-labeler.yml` は GitHub API 経由で head の参照から、`.github/directory-labeler.yml` はローカルチェックアウトから読み込まれるため、同一リポジトリ内の PR では従来どおり設定変更をプレビューできます。

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

### 適しているケース

- ✅ 外部からのコントリビューションを受け入れているオープンソースプロジェクト
- ✅ フォーク PR が発生するパブリックリポジトリ
- ❌ プライベートリポジトリ（通常の `pull_request` イベントを使用してください）

## 条件付き実行

特定のファイルやパス、ラベル、ブランチに応じて PR Insights Labeler の実行を制御できます。

### 特定ファイルのスキップ

変更されたパスを絞り込みつつ、追加の除外パターンを指定する例です。

```yaml
name: PR Check

on:
  pull_request:
    # これらのパスが変更された場合のみ実行
    paths:
      - 'src/**'
      - '!src/**/*.test.ts'  # テストファイルを除外

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: jey3dayo/pr-insights-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # 除外する追加パターン
          additional_exclude_patterns: |
            **/*.generated.ts
            **/*.min.js
```

### ラベルによるスキップ

特定のラベルが付いている PR で実行をスキップする例です。

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
      - uses: actions/checkout@v7

      - uses: jey3dayo/pr-insights-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### ブランチによるスキップ

特定のブランチからの PR をスキップする例です。

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
      - uses: actions/checkout@v7

      - uses: jey3dayo/pr-insights-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## 厳格モード

制限違反を検出した場合にワークフローを失敗させる設定です。チームの品質基準を強制したい場合に有効です。

### 例: 大きなファイルや大規模 PR で失敗させる

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
      - uses: actions/checkout@v7

      - uses: jey3dayo/pr-insights-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          file_size_limit: "100KB"
          file_lines_limit: "300"
          pr_additions_limit: "500"
          fail_on_large_files: "true"       # ファイルが制限を超えた場合に失敗
          fail_on_too_many_files: "true"    # ファイル数が上限を超えた場合に失敗
          fail_on_pr_size: "large"          # PRサイズが "large" 以上の場合に失敗
          size_enabled: "true"              # fail_on_pr_size の利用に必要
          comment_on_pr: "always"           # 違反時は常にコメントを投稿
```

### 厳格モードが向いているケース

- ✅ 大きな変更に厳格なレビューが必要なミッションクリティカルなコードベース
- ✅ コード品質や複雑度の基準を機械的に守らせたいプロジェクト
- ✅ 大容量ファイルの誤コミットを防ぎたいリポジトリ
- ❌ 外部コントリビューションを募るオープンソースプロジェクト（参加のハードルが上がる場合があります）

## サマリー専用モード

ラベル付与やコメント投稿を行わず、GitHub Actions Summary へのレポート出力だけを行う構成です。

### 例: 読み取り専用の分析

```yaml
name: PR Analysis (Summary Only)

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  analyze:
    runs-on: ubuntu-latest

    permissions:
      contents: read  # 読み取り権限のみ必要

    steps:
      - uses: actions/checkout@v7

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

### 適しているケース

- ✅ `pull-requests: write` 権限を付与できないリポジトリ
- ✅ ラベルを適用できないフォーク PR の解析
- ✅ PR のワークフローに影響を与えずにメトリクスだけを確認したい場合

## ラベルの選択的有効化

各ラベル種別の有効・無効を個別に制御できます。

### デフォルト: 複雑度ラベルのみ無効

デフォルトでは `size`、`category`、`risk` ラベルが有効で、`complexity` ラベルのみ無効になっています。

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    # size、category、risk ラベルはデフォルトで有効
    # complexity ラベルはデフォルトで無効（有効化するには complexity_enabled: "true" を指定）
```

### 特定のラベル種別を無効化する

```yaml
# 例1: 複雑度ラベルを明示的に無効化（デフォルトと同じ）
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    complexity_enabled: "false"
    # size、category、risk ラベルは有効のまま
```

```yaml
# 例2: サイズラベルとリスクラベルのみ有効化
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    size_enabled: "true"
    complexity_enabled: "false"
    category_enabled: "false"
    risk_enabled: "true"
```

### 選択的有効化とカスタムしきい値の組み合わせ

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

    # サイズラベル: カスタムしきい値
    size_enabled: "true"
    size_thresholds: '{"small": 50, "medium": 200, "large": 500, "xlarge": 1500}'

    # 複雑度ラベル: カスタムしきい値（明示的に有効化）
    complexity_enabled: "true"
    complexity_thresholds: '{"medium": 15, "high": 30}'

    # カテゴリラベル: 無効化
    category_enabled: "false"

    # リスクラベル: 有効（デフォルト）
    risk_enabled: "true"
```

### パラメータの命名規則

- `*_enabled`: 各ラベル種別の有効・無効を切り替えます
- `*_thresholds`: サイズラベルや複雑度ラベルのしきい値をカスタマイズします

## PR Insights Labeler YAML設定

`.github/pr-labeler.yml` を使うと、リポジトリ全体のデフォルト設定を定義できます。完全なスキーマとデフォルト値は [Configuration Guide](../en/configuration.md#yaml-config-file) にまとまっているため、ここでは代表的な設定項目のみを抜粋します。

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

`.github/pr-labeler.yml` がなくてもデフォルト設定のまま動作します。デフォルトカテゴリやカスタムカテゴリの詳しい例は[カテゴリガイド](../en/categories.md)を参照してください。

## ディレクトリベースのラベリング

Glob パターンを使い、変更されたファイルのパスに応じて自動でラベルを付与できます。

### 機能概要

- **パスベースマッピング**: ディレクトリパターン（glob）から付与するラベルを自動で決定します
- **優先度制御**: 優先度、最長マッチ、定義順のルールで適用ラベルを制御します
- **名前空間ポリシー**: 排他的（`exclusive` / 置換）または追加的（`additive` / 併用）に競合を解決します
- **デフォルトで有効**: 既定で有効になっています。不要な場合は `enable_directory_labeling: "false"` で無効化できます
- **ラベルの自動作成**: リポジトリに存在しないラベルは自動で作成されます

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
      - uses: actions/checkout@v7

      - uses: jey3dayo/pr-insights-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          enable_directory_labeling: true  # 既定で有効。不要なら "false" を指定
```

### 設定ファイル

`.github/directory-labeler.yml` を作成します。

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

複数のルールにマッチした場合は、次の順序で優先するラベルを決定します。

1. **優先度**: `priority` の数値が大きいルールが優先されます
2. **最長マッチ**: より具体的なパスパターンが優先されます
3. **定義順**: 上記が同じ場合、ファイル内で先に定義されたルールが優先されます

### 判定例

```yaml
rules:
  - label: 'area:frontend'  # 優先度 20
    include: ['src/**']
    priority: 20

  - label: 'area:backend'   # 優先度 20、ただしより具体的
    include: ['src/api/**']
    priority: 20
```

`src/api/users.ts` が変更された場合、次のように判定されます。

- 両方のルールにマッチします
- より具体的なパスを持つ `area:backend` が優先されます（最長マッチ）

### 関連情報

- [設定ガイド - ディレクトリベースのラベリング](../en/configuration.md#directory-based-labeling)
- [`.github/directory-labeler.yml.example`](../../.github/directory-labeler.yml.example)

## 多言語サポート

PR Insights Labeler は、GitHub Actions Summary、エラーメッセージ、ログ、PR コメントの英語・日本語出力に対応しています。

### 言語の設定方法

言語の優先順位は [Configuration Guide](../en/configuration.md#multi-language-support) を参照してください。運用に合わせて、次のいずれかの方法で設定できます。

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

- ✅ GitHub Actions Summary の出力
- ✅ エラーメッセージと警告
- ✅ PR コメント（有効時）
- ✅ ログメッセージ
- ✅ ラベルの表示名（Summary やコメント内）
- ❌ GitHub API 上のラベル名（常に英語で管理されます）

---

## 関連ドキュメント

- [設定ガイド](../en/configuration.md) - 全入力パラメータのリファレンス
- [トラブルシューティングガイド](../en/troubleshooting.md) - よくある問題と解決策
- [ドキュメントインデックス](../README.md) - 各言語のドキュメント一覧
