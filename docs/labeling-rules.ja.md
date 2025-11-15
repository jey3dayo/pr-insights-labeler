# ラベルルール クイックリファレンス

PR Insights Labeler が各ラベル種別をどのように判定するかを簡潔にまとめたドキュメントです。レビュー前に「どのラベルが付くか」を素早く確認できます。

## ラベル種別一覧

<!-- prettier-ignore-start -->
|ファミリー|プレフィックス|内容|
|----------|--------------|----|
|サイズ|`size/*`|追加行数に基づくPRサイズ判定|
|カテゴリ|`category/*`|変更ファイルのパス分類|
|リスク|`risk/*`|CI状態と変更意図による安全性評価|
|複雑度|`complexity/*`|ESLint循環的複雑度の閾値判定|
|ポリシー違反|`auto/*`|指定した制限値の超過検出|
<!-- prettier-ignore-end -->

各ファミリーはワークフロー入力 (`size_enabled` など) で個別にON/OFFできます。ラベルは加算方式のため、複数種類が同時に付与されます。

## サイズラベル (`size/*`)

- PR全体の追加行数をベースに算出。ロックファイルや生成物、テスト、ドキュメントメタデータは除外。
- デフォルト閾値:
  - `< 200` → `size/small`
  - `200-499` → `size/medium`
  - `500-999` → `size/large`
  - `1000-2999` → `size/xlarge`
  - `>= 3000` → `size/xxlarge`
- `size_thresholds` 入力で揃えたい基準に変更可能。サイズラベルは常に1種類のみ適用されます。

## カテゴリラベル (`category/*`)

- ファイルパスのグロブマッチで決定。加算方式なので複数カテゴリが同時に付与されます。
- 既定マッピング（詳細は `docs/categories.md` を参照）:
  - テスト (`__tests__/**`, `**/*.test.ts(x)`) → `category/tests`
  - CI/CD (`.github/workflows/**`) → `category/ci-cd`
  - ドキュメント (`docs/**`, 仕様を除く `*.md`) → `category/documentation`
  - 設定 (`*.config.*`, `tsconfig.json`, `action.yml` など) → `category/config`
  - 仕様 (`.kiro/**`, `specs/**`) → `category/spec`
  - 依存関係 (`package.json`, ロックファイル類) → `category/dependencies`
  - 機能コード (`src/features/**`, `src/components/**`) → `category/feature`
  - インフラ (`.github/**`, `Dockerfile`, `terraform/**`) → `category/infrastructure`
  - セキュリティ (`**/auth*/**`, `.env*`, `secrets/**`) → `category/security`
- 独自カテゴリを追加したい場合は `path_labels` にグロブとラベルのペアを定義します。

## リスクラベル (`risk/*`)

- CI結果・コアパスのテスト有無・コミットメッセージを組み合わせて判断。
- `risk/high` が付く条件:
  - いずれかのCI (lint/type-check/test/build) が失敗
  - `feat:` 系コミットで `src/**` を変更し、かつテスト (`*.test.ts`, `*.spec.ts`, `__tests__/**`) が含まれない場合
- `risk/medium` が付く条件:
  - `.github/workflows/**`, `package.json`, `tsconfig.json` など設定ファイルの変更
  - `risk.config_files` にマッチするパスの更新
- `docs:` や `test:`、`refactor:` でCI成功の場合はリスクラベルなし。
- `.github/pr-labeler.yml` の `risk` ブロックでパスや閾値を調整できます。

## 複雑度ラベル (`complexity/*`)

- デフォルトでは無効 (`complexity_enabled: "false"`)。必要に応じて有効化。
- ESLint の cyclomatic complexity を用いて最大値を算出。
- 既定閾値:
  - `15-29` → `complexity/medium`
  - `>= 30` → `complexity/high`
- `complexity_thresholds` 入力で任意の値に変更可能。

## ポリシー違反ラベル (`auto/*`)

- ワークフローで定義したガードを超えた場合に付与。
  - `auto/large-files` – 単一ファイルが `file_size_limit` を超過
  - `auto/too-many-files` – 変更ファイル数が `pr_files_limit` を超過
  - `auto/too-many-lines` – 1ファイルの行数が `file_lines_limit` を超過
  - `auto/excessive-changes` – 追加行数が `pr_additions_limit` を超過
- `fail_on_*` 入力と組み合わせると、違反ラベル発生時にCI失敗へ切り替え可能。

## ラベル自動作成

- `always-auto-create-labels` 仕様により、必要なラベルは常時自動作成されます。色や説明文を手作業で指定する必要はありません。
- ワークフロー権限には `pull-requests: write` を含め、ラベル作成権限を確保してください。

## 参考ドキュメント

- `docs/configuration.md` – 全入力・出力の詳細とカスタマイズ例
- `docs/categories.md` – カテゴリラベルごとのマッチ条件とケーススタディ
- `docs/advanced-usage.md` – フォークPR、厳格ルール、ローカライズなどの実践例
