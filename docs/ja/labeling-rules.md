# 🏷️ ラベルルール クイックリファレンス

**対象**: 開発者・コントリビューター
**タグ**: `category/documentation`, `audience/developer`, `audience/contributor`

**言語**: [English](../en/labeling-rules.md) | 日本語

PR Insights Labeler が各ラベル種別をどのように判定するかを簡潔にまとめたリファレンスです。レビュー前に「どのラベルが付与されるか」を素早く確認できます。

## ラベル種別一覧

<!-- prettier-ignore-start -->
|ファミリー|プレフィックス|内容|
|----------|--------------|----|
|サイズ|`size/*`|追加行数に基づくPRサイズ判定|
|カテゴリ|`category/*`|変更ファイルのパスによる分類|
|リスク|`risk/*`|CIの状態と変更内容による安全性評価|
|複雑度|`complexity/*`|ESLintの循環的複雑度による判定|
|ポリシー違反|`auto/*`|設定した制限値の超過検出|
<!-- prettier-ignore-end -->

各ファミリーはワークフロー入力（`size_enabled` など）で個別に有効・無効を切り替えられます。ラベルは加算方式のため、複数の種類が同時に付与されます。

## サイズラベル (`size/*`)

- PR 全体の追加行数をもとに算出します。ロックファイル、生成物、テストファイル、ドキュメント用メタデータは集計から除外されます。
- デフォルトのしきい値は次のとおりです。
  - `< 200` → `size/small`
  - `200-499` → `size/medium`
  - `500-999` → `size/large`
  - `1000-2999` → `size/xlarge`
  - `>= 3000` → `size/xxlarge`
- 基準を変更したい場合は、`size_thresholds` 入力でカスタマイズできます。サイズラベルは常に1種類のみ適用されます。

## カテゴリラベル (`category/*`)

- 変更ファイルのパスに対する glob マッチで判定します。加算方式のため、該当するカテゴリが複数同時に付与されます。
- デフォルトのマッピングは次のとおりです（詳細は `docs/en/categories.md` を参照してください）。
  - テスト（`__tests__/**`, `**/*.test.ts(x)`）→ `category/tests`
  - CI/CD（`.github/workflows/**`）→ `category/ci-cd`
  - ドキュメント（`docs/**`, 仕様書を除く `*.md`）→ `category/documentation`
  - 設定（`*.config.*`, `tsconfig.json`, `action.yml` など）→ `category/config`
  - 仕様書（`.kiro/**`, `specs/**`）→ `category/spec`
  - 依存関係（`package.json`, ロックファイル類）→ `category/dependencies`
  - 機能コード（`src/features/**`, `src/components/**`）→ `category/feature`
  - インフラ（`.github/**`, `Dockerfile`, `terraform/**`）→ `category/infrastructure`
  - セキュリティ（`**/auth*/**`, `.env*`, `secrets/**`）→ `category/security`
- 独自のカテゴリを追加したい場合は、`path_labels` に glob パターンとラベルの組を定義します。

## リスクラベル (`risk/*`)

- CI の実行結果、コアパスに対するテストの有無、コミットメッセージを組み合わせて判定します。
- 次のいずれかに該当すると `risk/high` が付与されます。
  - CI チェック（lint / type-check / test / build）のいずれかが失敗している場合
  - `feat:` 系のコミットで `src/**` を変更しており、テスト（`*.test.ts`、`*.spec.ts`、`__tests__/**`）が含まれない場合
- 次のいずれかに該当すると `risk/medium` が付与されます。
  - `.github/workflows/**`、`package.json`、`tsconfig.json` などの設定ファイルが変更されている場合
  - `risk.config_files` にマッチするパスが更新されている場合
- `docs:`、`test:`、`refactor:` の変更で CI が成功している場合は、リスクラベルは付与されません。
- 対象パスやしきい値は、`.github/pr-labeler.yml` の `risk` ブロックで調整できます。

## 複雑度ラベル (`complexity/*`)

- デフォルトでは無効（`complexity_enabled: "false"`）のため、必要な場合に有効化してください。
- ESLint の循環的複雑度（cyclomatic complexity）を用いて最大値を算出します。
- デフォルトのしきい値は次のとおりです。
  - `15-29` → `complexity/medium`
  - `>= 30` → `complexity/high`
- `complexity_thresholds` 入力で任意の値に変更できます。

## ポリシー違反ラベル (`auto/*`)

- ワークフローで設定した制限値を超えた場合に付与されます。
  - `auto/large-files` – 単一ファイルが `file_size_limit` を超過した場合（`file_size_limit_enabled: "false"` で無効化できます）
  - `auto/too-many-files` – 変更ファイル数が `pr_files_limit` を超過した場合（`pr_files_limit_enabled: "false"` で無効化できます）
  - `auto/too-many-lines` – 単一ファイルの行数が `file_lines_limit` を超過した場合（`file_lines_limit_enabled: "false"` で無効化できます）
  - `auto/excessive-changes` – 追加行数が `pr_additions_limit` を超過した場合（`pr_additions_limit_enabled: "false"` で無効化できます）
- `fail_on_*` 入力と組み合わせると、違反発生時にワークフローを失敗させられます。

## ラベル自動作成

- `always-auto-create-labels` 仕様により、必要なラベルは常に自動で作成されます。色や説明文を手作業で設定する必要はありません。
- ラベルの作成に失敗しないよう、ワークフローの権限に `pull-requests: write` を含めてください。

## 参考ドキュメント

- `docs/en/configuration.md` – 全入力・出力の詳細とカスタマイズ例
- `docs/en/categories.md` – カテゴリラベルごとのマッチ条件と具体例
- `docs/en/advanced-usage.md` – フォーク PR、厳格モード、多言語対応などの実践例
