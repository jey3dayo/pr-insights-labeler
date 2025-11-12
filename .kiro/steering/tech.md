# Technology Stack - PR Insights Labeler

> updated_at: 2025-11-12T08:47:09Z

## Architecture

### System Design

GitHub Actionとして動作する単一プロセスのTypeScriptアプリケーション。@vercel/nccでバンドルされた`dist/index.js`が実行エントリーポイント。

```
GitHub Event (PR) → Action Runner → dist/index.js
                                          ↓
                                    Input Parsing
                                          ↓
                                    File Analysis
                                          ↓
                              ┌──────────┴──────────┐
                              ↓                     ↓
                        Label Management    Comment Management
                              ↓                     ↓
                              └──────────┬──────────┘
                                         ↓
                               GitHub Actions Summary
```

### Core Components

**PR Metrics機能（既存）**:

1. **Input Mapper** (`input-mapper.ts`): GitHub Actions入力の検証とパース
2. **File Metrics** (`file-metrics.ts`): ファイルサイズと行数の分析
3. **Diff Strategy** (`diff-strategy.ts`): Git差分に基づくメトリクス収集
4. **Pattern Matcher** (`pattern-matcher.ts`): minimatchベースのファイル除外
5. **Label Manager** (`label-manager.ts`): GitHub APIを使ったラベル管理
6. **Comment Manager** (`comment-manager.ts`): PRコメントの作成・更新
7. **Report Formatter** (`report-formatter.ts`): Markdownレポート生成

**🆕 PR Insights Labeler機能（新規）**:

1. **Configuration Loader** (`config-loader.ts`): YAML設定の読み込みとバリデーション
2. **Label Decision Engine** (`label-decision-engine.ts`): メトリクスベースのラベル判定ロジック
3. **Label Applicator** (`label-applicator.ts`): 冪等性を保証したラベル適用
4. **Labeler Types** (`labeler-types.ts`): PR Insights Labeler用の型定義とデフォルト設定
5. **Complexity Analyzer** (`complexity-analyzer.ts`): ESLint標準complexityルールによる循環的複雑度分析
6. **Input Mapper** (`input-mapper.ts`): 選択的ラベル有効化を含む入力パラメータマッピング

**🆕 Directory-Based Labeler機能**:

1. **Directory Labeler Config Loader** (`directory-labeler/config-loader.ts`): directory-labeler.yml設定の読み込み
2. **Directory Labeler Decision Engine** (`directory-labeler/decision-engine.ts`): パス→ラベルマッピングと優先順位制御
3. **Directory Labeler Pattern Matcher** (`directory-labeler/pattern-matcher.ts`): Globパターンマッチングとフィルタリング
4. **Directory Labeler Label Applicator** (`directory-labeler/label-applicator.ts`): 名前空間ポリシーに基づくラベル適用
5. **Directory Labeler Logging** (`directory-labeler/logging.ts`): 構造化ロギング
6. **Directory Labeler Types** (`directory-labeler/types.ts`): Directory Labeler専用型定義

**共通モジュール（リファクタリング）**:

1. **Error Handling** (`errors/`):

- `errors/types.ts`: 統一されたエラー型定義
- `errors/factories.ts`: エラーファクトリー関数
- `errors/guards.ts`: 型ガード関数
- `errors/index.ts`: エラーモジュールエクスポート

1. **Configuration Management** (`configs/`):

- `configs/default-config.ts`: デフォルト設定値
- `configs/categories.ts`: デフォルトカテゴリ定義
- `configs/index.ts`: 設定モジュールエクスポート

**Config Layer Pattern（2024アップデート）**:

- `config-builder.ts`: Action入力・YAML設定・環境変数を優先順位付きで統合し、`CompleteConfig`を生成
- `config/`: `loaders/`がGitHub設定取得・YAMLパース・バリデーションを専門化、`transformers/`が設定整形を担当
- `environment-loader.ts`: LANGUAGE/LANGとGitHubトークンを1カ所で読み込み、他モジュールからの直接`process.env`アクセスを排除

**Workflow Pipeline（Stage Orchestration）**:

- `workflow/`: `stages/`ディレクトリでinitialization→analysis→labeling→finalizationの順に処理を分割
- `workflow/policy/pr-failure-evaluator.ts`: ラベル適用結果と解析メトリクスを突き合わせて失敗条件を算出
- `pipeline.ts`: 各ステージの公開APIを束ね、上位レイヤーからの利用をシンプルにする

**Internationalization Stack**:

- `i18n.ts`: i18nextを初期化し、多言語ログ/サマリー/コメント向けの`t`関数を提供
- `locales/{en,ja}/`: summary・logs・labels・errors・commonの5命名空間をJSONで管理し、nccバンドルに静的同梱
- `scripts/generate-i18n-types.ts`: postinstallで`src/types/i18n.d.ts`を再生成し、翻訳キーと言語コードの型安全性を保証
- `environment-loader.ts`＋`config-builder.ts`: language解決をAction入力→設定ファイル→環境変数の優先順位で正規化
- `summary/`: formattersがGitHub Actions Summary出力を分割し、翻訳テキストを再利用

### Error Handling Architecture

- **neverthrow**: Railway-Oriented Programming (ROP) パターンを採用
- `Result<T, E>` 型による明示的なエラーハンドリング
- `.andThen()`, `.orElse()` による関数合成
- エラーの伝播とリカバリーの明確な分離

## Language & Runtime

### TypeScript Configuration

- **Version**: 5.9.3
- **Target**: ES2022
- **Module System**: Node16 (ESM互換)
- **Strict Mode**: 完全有効
  - `strict: true`
  - `noImplicitAny: true`
  - `strictNullChecks: true`
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
- **Source Maps**: 有効（デバッグ用）
- **Declaration Maps**: 有効（型定義追跡用）

### Node.js

- **Required Version**: >=20
- **Runtime Environment**: GitHub Actions Ubuntu runner
- **Module Resolution**: Node16 (package.json "type": "module" 非対応、CommonJS形式)

### Package Manager

- **Tool**: pnpm 10.19.0
- **Lock File**: `pnpm-lock.yaml`
- **Workspaces**: 非使用（単一パッケージ）
- 2024-11: packageManagerフィールドでpnpm 10.19.0を固定し、postinstallでi18n型生成スクリプトを走らせる

## Core Dependencies

### GitHub Actions SDK

```json
{
  "@actions/core": "^1.11.1",      // Actions入出力、ロギング
  "@actions/github": "^6.0.1",     // GitHub APIクライアント
  "@octokit/rest": "^22.0.0"       // REST API型定義
}
```

### Utility Libraries

```json
{
  "bytes": "^3.1.2",               // サイズ文字列パース（"100KB" → バイト数）
  "minimatch": "^10.0.3",          // Globパターンマッチング
  "neverthrow": "^8.2.0",          // Railway-Oriented Programming
  "p-limit": "3.1.0",              // 🆕 並行処理制御（複雑度分析の並列化）
  "js-yaml": "^4.1.0",             // 🆕 YAML設定パース（PR Insights Labeler / Directory Labeler）
  "@typescript-eslint/parser": "^8.46.1"  // 🆕 TypeScript AST解析（複雑度分析）
}
```

## Development Tools

### Build System

- **Bundler**: `@vercel/ncc` - 単一ファイルバンドル + 依存関係同梱
- **Output**: `dist/index.js` + `dist/licenses.txt`
- **Source Maps**: 有効
- **Build Command**: `pnpm build`

### Testing Framework

- **Runner**: Vitest 4.0.1
- **Coverage**: @vitest/coverage-v8（93%以上）
- **UI**: @vitest/ui（インタラクティブテストビュー）
- **Test Pattern**: `__tests__/**/*.test.ts`
- **tsconfig**: `tsconfig.test.json`でVitest用の型設定を分離
- **Commands**:
  - `pnpm test`: 全テスト + lint + type-check
  - `pnpm test:vitest`: Vitestのみ実行
  - `pnpm test:watch`: ウォッチモード
  - `pnpm test:coverage`: カバレッジレポート生成

### Code Quality Tools

#### ESLint

- **Version**: 9.38.0 (Flat Config)
- **Parser**: typescript-eslint v8.46.2
- **Plugins**:
  - `eslint-plugin-import`: import文の整理
  - `eslint-plugin-neverthrow`: neverthrow使用時のベストプラクティス
  - `eslint-plugin-simple-import-sort`: import自動ソート
- **Config**: `eslint.config.js` (Flat Config形式)

#### Prettier

- **Version**: 3.6.2
- **Integration**: eslint-config-prettier（ESLintとの競合回避）
- **Config**: `prettier.config.js`

#### TypeScript Compiler

- **Type Check**: `tsc --noEmit`（型チェックのみ、ビルドはnccで実施）
- **Strictness**: 最高レベル（全strictオプション有効）

### Automation Scripts

- `pnpm generate:i18n-types`: i18next翻訳JSONから`src/types/i18n.d.ts`を再生成（postinstallでも自動実行）
- `scripts/generate-i18n-types.ts`: tsxランタイムで実行、翻訳リソースのimportにより型崩れを検知

## Development Environment

### Required Tools

1. **Node.js**: v20以上（LTS推奨）
2. **pnpm**: 10.19.0（`packageManager`フィールドで固定、postinstallでi18n型を再生成）
3. **Git**: バージョン管理

### Optional Tools

- **mise/asdf**: Node.jsバージョン管理（推奨）
- **tsx**: 開発時のTypeScript実行（`pnpm dev`）

### IDE/Editor Recommendations

- **VSCode**: TypeScript/ESLint/Prettier拡張機能
- **EditorConfig**: `.editorconfig`で基本設定

## Common Commands

### Development

```bash
pnpm dev              # Watch mode (tsx watch)
pnpm build            # Production build (ncc)
```

### Testing

```bash
pnpm test             # Full test suite (lint + type-check + vitest)
pnpm test:quick       # Lint + type-check only
pnpm test:watch       # Vitest watch mode
pnpm test:ui          # Vitest UI
pnpm test:coverage    # Coverage report
```

### Code Quality

```bash
pnpm lint             # ESLint check
pnpm lint:fix         # ESLint auto-fix
pnpm type-check       # TypeScript type check
pnpm format           # Prettier format
pnpm format:check     # Prettier check
pnpm check            # lint + type-check + format:check
pnpm check:all        # check + test:vitest
```

### Shortcuts

```bash
pnpm fix              # lint:fix + format (all auto-fixes)
```

### Utilities

```bash
pnpm generate:i18n-types  # 翻訳リソース更新時に型定義を再生成
```

## Environment Variables

### GitHub Actions Context

GitHub Actionsランタイムから自動的に提供される環境変数を使用：

- `GITHUB_TOKEN`: GitHub API認証トークン（`github_token`入力から取得）
- `GITHUB_EVENT_PATH`: PRイベントペイロードのパス
- `GITHUB_REPOSITORY`: リポジトリ名（owner/repo）
- `GITHUB_SHA`: コミットSHA
- `GITHUB_REF`: ブランチ参照
- `LANGUAGE` / `LANG`: デフォルト言語の解決に使用（config-builderで英語/日本語へ正規化）
- `GH_TOKEN`: `GITHUB_TOKEN`が未指定の場合のフォールバック

### Action Inputs

`action.yml`で定義されたすべての入力パラメータ（`input-mapper.ts`でパース）：

- 制限値: `file_size_limit`, `file_lines_limit`, `pr_additions_limit`, `pr_files_limit`
- ラベル設定:
  - 選択的有効化: `size_enabled`, `complexity_enabled`, `category_enabled`, `risk_enabled`
  - 閾値設定: `size_thresholds`, `complexity_thresholds`
  - その他: `auto_remove_labels`, `large_files_label`, `too_many_files_label`, `too_many_lines_label`, `excessive_changes_label`
- 動作設定: `skip_draft_pr`, `comment_on_pr`, `fail_on_large_files`, `fail_on_too_many_files`, `fail_on_pr_size`, `enable_summary`, `language`
- 除外設定: `additional_exclude_patterns`

## Port Configuration

N/A（GitHub Actionとして動作するため、ポート使用なし）

## Build Output

### Distribution Files

```
dist/
├── index.js          # バンドルされたメインファイル（単一ファイル）
├── index.js.map      # Source map
└── licenses.txt      # 依存関係のライセンス情報
```

### Git Management

- `dist/`はバージョン管理対象（GitHub Actionsの実行に必要）
- ビルド後は必ず`dist/`をコミット
- `.gitattributes`で差分表示を制御（推奨）

## CI/CD

### GitHub Actions Workflows

1. **自己チェック**: このアクション自体をPRでテスト
2. **テスト**: lint + type-check + vitest
3. **リリース**: タグプッシュ時のdist/更新確認

### Release Process

1. `CHANGELOG.md`更新
2. `package.json`バージョンアップ
3. `pnpm build` 実行
4. `dist/`をコミット
5. GitタグプッシュとGitHub Release作成

詳細は`docs/release-process.md`を参照。

## Security Considerations

- **GitHub Token**: 必要な権限のみ要求（`pull-requests: write`, `issues: write`, `contents: read`）
- **Fork PR**: `pull_request_target`イベントでの安全な動作
- **依存関係**: Dependabot/Renovateによる自動更新（推奨）
- **Secret Management**: トークンは`secrets.GITHUB_TOKEN`から取得
