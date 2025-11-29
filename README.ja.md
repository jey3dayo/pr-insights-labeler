# PR Insights Labeler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
![Test Coverage](https://img.shields.io/badge/Coverage-93%25-green.svg)

**GitHub Actions用の包括的なPRインサイト＆ラベリングツール** - プルリクエストを自動的に分類、サイズ判定、リスク評価します。

🇯🇵 [日本語](README.ja.md) | 🇬🇧 [English](README.md)

## ✨ PR Insights Labelerを選ぶ理由

インテリジェントな自動化でPRレビュープロセスを効率化:

- **📏 スマートなサイズ検出**: PRサイズ（small → xxlarge）を自動ラベリングし、レビュー優先度の判断をサポート
  - **除外対象**: ロックファイル、生成ファイル、テストファイル（スナップショットファイルを含む）、ドキュメントメタデータを除外し、正確なコードサイズを測定
  - 例: `size/small`, `size/medium`, `size/large`, `size/xlarge`, `size/xxlarge`
- **🏷️ 自動カテゴリ分類**: テスト、ドキュメント、CI/CD、設定、仕様、依存関係などを自動判定し、素早いフィルタリングを実現
  - **全ファイル対象**: メタデータファイル（`.kiro/`, `.claude/` 等）も含めて包括的に分類
  - 例: `category/tests`, `category/documentation`, `category/ci-cd`, `category/config`, `category/spec`
- **⚠️ リスク評価**: テストなしのコア変更を事前に検出し、マージ前に警告
  - **コードのみ評価**: ドキュメントやメタデータを除外し、実行コードのリスクに集中
  - 例: `risk/high`（テスト更新を伴わないコア変更）、`risk/medium`（設定・インフラ変更）
- **🧠 複雑度インサイト**: 変更ファイルのESLint複雑度を測定し、条件超過時に `complexity/high` を付与（オプトイン）
- **📁 パスベースラベル**: 柔軟なGlobパターンでファイルパスに基づくカスタムラベルを適用
  - 例: `frontend/**` → `team/frontend`, `backend/**` → `team/backend`
- **🏷️ ラベル自動生成**: ラベルを自動作成してメタデータを同期し、事前準備なしで導入可能
- **🚦 ワークフロー品質ゲート**: `fail_on_pr_size`, `fail_on_large_files`, `fail_on_too_many_files` でポリシー違反を検知して失敗制御
- **📝 GitHub Actions Summary**: 大規模ファイル一覧や改善提案をActions Summaryページに集約表示
- **🌐 多言語出力**: `language` input、`.github/pr-labeler.yml`、`LANGUAGE/LANG` 環境変数で英語・日本語を自動切り替え

## 🚀 クイックスタート

2分で導入完了:

### 1. ワークフローファイルを作成

`.github/workflows/pr-labeler.yml` を追加:

```yaml
name: PR Insights Labeler

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  label:
    runs-on: ubuntu-latest

    permissions:
      contents: read        # PRファイル読み取り
      pull-requests: write  # ラベル適用
      issues: write         # コメント投稿

    steps:
      - uses: actions/checkout@v4
      - uses: jey3dayo/pr-insights-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # 言語上書き（ワークフロー入力が最優先）
          # language: "ja"  # 省略時は pr-labeler.yml → LANGUAGE/LANG → デフォルト'en'
```

### 2. 自動適用されるラベル

設定後、すべてのPRに自動的に以下が付与されます:

- **サイズラベル**: `size/small`, `size/medium`, `size/large`, `size/xlarge`, `size/xxlarge`
- **カテゴリラベル**: `category/tests`, `category/docs`, `category/ci-cd`, `category/dependencies` など
- **リスクラベル**: `risk/high`, `risk/medium`（リスク検出時のみ）
- **複雑度ラベル**: ESLint複雑度が閾値を超えた場合に `complexity/high`（有効化時）
- **GitHub Actions Summary**: CI結果ページにメトリクス・違反一覧・ベストプラクティスを表示

### ラベル表示サンプル

PRに自動適用されるラベルは次のように表示されます（GitHubラベルのスクリーンショット例）：

![PR Insights Labeler によって適用されたラベル例](docs/assets/pr-insights-labeler-sample.png)

### 3. カスタマイズ（オプション）

**ワークフローサンプル:**

- [basic.yml](examples/workflows/basic.yml) - デフォルト設定
- [advanced.yml](examples/workflows/advanced.yml) - オプション機能付き

**ドキュメント:** [設定ガイド](docs/en/configuration.md) | [高度な使用例](docs/ja/advanced-usage.md) | [ラベルルール](docs/ja/labeling-rules.md)

## 🔒 権限設定

必要なGitHub Actions権限:

```yaml
permissions:
  contents: read        # PRファイル読み取り
  pull-requests: write  # ラベル適用・削除
  issues: write         # PRコメント投稿
```

**フォークPR**: `pull_request_target` イベントを使用してください。詳細は [フォークPR対応](docs/ja/advanced-usage.md#フォークprの取り扱い) を参照。

## 🏷️ 適用されるラベル

### サイズラベル（追加行数ベース）

| ラベル | 追加行数 | 用途 |
| -------------- | --------- | ---------------- |
| `size/small` | < 200 | クイックレビュー |
| `size/medium` | 200-499 | 通常レビュー |
| `size/large` | 500-999 | 集中が必要 |
| `size/xlarge` | 1000-2999 | 分割推奨 |
| `size/xxlarge` | ≥ 3000 | 分割すべき |

### カテゴリラベル

変更タイプを自動検出:

| ラベル | マッチ対象 | 例 |
| ------------------------- | -------------- | -------------------------- |
| `category/tests` | テストファイル | `**/*.test.ts` |
| `category/ci-cd` | CI/CD設定 | `.github/workflows/**` |
| `category/documentation` | ドキュメント | `docs/**`, `*.md` |
| `category/config` | 設定ファイル | `*.config.js`, `.env` |
| `category/spec` | 仕様書 | `.kiro/specs/**` |
| `category/dependencies` | ロックファイル | `package-lock.json` |
| `category/feature` | 新機能 | `src/features/**` |
| `category/infrastructure` | インフラ | `Dockerfile`, `.github/**` |
| `category/security` | セキュリティ | `**/auth*/**`, `.env*` |

カテゴリラベルの詳細については[カテゴリガイド](docs/en/categories.md)を参照してください。

### リスクラベル

PR変更の潜在的な影響と安全性を評価:

- `risk/high` - 慎重なレビューが必要な高リスク変更
  - CIチェック失敗（tests、type-check、build、lint）
  - テストファイルを含まないコア機能の新規追加
- `risk/medium` - 注意が必要な中リスク変更
  - 設定ファイルの変更（`.github/workflows/**`、`package.json`、`tsconfig.json`）
  - インフラやデプロイメント関連の変更

**リスクラベルなし** (安全な変更):

- 全CIチェックが成功したリファクタリング
- ドキュメント専用の変更
- テスト専用の変更

詳細な評価ロジックとFAQは [リスクラベル詳細](docs/en/configuration.md#risk-labels) を参照してください。

### 違反ラベル

制限超過時:

- `auto/large-files` - 個別ファイルが大きすぎる
- `auto/too-many-files` - 変更ファイル数が多すぎる
- `auto/too-many-lines` - 個別ファイルが設定行数を超過
- `auto/excessive-changes` - 追加行数合計が閾値を超過

**カスタマイズ**: すべての閾値とラベルは設定可能。詳細は [設定ガイド](docs/en/configuration.md#label-thresholds-defaults) を参照。

## ⚙️ 設定

### 主要オプション

```yaml
- uses: jey3dayo/pr-insights-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

    # サイズ制限
    file_size_limit: "100KB"      # 最大ファイルサイズ
    file_lines_limit: "500"       # 最大行数/ファイル
    pr_additions_limit: "5000"    # 最大追加行数合計
    pr_files_limit: "50"          # 最大変更ファイル数

    # ラベル制御
    size_enabled: "true"          # サイズラベル有効化
    category_enabled: "true"      # カテゴリラベル有効化
    risk_enabled: "true"          # リスクラベル有効化
    complexity_enabled: "false"   # 複雑度ラベル（デフォルトOFF）

    # 品質ゲート
    fail_on_pr_size: "xlarge"     # PRが大きすぎる場合に失敗
    fail_on_large_files: "true"   # ファイルが制限超過時に失敗
    fail_on_too_many_files: "true" # 変更ファイル数が多すぎる場合に失敗
    enable_summary: "true"        # GitHub Actions Summaryに出力
    comment_on_pr: "auto"         # コメント投稿方針（auto/always/never）

    # ローカライズ
    language: "ja"                # ワークフロー単位の最優先オーバーライド
    # 省略時: .github/pr-labeler.yml → LANGUAGE/LANG 環境変数 → デフォルト'en'
```

### 高度な機能

- **ディレクトリベースラベル**: ファイルパスパターンでカスタムラベルを適用
- **フォークPRサポート**: `pull_request_target` で安全に処理
- **条件付き実行**: ラベル、ブランチ、パスでチェックをスキップ
- **カスタム閾値**: すべてのサイズ・複雑度の制限を微調整

👉 **完全なドキュメント**: [設定ガイド](docs/en/configuration.md) | [高度な使用例](docs/ja/advanced-usage.md)

## 📚 ドキュメント

| ガイド | 説明 |
| ------------------------------------------------- | -------------------------- |
| [ドキュメントインデックス](docs/README.md) | 言語別リンク一覧 |
| [設定ガイド](docs/en/configuration.md) | 全入力・出力・デフォルト値 |
| [高度な使用例](docs/ja/advanced-usage.md) | 実践的な例とパターン |
| [トラブルシューティング](docs/en/troubleshooting.md) | よくある問題と解決策 |
| [APIリファレンス](docs/ja/API.md) | 内部APIドキュメント |
| [リリースプロセス](docs/ja/release-process.md) | バージョン管理 |

## 🤝 コントリビューション

コントリビューション歓迎！以下をお願いします:

1. 大きな変更の場合はissueを開く
2. すべてのテストが成功することを確認 (`pnpm test`)
3. 既存のコードスタイルに従う

### メンテナー向け: リリース

自動リリーススクリプトを使用してください:

```bash
# 対話的リリース（バージョン選択）
mise release

# または直接実行
bash scripts/release.sh
```

スクリプトは以下を自動実行します:

1. 未コミット変更のチェック
2. リリースタイプの選択（patch/minor/major）
3. 品質チェックの実行（lint/test/build）
4. gitコミットからchangelog生成
5. package.jsonとCHANGELOG.mdの更新
6. gitコミットとタグの作成
7. originへのプッシュとGitHub Release作成

詳細は [リリースプロセス](docs/ja/release-process.md) を参照してください。

## 📄 ライセンス

MIT License - 詳細はリポジトリを参照してください。

## 🙏 使用ライブラリ

- [neverthrow](https://github.com/supermacro/neverthrow) - 型安全なエラーハンドリング
- [minimatch](https://github.com/isaacs/minimatch) - Globパターンマッチング
- [bytes](https://github.com/visionmedia/bytes.js) - サイズ解析ユーティリティ
- [@actions/toolkit](https://github.com/actions/toolkit) - GitHub Actions SDK
