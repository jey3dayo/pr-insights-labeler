# Requirements Document

## Introduction

PR Insights Labelerのデフォルトカテゴリ設定を拡張し、より多くのファイルタイプに適切なラベルを自動付与できるようにします。現在のデフォルト設定は限定的（tests, ci-cd, documentation, components）であり、設定ファイル、仕様書、依存関係ファイルなどに対応していません。

この機能により、多言語対応の依存関係ファイルや各種設定ファイルにも自動的にカテゴリラベルが付与され、PR分類の可視性が向上し、プロジェクト固有の設定ファイルを作成する必要性が減少します。

**パターンマッチングスコープ**: すべてのファイルパターンはminimatchライブラリを使用し、リポジトリルートだけでなく任意のディレクトリ階層でマッチします（`**/`プレフィックス使用）。これにより、monorepo構成やサブディレクトリの設定・依存関係ファイルも正しく検知できます。

## Requirements

### Requirement 1: 設定ファイルカテゴリの追加

**Objective:** As a プロジェクト開発者, I want 各種設定ファイルに`category/config`ラベルが自動付与される, so that 設定変更を含むPRを一目で識別できる

#### Acceptance Criteria

1. WHEN PRに`**/*.config.js`, `**/*.config.ts`, `**/*.config.mjs`, `**/*.config.cjs`のいずれかのファイルが含まれる THEN the PR Insights Labeler SHALL `category/config`ラベルを付与する
2. WHEN PRに`**/tsconfig.json`または`**/jsconfig.json`が含まれる THEN the PR Insights Labeler SHALL `category/config`ラベルを付与する
3. WHEN PRに`**/.editorconfig`が含まれる THEN the PR Insights Labeler SHALL `category/config`ラベルを付与する
4. WHEN PRに`**/.eslintrc*`パターンに一致するファイル（`.eslintrc.js`, `.eslintrc.json`等）が含まれる THEN the PR Insights Labeler SHALL `category/config`ラベルを付与する
5. WHEN PRに`**/.prettierrc*`パターンに一致するファイル（`.prettierrc`, `.prettierrc.json`等）が含まれる THEN the PR Insights Labeler SHALL `category/config`ラベルを付与する
6. WHEN PRに`**/prettier.config.*`または`**/eslint.config.*`パターンのファイルが含まれる THEN the PR Insights Labeler SHALL `category/config`ラベルを付与する
7. WHEN PRに`**/vitest.config.*`または`**/vite.config.*`パターンのファイルが含まれる THEN the PR Insights Labeler SHALL `category/config`ラベルを付与する
8. WHEN PRに`**/.markdownlint-cli2.jsonc`が含まれる THEN the PR Insights Labeler SHALL `category/config`ラベルを付与する
9. WHEN PRに`**/mise.toml`が含まれる THEN the PR Insights Labeler SHALL `category/config`ラベルを付与する
10. WHEN PRに`**/action.y?(a)ml`が含まれる THEN the PR Insights Labeler SHALL `category/config`ラベルを付与する

### Requirement 2: 仕様書カテゴリの追加

**Objective:** As a プロジェクト開発者, I want 仕様書・計画ドキュメントに`category/spec`ラベルが自動付与される, so that 仕様変更を含むPRを明確に識別できる

#### Acceptance Criteria

1. WHEN PRに`.kiro/`ディレクトリ配下のファイルが含まれる THEN the PR Insights Labeler SHALL `category/spec`ラベルを付与する
2. WHEN PRに`.specify/`ディレクトリ配下のファイルが含まれる THEN the PR Insights Labeler SHALL `category/spec`ラベルを付与する
3. WHEN PRに`spec/`ディレクトリ配下のファイルが含まれる THEN the PR Insights Labeler SHALL `category/spec`ラベルを付与する
4. WHEN PRに`specs/`ディレクトリ配下のファイルが含まれる THEN the PR Insights Labeler SHALL `category/spec`ラベルを付与する

### Requirement 3: 依存関係ファイルカテゴリの追加（多言語対応）

**Objective:** As a プロジェクト開発者, I want 依存関係ファイルに`category/dependencies`ラベルが自動付与される, so that 依存関係の更新を含むPRを素早く識別できる

#### Acceptance Criteria（Node.js）

1. WHEN PRに`**/package.json`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する
2. WHEN PRに`**/pnpm-lock.yaml`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する
3. WHEN PRに`**/yarn.lock`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する
4. WHEN PRに`**/package-lock.json`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する

#### Acceptance Criteria（Go）

1. WHEN PRに`**/go.mod`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する
2. WHEN PRに`**/go.sum`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する

#### Acceptance Criteria（Python）

1. WHEN PRに`**/requirements.txt`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する
2. WHEN PRに`**/Pipfile`または`**/Pipfile.lock`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する
3. WHEN PRに`**/poetry.lock`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する
4. WHEN PRに`**/pyproject.toml`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する

#### Acceptance Criteria（Rust）

1. WHEN PRに`**/Cargo.toml`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する
2. WHEN PRに`**/Cargo.lock`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する

#### Acceptance Criteria（Ruby）

1. WHEN PRに`**/Gemfile`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する
2. WHEN PRに`**/Gemfile.lock`が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`ラベルを付与する

### Requirement 4: category/componentsの削除

**Objective:** As a プロジェクト保守者, I want 汎用性の低い`category/components`をデフォルト設定から削除する, so that プロジェクト固有の設定は各リポジトリの`.github/pr-labeler.yml`で定義される

#### Acceptance Criteria

1. WHEN デフォルト設定が読み込まれる THEN the DEFAULT_LABELER_CONFIG.categories SHALL `category/components`エントリを含まない
2. WHERE プロジェクト固有のコンポーネントカテゴリが必要な場合 THE 開発者 SHALL `.github/pr-labeler.yml`に独自のcategoryパターンを定義できる

### Requirement 5: カテゴリラベルの加法的適用

**Objective:** As a PR作成者, I want 複数のカテゴリラベルが同時に付与される, so that PRの変更内容を多角的に把握できる

#### Acceptance Criteria

1. WHEN PRに設定ファイルとテストファイルの両方が含まれる THEN the PR Insights Labeler SHALL `category/config`と`category/tests`の両方のラベルを付与する
2. WHEN PRに依存関係ファイルとドキュメントの両方が含まれる THEN the PR Insights Labeler SHALL `category/dependencies`と`category/documentation`の両方のラベルを付与する
3. WHEN PRに仕様書と設定ファイルの両方が含まれる THEN the PR Insights Labeler SHALL `category/spec`と`category/config`の両方のラベルを付与する
4. WHERE 既存のカテゴリラベル名前空間ポリシー THE the PR Insights Labeler SHALL `category/*`名前空間に対して加法的（additive）ポリシーを維持する

### Requirement 6: パターンマッチングの正確性

**Objective:** As a システム, I want minimatchパターンで正確にファイルをマッチする, so that 誤ったラベル付与を防ぐ

#### Acceptance Criteria

1. WHEN パターンマッチングを実行する THEN the PR Insights Labeler SHALL minimatchライブラリを使用してファイルパスとパターンを比較する
2. WHEN ワイルドカード（`*`）を含むパターンが定義されている THEN the PR Insights Labeler SHALL すべての一致するファイル名に対してマッチする
3. WHEN グロブパターン（`**`）が定義されている THEN the PR Insights Labeler SHALL すべてのディレクトリ階層を再帰的にマッチする
4. WHEN 拡張子パターン（`.config.*`）が定義されている THEN the PR Insights Labeler SHALL すべての拡張子バリエーション（`.config.js`, `.config.ts`等）にマッチする

### Requirement 7: 後方互換性の維持

**Objective:** As a 既存ユーザー, I want 既存のデフォルトカテゴリ（tests, ci-cd, documentation）が引き続き動作する, so that 既存のPRラベリング動作が変更されない

#### Acceptance Criteria

1. WHEN 新しいデフォルト設定が適用される THEN the PR Insights Labeler SHALL `category/tests`ラベルを`__tests__/**`, `**/*.test.ts`, `**/*.test.tsx`パターンに対して付与し続ける
2. WHEN 新しいデフォルト設定が適用される THEN the PR Insights Labeler SHALL `category/ci-cd`ラベルを`.github/workflows/**`パターンに対して付与し続ける
3. WHEN 新しいデフォルト設定が適用される THEN the PR Insights Labeler SHALL `category/documentation`ラベルを`docs/**`, `**/*.md`パターンに対して付与し続ける
4. WHEN デフォルト設定が変更される AND 既存テストスイートが実行される THEN すべての既存テスト SHALL 引き続きパスする
