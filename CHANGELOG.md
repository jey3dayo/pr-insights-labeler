# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.15.0] - 2026-09-10

### ⚠️ Breaking Changes

- Under `pull_request_target`, the action now verifies that the checkout at `GITHUB_WORKSPACE` is the PR head SHA recorded in the event payload, and fails before analyzing anything when it is not (#166)
  - **Affected**: workflows using `pull_request_target` that keep the default base checkout, omit an explicit PR head checkout step, or check out only a subdirectory via `actions/checkout`'s `path` input. The guard runs at the entry point of analysis, so it cannot be avoided by disabling `size_enabled`, `complexity_enabled`, `category_enabled`, `risk_enabled`, `enable_directory_labeling`, or the per-file limit inputs. Only the draft-PR skip runs earlier
  - **Not affected**: the plain `pull_request` event. `actions/checkout` legitimately checks out the merge commit there, so the guard does not apply
  - **Why**: file size, line count, and complexity all read the local checkout. With a base checkout they measured the base revision instead of the PR head, producing wrong labels silently. A warning cannot protect correctness, because the GitHub API fallback only covers diff retrieval, not file content
  - **Action Required**: set `fetch-depth: 0` on the base checkout and add a PR head checkout step before the labeler. Do not put `continue-on-error` on it — a green job that skipped the checkout still measures the base revision

    ```yaml
    - uses: actions/checkout@v4
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

- Under `pull_request_target`, `directory_labeler_config_path` is resolved as a repository-relative path against the trusted base ref via the GitHub API. Absolute paths, paths outside the checkout, and files generated earlier in the workflow are no longer usable for that event; place the configuration in the base repository instead. Other events keep reading the local file (#166)

### ✨ Added

- read the directory labeling policy from the trusted base ref under `pull_request_target`, so a fork PR can no longer supply its own `.github/directory-labeler.yml` while metrics are measured from the PR head (#166)

### 🔄 Changed

- share the policy-ref resolution between `.github/pr-labeler.yml` and `.github/directory-labeler.yml` as a pure function, and document the `pull_request_target` checkout procedure with an explicit `FETCH_HEAD` verification (#166)
- isolate the real-ESLint module graph from the broad integration test, restore the default 5s test timeout, and drop the `hidePassedTests` option that does not exist in Vitest 5 (#168)

## [1.14.0] - 2026-09-10

### ✨ Added

- exclude additional lock files and package-manager-generated artifacts from size/line analysis by default: Gradle dependency locks (`*.lockfile`, covering `buildscript-gradle.lockfile` and per-configuration locks), PEP 751 `pylock.toml` and its named variants, `gems.locked`, `conda-lock.yml`, `cabal.project.freeze`, `maven_install.json`, and the Yarn Berry artifacts that are committed by design (`.pnp.*`, `.yarn/cache`, `.yarn/releases`, `.yarn/plugins`, `.yarn/sdks`, `.yarn/unplugged`, `.yarn/install-state.gz`). Hand-authored files stay in scope, including `requirements.txt`, `gradle/libs.versions.toml`, `pnpm-workspace.yaml`, `go.mod`, `.yarn/patches` and `.yarnrc.yml`. Agent skill definitions under `.agents/**` are excluded alongside `.claude/**`, `.codex/**` and `.kiro/**`. Opt out with `use_default_excludes: "false"` (#164)

### 🔄 Changed

- migrate `eslint-plugin-import` to `eslint-plugin-import-x` (#162)
- make the `@v1` released-action check read-only so it cannot rewrite pull-request labels, and correct the pinned-SHA comment to v7.0.1 (#163)

## [1.13.0] - 2026-09-10

### ✨ Added

- exclude compound-extension lock files (`*.lock.yaml`, `*.lock.json`, `*.lock.hcl`) and additional dependency manifests (`npm-shrinkwrap.json`, `gradle.lockfile`, `go.sum`, `Package.resolved`, `Cartfile.resolved`) from size/line analysis by default; `*.lock` alone could not match them. Opt out with `use_default_excludes: "false"`

### 🔄 Changed

- update the bundled runtime dependencies: ESLint v10 and i18next v26 (`initImmediate` was renamed to `initAsync`)
- update the development toolchain: Vitest v5, pnpm v12.3.4, and the outstanding patch/minor bumps
- pin TypeScript to the v5 line in `.ncurc.cjs`; typescript-eslint 8.x rejects TS 7.0 and ESLint is a runtime dependency of the complexity analyzer (#160)
- raise the Vitest `testTimeout` to 30s so the cold-cache integration run does not time out in CI (#161)

## [1.12.0] - 2026-08-18

### ✨ Added

- exclude fixed-name housekeeping files (`CHANGELOG.md`, `TODO.md`, `todo.txt`, `done.txt`) from size/line analysis by default; they grow mechanically and are not review-relevant. Opt out with `use_default_excludes: "false"` (#157)

## [1.11.5] - 2026-08-18

### 🔒 Security

- read the labeler policy file from the base ref under `pull_request_target`, so fork PRs can no longer rewrite their own labeling policy; docs no longer recommend checking out the PR head (#154)
- require the metrics comment to be authored by a bot account before updating it, blocking third-party signature spoofing (#148)
- avoid shell interpolation of commit SHAs in the local git diff by switching to execFile with an argument array (#148)
- pass `github.event.*` values to the CI file-detection script via environment variables instead of inline expansion (#147)
- override vulnerable transitive dependencies (undici >=6.27.0 <7, picomatch, brace-expansion): `pnpm audit --prod` now reports 0 vulnerabilities (#151)

### 🐛 Fixed

- wire `use_default_excludes` into the size/line analysis so `"false"` actually disables the default exclude patterns (#146)
- apply the YAML `exclude.additional` patterns to the size/line analysis, merged with the `additional_exclude_patterns` input (#149)
- wire the custom violation label inputs (`large_files_label` etc.) into label application and remove them when violations are resolved (#150)
- count skipped files' additions when the file-count limit truncates analysis (with exclusion patterns applied) and surface the skipped count in the summary (#153)
- treat a PR with zero labels as a successful fetch instead of a retrieval failure (#149)
- correct docs claiming complexity labels are enabled by default and fix broken relative links (#147)
- merge the generated changelog with the hand-written `[Unreleased]` section when cutting a release, so hand-written entries are no longer dropped (#140)

### 🔄 Changed

- restructure the improvement-actions and best-practices formatters into declarative section definitions and add exclude-configuration guidance to the summary (#143)
- reuse a single ESLint instance per complexity analysis run instead of creating one per file (#149)
- align CI Node versions with the node24 action runtime (setup default 24, integration matrix 22/24) (#152)
- add lefthook pre-commit/pre-push gates (#144)

## [1.11.4] - 2026-08-17

### 📝 Documentation

- restructure the documentation index by audience (Users / Maintainers) and document the canonical language policy (#135)
- add `llms.txt` as a short entry-point index for coding agents (#135)
- track missing Japanese translations of the user-facing guides in issue #136 instead of inline TODOs (#135)
- restore the required audience and tag metadata on the documentation index (#138)
- stop hand-writing last-updated dates and align the documentation metadata rules (#138)

### 🔄 Changed

- remove the Kiro spec-driven development scaffolding (`.kiro/` and the Kiro slash commands) and rewrite the contributor workflow guidance accordingly (#134)

### 🐛 Fixed

- consume the `[Unreleased]` changelog section when cutting a version, so its entries are no longer stranded below released versions and duplicated (#138)

## [1.11.3] - 2026-08-17

### 🔄 Changed

- update GitHub Actions dependencies to Node.js 24-targeting releases
- remove remaining Node.js 20 action targets from CI workflows

## [1.11.2] - 2026-08-17

### 🔄 Changed

- update the action runtime to Node.js 24 and require Node.js 22 or newer
- update the package manager to pnpm 11.22.0 and refresh compatible dependencies
- regenerate the bundled action distribution for the updated dependency set
- align Node.js and pnpm development guidance

### 🐛 Fixed

- allow trusted `esbuild` and `unrs-resolver` build scripts during pnpm installation
- remove the CI path that pushed directly to the protected `main` branch
- fix Knip entry-point configuration

### 🔧 Refactoring

- use `safeTry` for transformer parsing functions
- standardize release command documentation

## [1.11.1] - 2026-02-19

### 🔧 Refactoring

- reduce cyclomatic complexity: extract helper functions for Critical (30+) and High (28-29) complexity functions (#132)

## [1.11.0] - 2026-02-19

### 🔄 Changed

- update dependencies (ncu -u): @actions/core v3, @actions/github v9, eslint v10, typescript-eslint v8.56, vitest v4.0.18 (#131)

### 🔧 Refactoring

- tsconfig: moduleResolution=Bundler + module=ESNext for ESM-only package compatibility
- tests: migrate vi.spyOn to vi.mock + vi.mocked for ESM module mocking

## [1.10.2] - 2026-01-25

### 🔄 Changed

- add major version update instructions

### 🐛 Fixed

- git rename形式パースエラーとauto/\*ラベル削除問題の修正 (#130)

## [1.10.1] - 2025-12-12

### 🔄 Changed

- update dependencies with `npx ncu -u` (#129)

### 🔧 Refactoring

- reduce duplication and stabilize docs links (#126)
- reduce similarity-ts reported duplications (#128)

### 🔧 CI/CD

- fix test workflow dispatch payload

[1.10.1]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.10.1

## [1.10.0] - 2025-12-12

### ✨ Added

- add `file_size_limit_enabled` and `pr_additions_limit_enabled` inputs to toggle size/additions violations (#125)

### 🔄 Changed

- update PR template for rule migration (#124)

## [1.9.4] - 2025-12-02

### ✨ Added

- add `/add-exclude-files` Claude Code command for automating exclusion pattern management (#122)
- add 4 configuration files to DEFAULT_EXCLUDES: dependency-cruiser, dockerignore, coderabbit, actionlint (#122)
- add `file_size_limit_enabled` and `pr_additions_limit_enabled` inputs to toggle size/additions violations

### 📝 Documentation

- deduplicate advanced usage i18n guidance (#120)
- refresh bilingual docs (#118)
- enhance file exclusion examples in advanced.yml

### 🔧 CI/CD

- remove duplicate pr labeler workflow (#121)

### 🐛 Fixed

- Node.js version compatibility with @eslint/compat@2.0.0 (#117, #116)

### 🔄 Changed

- update dependencies and @eslint/compat v2 compatibility (#115)
- improve DEFAULT_EXCLUDES readability with categorized comments

## [1.9.3] - 2025-11-25

### ✨ Added

- improve Violations section with label names (#113)

### 🐛 Fixed

- use allFiles for risk evaluation to include test files (#114)
- display line count as '501+' when capped at limit (#112)
- correct symlink paths in release-automation skill

### 🔄 Changed

- update pnpm to version 10.23.0

## [1.8.0] - 2025-11-12

### ✨ Added

- enhance release command and repository migration improvements (#98)
- add snapshot files to default exclusion patterns (#90)
- improve i18n message clarity and formatting consistency (#89)

### 🔄 Changed

- reset version to 1.7.0 for release testing
- rename project to PR Insights Labeler and release v1.8.0 (#97)
- 依存関係とpnpmの最新パッチバージョンへの更新 (#96)
- rename project to PR Insights Labeler and release v1.8.0 (#93)

### 🐛 Fixed

- サマリーテーブルのファイルパス表示をバッククォートで囲む (#95)
- integrate violation labels into decision engine (#91)

### Other Changes

- refactor: リスク評価ロジックの抽出と違反ラベルの統合 (#92)

## [1.7.0] - 2025-11-12

### 🔄 Changed

- Minor updates and improvements

## [1.6.0] - 2025-10-31

### ✨ Added

- group files by applied labels in PR summary (#87)
- add manual workflow trigger for label reapplication
- add automated release script

### 🔄 Changed

- update dependencies to latest versions (#85)
- Add release notes template and usage instructions
- remove Claude signature from release commit messages

### 🐛 Fixed

- redirect menu output to stderr for command substitution
- remove color codes for better terminal compatibility
- use printf instead of echo -e for better shell compatibility

## [1.5.0] - 2025-10-31

### Added

- **DEFAULT_CATEGORIES Fallback**: Automatically use 9 default categories when `.github/directory-labeler.yml` is missing
  - Converts `CategoryConfig[]` to `DirectoryLabelerConfig` format
  - Includes: tests, ci-cd, documentation, config, spec, dependencies, feature, infrastructure, security
  - New conversion function: `convertCategoriesToDirectoryConfig()`
- **Risk Assessment Documentation**: Comprehensive risk label evaluation guide
  - Detailed label application rules in `docs/en/configuration.md`
  - FAQ section explaining `risk/medium` for config changes
  - Enhanced README.md and README.ja.md with risk criteria
  - Inline code comments in `src/label-decision-engine.ts`
- **Test Coverage**: New test file for conversion function with 7 test cases

### Changed

- **Directory-Based Labeling**: Enable by default (`enable_directory_labeling: true`)
  - Previously required explicit opt-in
  - Now works out-of-the-box with default categories
- **Label Prefix Unification**: Standardize all auto labels to use `/` separator
  - `auto:large-files` → `auto/large-files`
  - `auto:too-many-files` → `auto/too-many-files`
  - `auto:too-many-lines` → `auto/too-many-lines`
  - `auto:excessive-changes` → `auto/excessive-changes`
  - Updated in action.yml defaults and all documentation

### Fixed

- Import order in `src/workflow/stages/labeling.ts` (ESLint)

## [1.4.0] - 2025-10-30

### Added

- **Category Documentation**: Add comprehensive category guide (`docs/en/categories.md`)
  - 9 categories overview table with patterns and descriptions
  - Detailed explanation for each category
  - Custom category creation guide with YAML examples
  - Additive labeling policy explanation
- **New Default Categories**: Add 3 new categories based on ASTA project experience
  - `category/feature`: Detect feature files (`src/features/**`, `src/components/**`)
  - `category/infrastructure`: Detect infrastructure files (`.github/**`, `Dockerfile`, `terraform/**`, `k8s/**`, etc.)
  - `category/security`: Detect security-related files (`**/auth*/**`, `**/*jwt*.ts`, `.env*`, `secrets/**`, etc.)
- **Cross-references**: Add links to category guide from existing documentation
  - README.md, README.ja.md: Category labels section
  - docs/en/configuration.md: Category configuration section
  - docs/en/advanced-usage.md: Custom category section

### Changed

- Expand default categories from 6 to 9 types
- Improve documentation structure with centralized category information

### Fixed

- Run self-check against current branch (#80)

## [1.1.0] - TBD

### Documentation

#### 📚 README簡素化 (README Simplification)

README.mdを717行から206行に簡素化し、詳細情報を`docs/`ディレクトリに分離しました。

#### 変更内容

- **README.md簡素化**: 730行 → 206行（目標200-300行達成）
- **README.ja.md追加**: 日本語版READMEを同時リリース
- 詳細ドキュメント作成:
  - `docs/en/configuration.md`: 全入力パラメータ、出力変数、デフォルト値（440行）
  - `docs/en/advanced-usage.md`: 実践的な使用例と高度な設定（670行）
  - `docs/en/troubleshooting.md`: よくある問題と解決策（527行）
- **アンカー互換性維持**: 既存のアンカーリンク（日本語・英語・GitHubスラッグ対応）を保持
- **移行通知**: README冒頭に移行通知とアーカイブリンク追加
- **ドキュメント同期ガイドライン**: `docs/ja/documentation-guidelines.md`に多言語同期手順を追加

#### アーカイブ

以前のREADME（730行）は[pre-simplification-readme](https://github.com/jey3dayo/pr-insights-labeler/tree/pre-simplification-readme)タグで参照可能です。

**関連Issue**: #35

### BREAKING CHANGES

#### 🔧 入力パラメータ簡素化 (Simplify Label Inputs)

冗長な`apply_labels`パラメータを削除し、複雑度分析機能をデフォルトOFFに変更しました。

#### 削除されたinputs

- `apply_labels` - 個別の`*_enabled`パラメータで代替

#### 変更されたデフォルト値

- `complexity_enabled`: `"true"` → `"false"` (オプトイン機能に変更)
- `complexity_thresholds`: `'{"medium": 10, "high": 20}'` → `'{"medium": 15, "high": 30}'` (より実用的な閾値に緩和)

#### 移行ガイド

既存ユーザーが`apply_labels: "false"`を使用していた場合:

```yaml
# 旧設定
apply_labels: "false"

# 新設定（すべてのラベルを無効化）
size_enabled: "false"
complexity_enabled: "false"
category_enabled: "false"
risk_enabled: "false"
```

複雑度分析を継続利用する場合:

```yaml
# 明示的に有効化が必要
complexity_enabled: "true"
```

複雑度閾値をカスタマイズしていた場合:

```yaml
# 旧デフォルト値を維持する場合
complexity_thresholds: '{"medium": 10, "high": 20}'
```

### Added

#### 🆕 ラベルベース・ワークフロー失敗制御機能（Label-Based Workflow Failure Control）

ラベルまたは違反に基づいて、個別にワークフロー失敗を制御できる新機能を追加。

#### 新規inputs

- `fail_on_large_files` - 大きなファイル（`auto/large-files`ラベルまたは違反）が検出された場合にワークフロー失敗（デフォルト: `""`）
- `fail_on_too_many_files` - ファイル数超過（`auto/too-many-files`ラベルまたは違反）が検出された場合にワークフロー失敗（デフォルト: `""`）
- `fail_on_pr_size` - PRサイズが指定閾値以上の場合にワークフロー失敗（デフォルト: `""`）
  - 有効値: `"small"` | `"medium"` | `"large"` | `"xlarge"` | `"xxlarge"`
  - `size_enabled: "true"`が必要

#### 主な特徴

- ラベル（例: `auto/large-files`）または実際の違反のいずれかが該当すれば失敗
- 各失敗条件を個別に有効/無効化可能
- 多言語対応（日本語・英語）の失敗メッセージ

#### 使用例

```yaml
# 大きなファイルのみ厳格にチェック
fail_on_large_files: "true"

# PRサイズがlarge以上で失敗
fail_on_pr_size: "large"
size_enabled: "true"

# 組み合わせ
fail_on_large_files: "true"
fail_on_too_many_files: "true"
fail_on_pr_size: "xlarge"
```

#### 🆕 選択的ラベル有効化機能

各ラベル種別（size/complexity/category/risk）を個別にON/OFF可能にする統一インターフェースを追加 (#25)。

#### 新規inputs（統一された命名規則）

- `size_enabled` - サイズラベルの有効/無効（デフォルト: `"true"`）
- `size_thresholds` - サイズラベル閾値（JSON形式: `{"small": 100, "medium": 500, "large": 1000}`）
- `complexity_enabled` - 複雑度ラベルの有効/無効（デフォルト: `"true"`）
- `complexity_thresholds` - 複雑度ラベル閾値（JSON形式: `{"medium": 10, "high": 20}`）
- `category_enabled` - カテゴリラベルの有効/無効（デフォルト: `"true"`）
- `risk_enabled` - リスクラベルの有効/無効（デフォルト: `"true"`）

#### 統一された命名規則

- すべてのラベル種別で `*_enabled` と `*_thresholds` の一貫したパターンを採用
- より直感的で学習しやすいAPI設計

#### GitHub Actions Summary拡張

- 無効化されたラベル種別の情報をSummaryに表示
- デバッグとトラブルシューティングの容易性向上

#### 🆕 PR Labeler - インテリジェント自動ラベル付け機能

PRメトリクス分析に基づいた高度な自動ラベル付け機能を追加。従来のサイズラベル（S/M/L/XL/XXL）に加え、複数のディメンションでPRを分類します。

#### サイズベースラベル

- `size/small` - 追加行数 < 100行
- `size/medium` - 追加行数 100-500行
- `size/large` - 追加行数 500-1000行
- `size/xlarge` - 追加行数 >= 1000行
- 既存のsize/\*ラベルを自動置換（一意性保証）

#### カテゴリベースラベル

- `category/tests` - テストファイルの変更（`__tests__/**`, `**/*.test.ts`）
- `category/ci-cd` - CI/CD設定の変更（`.github/workflows/**`）
- `category/documentation` - ドキュメント変更（`docs/**`, `**/*.md`）
- `category/config` - 設定ファイルの変更（`**/tsconfig.json`, `**/eslint.config.*`, `**/mise.toml`等）
- `category/spec` - 仕様書・計画ドキュメントの変更（`.kiro/**`, `spec/**`等）
- `category/dependencies` - 依存関係ファイルの変更（`**/package.json`, `**/go.mod`, `**/Cargo.toml`等、多言語対応）
- minimatchパターンマッチングでカスタマイズ可能
- 任意階層対応（`**/`プレフィックス）でmonorepo構成もサポート
- 複数カテゴリ同時付与（加法ポリシー）

#### リスクベースラベル

- `risk/high` - テストなしでコア機能変更（`src/**`）
- `risk/medium` - 設定ファイル変更（`package.json`, `tsconfig.json`, `.github/workflows/**`）
- レビュー優先度の可視化

#### 設定の柔軟性

- `.github/pr-labeler.yml`でカスタマイズ可能
- 閾値、パターン、ラベル名をプロジェクト固有に調整
- デフォルト設定でゼロ設定で即利用可能

#### 技術実装

- Railway-Oriented Programming（neverthrow）による堅牢なエラーハンドリング
- 冪等性保証（同じPR状態で再実行しても同じラベル）
- 権限不足時の適切な処理（フォークPR対応）
- レート制限対応（指数バックオフリトライ）
- 新規依存関係: `js-yaml` 4.1.0（YAML設定パース）

**テストカバレッジ**: 90.17%（282テスト成功）

#### 新規モジュール

- `src/labeler-types.ts` - PR Labeler用の型定義とデフォルト設定
- `src/config-loader.ts` - YAML設定の読み込みとバリデーション
- `src/label-decision-engine.ts` - サイズ、カテゴリ、リスクのラベル判定ロジック
- `src/label-applicator.ts` - 冪等性を保証したラベル適用

### Changed

- `src/index.ts` - PR Labeler機能を既存フローに統合
- `src/index.ts` - Step 10の失敗判定ロジックを`evaluateFailureConditions`ベースに置き換え

### Note

### 複雑度ベースラベル（complexity/medium, complexity/high）は将来拡張として v1.2.0 で実装予定

## [1.0.1] - 2025-10-19

### Fixed

- **CI環境でのビルド検証失敗を修正** (#9)
  - TypeScript `declarationMap` を無効化して環境依存パスを削除
  - `.d.ts.map` ファイル (24個) を削除し、環境固有の絶対パスが埋め込まれる問題を解決
  - CIワークフローの差分チェックで環境依存ファイル (`*.map`, `*.d.ts`, `*.d.ts.map`) を除外
  - ローカルとCI環境でビルド結果が一致するように修正

### Technical Details

- `tsconfig.json` から `declarationMap: true` を削除
- `.github/workflows/quality.yml` の "Verify dist/ Build" ステップを改善
- 非決定的なビルド成果物を差分チェックから除外する保護策を追加

## [1.0.0] - 2025-10-18

### Added

#### Core Features

- **ファイルサイズチェック**: 個別ファイルのサイズ制限を監視
- **行数制限チェック**: ファイルごと・PR全体の行数を制限
- **自動ラベル付け**: PRサイズに応じたラベル（S/M/L/XL/XXL）を自動適用
- **コメント投稿**: 違反内容を詳細レポートとして自動コメント
- **GitHub Actions Summary出力**: ワークフローサマリーページにメトリクスを表示
  - 基本メトリクス（総追加行数、ファイル数、実行時刻）
  - 違反情報の詳細テーブル
  - ファイル詳細一覧（上位100件）
  - `enable_summary` パラメータで有効/無効を制御（デフォルト: true）

#### Technical Features

- **柔軟な除外パターン**: minimatchによる高度なファイル除外設定
- **型安全なエラーハンドリング**: neverthrowの`Result<T, E>`パターン採用
- **冪等性**: 何度実行しても同じ結果を保証
- **Draft PRスキップ**: Draft PRを自動的にスキップ可能

#### Configuration

- カスタマイズ可能な制限値（ファイルサイズ、行数、PR追加行数、ファイル数）
- コメントモード設定（always/auto/never）
- ラベル自動削除設定

### Technical Details

- TypeScript 5.0+ strict mode
- Node.js 20+ 対応
- 完全なテストカバレッジ（93%+）
- @actions/core Summary API統合

---

[1.0.1]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.0.1
[1.0.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.0.0
[1.15.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.15.0
[1.14.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.14.0
[1.13.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.13.0
[1.12.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.12.0
[1.11.5]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.11.5
[1.11.4]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.11.4
[1.11.3]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.11.3
[1.11.2]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.11.2
[1.11.1]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.11.1
[1.10.2]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.10.2
[1.10.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.10.0
[1.9.4]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.9.4
[1.9.3]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.9.3
[1.8.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.8.0
[1.7.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.7.0
[1.6.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.6.0
[1.5.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.5.0
[1.4.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.4.0
[1.1.0]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.1.0
