# 技術設計書: デフォルトカテゴリラベルの拡張

## 概要

**目的**: PR Insights Labelerのデフォルトカテゴリ設定を拡張し、設定ファイル、仕様書、依存関係ファイル（多言語対応）に対する自動ラベル付けを実現する。

**ユーザー**: プロジェクト開発者は、PRに含まれるファイルタイプに基づいて自動的に付与されるカテゴリラベルを利用し、PR内容を素早く把握できる。

**影響**: 既存のDEFAULT_LABELER_CONFIG.categoriesを変更し、`category/components`を削除、`category/config`、`category/spec`、`category/dependencies`を追加する。既存のカテゴリ（tests, ci-cd, documentation）は後方互換性を維持する。

### Goals

- デフォルトカテゴリを3つ追加し、より多くのファイルタイプに対応する
- minimatchパターンで任意階層のファイルをマッチする（monorepo対応）
- 既存カテゴリとの後方互換性を完全に維持する
- 加法的（additive）ポリシーにより複数カテゴリの同時付与を保証する

### Non-Goals

- カテゴリラベル判定ロジックの変更（既存のdecideCategoryLabels関数は変更しない）
- デフォルト設定以外のYAML設定ファイルの変更
- minimatchライブラリ以外のパターンマッチング手法の導入

## Architecture

### 既存アーキテクチャ分析

**現在のアーキテクチャパターン**:

- **型定義と設定の共存**: `src/labeler-types.ts`に型定義（interfaces/types）とデフォルト設定（DEFAULT_LABELER_CONFIG）が混在
- **純粋関数パターン**: `label-decision-engine.ts`のdecideCategoryLabels()は純粋関数で、パターンマッチングのみ実施
- **minimatchベースのパターンマッチング**: すべてのカテゴリ判定はminimatchライブラリに依存

**尊重すべきドメイン境界**:

- Label Decision Engine: ラベル判定ロジック（変更なし）
- Labeler Types: 型定義とデフォルト設定（DEFAULT_LABELER_CONFIGのみ変更）
- Pattern Matcher: minimatchラッパー（変更なし）

**維持すべき統合ポイント**:

- CategoryConfigインターフェース: label（string）+ patterns（string[]）
- 加法的（additive）ポリシー: `labels.namespace_policies["category/*"]` = "additive"

### 高レベルアーキテクチャ

```mermaid
graph TB
    Config[DEFAULT_LABELER_CONFIG] --> DecisionEngine[Label Decision Engine]
    DecisionEngine --> CategoryDecider[decideCategoryLabels]
    CategoryDecider --> Minimatch[minimatch Library]
    Minimatch --> LabelDecisions[Label Decisions]

    Config -->|categories: CategoryConfig[]| CategoryDecider
    CategoryDecider -->|file paths| Minimatch
    Minimatch -->|matched labels| LabelDecisions
```

**アーキテクチャ統合**:

- **保持される既存パターン**: 純粋関数パターン、minimatchベースのパターンマッチング、加法的ポリシー
- **新規コンポーネントの理由**: なし（既存設定データのみ変更）
- **技術スタック整合性**: 既存のminimatchライブラリとTypeScript型システムを継続使用
- **ステアリング準拠**: structure.mdの「Module Responsibility」原則、tech.mdの「型安全性の徹底」原則を維持

### 技術スタック整合性

既存のPR Insights Labelerアーキテクチャに完全整合：

- **パターンマッチング**: minimatch ^10.0.3（既存ライブラリ、変更なし）
- **型システム**: TypeScript strict mode全設定（既存設定、変更なし）
- **データ構造**: CategoryConfig interface（既存インターフェース、変更なし）

**新規依存関係**: なし

**既存パターンからの逸脱**: なし

### 主要設計決定

#### Decision 1: 設定ファイルの分離とモジュール化

- **決定**: `src/configs/categories.ts`に`DEFAULT_CATEGORIES`を定義し、`src/configs/default-config.ts`で統合する
- **コンテキスト**: カテゴリ拡張を実現する最小限の変更方法を決定する必要がある
- **代替案**:
  1. `src/labeler-types.ts`のDEFAULT_LABELER_CONFIG.categoriesに直接パターンを追加・削除
  2. 実行時マージ機能の追加（デフォルト設定+ユーザー設定のマージロジック）
  3. プラグインアーキテクチャ（カテゴリを動的にロード）
- **選択アプローチ**: 設定ファイルの分離（`src/configs/`モジュール）
- **理由**:
  - 設定の責務を明確に分離（型定義と設定値を分離）
  - 既存のアーキテクチャパターンを維持
  - 保守性向上（カテゴリ設定の変更箇所が明確）
  - テスト影響範囲が限定的（DecisionEngineのテストは既存のまま）
- **トレードオフ**:
  - 獲得: 設定の保守性向上、型定義ファイルの肥大化防止、モジュール化による再利用性
  - 犠牲: わずかなファイル数の増加（`src/configs/`ディレクトリ）

#### Decision 2: 任意階層対応のパターンプレフィックス（`**/`）

- **決定**: すべてのファイル名ベースのパターンに`**/`プレフィックスを付与する
- **コンテキスト**: monorepo構成やサブディレクトリの設定・依存関係ファイルも検知する必要がある
- **代替案**:
  1. ルートのみ対象（プレフィックスなし）
  2. ユーザー設定で階層を指定可能にする
- **選択アプローチ**: すべてのパターンに`**/`を付与
- **理由**:
  - minimatchの既定動作（matchBase=false）でサブディレクトリがマッチしない問題を解決
  - monorepo構成での実用性向上（packages/\*/package.json等）
  - 要件で明示（Introduction参照）
- **トレードオフ**:
  - 獲得: monorepo対応、実用性の大幅向上
  - 犠牲: パターン数増加によるわずかなマッチングコスト（minimatchは高速なため影響軽微）

#### Decision 3: category/componentsの削除

- **決定**: デフォルト設定から`category/components`を完全削除する
- **コンテキスト**: プロジェクト固有のパターン（src/components/\*\*）は汎用性が低い
- **代替案**:
  1. デフォルトに残す（後方互換性優先）
  2. 非推奨（deprecated）マークのみ付与
- **選択アプローチ**: 完全削除
- **理由**:
  - 要件で明示（Requirement 4）
  - 各リポジトリの`.github/pr-labeler.yml`でカスタム定義すべき
  - デフォルトは汎用的なパターンのみに限定
- **トレードオフ**:
  - 獲得: デフォルト設定の汎用性向上、保守コスト削減
  - 犠牲: src/components/\*\*を使用していたプロジェクトは独自設定が必要（破壊的変更だが影響範囲は限定的）

## 要件トレーサビリティ

| 要件     | 要件概要                  | コンポーネント         | インターフェース                 | 実現方法                               |
| -------- | ------------------------- | ---------------------- | -------------------------------- | -------------------------------------- |
| 1.1-1.10 | category/config追加       | DEFAULT_LABELER_CONFIG | CategoryConfig[]                 | 16パターンの追加                       |
| 2.1-2.4  | category/spec追加         | DEFAULT_LABELER_CONFIG | CategoryConfig[]                 | 4パターンの追加                        |
| 3.1-3.14 | category/dependencies追加 | DEFAULT_LABELER_CONFIG | CategoryConfig[]                 | 15パターンの追加（5言語対応）          |
| 4.1      | category/components削除   | DEFAULT_LABELER_CONFIG | CategoryConfig[]                 | componentsエントリの削除               |
| 5.1-5.4  | 加法的適用                | label-decision-engine  | namespace_policies               | 既存の`"category/*": "additive"`を維持 |
| 6.1-6.4  | パターンマッチング正確性  | label-decision-engine  | decideCategoryLabels + minimatch | 既存ロジック維持（変更なし）           |
| 7.1-7.4  | 後方互換性                | DEFAULT_LABELER_CONFIG | CategoryConfig[]                 | tests/ci-cd/documentationパターン維持  |

## コンポーネントとインターフェース

### Configuration Layer

#### DEFAULT_LABELER_CONFIG

**責任と境界**

- **主要責任**: PR Insights Labelerのデフォルト設定値を提供する
- **ドメイン境界**: Configuration Domain（設定管理）
- **データ所有権**: デフォルトカテゴリパターンの定義と管理
- **トランザクション境界**: N/A（静的設定データ）

**依存関係**

- **Inbound**: label-decision-engine.ts（decideLabels関数）、config-loader.ts（設定マージ）
- **Outbound**: なし（純粋データ）
- **External**: minimatchライブラリ（パターン構文のみ、実行時依存なし）

**契約定義**

**データ契約**:

```typescript
interface CategoryConfig {
  label: string;        // ラベル名（例: "category/config"）
  patterns: string[];   // minimatchパターン配列
}

// DEFAULT_LABELER_CONFIGの一部
const DEFAULT_LABELER_CONFIG: LabelerConfig = {
  categories: CategoryConfig[];  // カテゴリ設定配列
  // ... 他の設定
};
```

- **事前条件**: なし（静的初期化）
- **事後条件**: CategoryConfig[]配列が返される
- **不変条件**: patternsは空でない文字列配列

**統合戦略**:

- **変更アプローチ**: 既存配列要素の追加・削除（拡張）
- **後方互換性**: 既存カテゴリ（tests, ci-cd, documentation）のパターンは変更しない
- **移行パス**: 単純な配列要素の追加・削除のため移行不要

### Decision Layer

#### decideCategoryLabels (既存関数、変更なし)

**責任と境界**

- **主要責任**: ファイルパスとカテゴリパターンをマッチングし、適用すべきラベルを返す
- **ドメイン境界**: Label Decision Domain（ラベル判定）
- **データ所有権**: なし（純粋関数）
- **トランザクション境界**: N/A（副作用なし）

**依存関係**

- **Inbound**: decideLabels関数（label-decision-engine.ts）
- **Outbound**: minimatchライブラリ
- **External**: minimatch ^10.0.3

**契約定義**

**サービスインターフェース**:

```typescript
function decideCategoryLabels(
  filePaths: string[],
  categories: CategoryConfig[]
): string[];
```

- **事前条件**: filePaths、categoriesは空でない配列
- **事後条件**: マッチしたカテゴリラベルの配列を返す（重複なし）
- **不変条件**: 同一カテゴリラベルは1回のみ返される

**統合戦略**:

- **変更アプローチ**: 変更なし（入力データ（categories）のみ変更）
- **後方互換性**: 既存の関数シグネチャとロジックを完全維持
- **移行パス**: 不要

## データモデル

### ドメインモデル

**コアコンセプト**:

- **CategoryConfig（値オブジェクト）**: ラベル名とパターン配列を持つ不変オブジェクト
- **LabelDecisions（値オブジェクト）**: 適用すべきラベルと削除すべきラベルのリスト

**ビジネスルールと不変条件**:

- カテゴリラベルは加法的（additive）ポリシーに従い、複数同時付与可能
- 同一カテゴリラベルの重複付与は禁止（decideCategoryLabels内で重複排除）
- パターンは空でない文字列配列であること

### 物理データモデル

**TypeScript型定義**:

```typescript
// CategoryConfigインターフェース（既存、変更なし）
export interface CategoryConfig {
  label: string;
  patterns: string[];
}

// DEFAULT_LABELER_CONFIG内のcategories配列（変更対象）
const categories: CategoryConfig[] = [
  // 既存カテゴリ（後方互換性維持）
  {
    label: 'category/tests',
    patterns: ['__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
  },
  {
    label: 'category/ci-cd',
    patterns: ['.github/workflows/**'],
  },
  {
    label: 'category/documentation',
    patterns: ['docs/**', '**/*.md'],
  },

  // 新規カテゴリ
  {
    label: 'category/config',
    patterns: [
      '**/*.config.js',
      '**/*.config.ts',
      '**/*.config.mjs',
      '**/*.config.cjs',
      '**/tsconfig.json',
      '**/jsconfig.json',
      '**/.editorconfig',
      '**/.eslintrc*',
      '**/.prettierrc*',
      '**/prettier.config.*',
      '**/eslint.config.*',
      '**/vitest.config.*',
      '**/vite.config.*',
      '**/.markdownlint-cli2.jsonc',
      '**/mise.toml',
      '**/action.y?(a)ml',
    ],
  },
  {
    label: 'category/spec',
    patterns: ['.kiro/**', '.specify/**', 'spec/**', 'specs/**'],
  },
  {
    label: 'category/dependencies',
    patterns: [
      // Node.js
      '**/package.json',
      '**/pnpm-lock.yaml',
      '**/yarn.lock',
      '**/package-lock.json',
      // Go
      '**/go.mod',
      '**/go.sum',
      // Python
      '**/requirements.txt',
      '**/Pipfile',
      '**/Pipfile.lock',
      '**/poetry.lock',
      '**/pyproject.toml',
      // Rust
      '**/Cargo.toml',
      '**/Cargo.lock',
      // Ruby
      '**/Gemfile',
      '**/Gemfile.lock',
    ],
  },
  // category/componentsは削除
];
```

## エラーハンドリング

### エラー戦略

本機能は既存設定データの変更のみであり、新規エラーケースは発生しない。既存のエラーハンドリング機構（neverthrowのResult型）をそのまま使用する。

### エラーカテゴリと対応

**該当なし**: 設定データの変更のみのため、実行時エラーは発生しない。

minimatchパターンの構文エラーは静的型チェックとテストで事前検出される。

### モニタリング

既存のラベル判定ロギング（`label-decision-engine.ts`内のreasoning配列）を継続使用。新規カテゴリラベルもreasoningに含まれる。

## テスト戦略

### ユニットテスト

**既存テストの維持**:

- `__tests__/label-decision-engine.test.ts`: decideCategoryLabels関数のテスト（変更不要）
- パターンマッチングロジックのテスト（変更不要）

**新規テストケース**:

1. **category/config**: `tsconfig.json`, `eslint.config.js`, `.editorconfig`, `mise.toml`のマッチング
2. **category/spec**: `.kiro/specs/foo/bar.md`のマッチング
3. **category/dependencies**: `package.json`, `go.mod`, `Cargo.toml`, `Gemfile`のマッチング
4. **任意階層マッチング**: `packages/foo/package.json`, `apps/bar/tsconfig.json`のマッチング
5. **複数カテゴリ同時付与**: `package.json` + `README.md` → `category/dependencies` + `category/documentation`
6. **後方互換性**: `__tests__/a.test.ts` → `category/tests`（従来通り）
7. **components削除確認**: `src/components/Button.tsx`が`category/components`にマッチしないこと

### 統合テスト

**既存統合テストの維持**:

- `__tests__/integration.test.ts`: メインフローのエンドツーエンドテスト（変更不要）

**追加シナリオ**:

1. デフォルト設定のロードとカテゴリ判定の統合確認
2. monorepo構成（複数階層）での動作確認
3. YAML設定とデフォルト設定のマージ動作確認

### Performance/Load

**パフォーマンステスト**:

1. パターン数増加（4→6カテゴリ、35パターン）によるマッチングコスト測定
2. 大量ファイル（1000+）に対するカテゴリ判定パフォーマンス
3. minimatchのキャッシュ効果確認

**期待値**: minimatchは高速なため、パターン数増加による影響は軽微（<10ms増加）

## セキュリティ考慮事項

**該当なし**: 本機能は静的設定データの変更のみであり、セキュリティリスクは発生しない。

minimatchパターンは信頼できるデフォルト設定のみであり、ユーザー入力は含まれない。

## パフォーマンスとスケーラビリティ

### 目標メトリクス

- **パターンマッチング時間**: 1000ファイル/PR以下で<100ms
- **メモリ使用量**: パターン数増加によるメモリオーバーヘッド<1KB

### スケーリングアプローチ

**水平スケーリング**: 該当なし（GitHub Actionsの単一実行）

**最適化手法**:

- minimatchのキャッシュ機構を活用（既定で有効）
- パターン数増加による影響はminimatchの高速性により軽微

### キャッシング戦略

minimatchライブラリの内部キャッシュを継続使用（明示的なキャッシュ実装不要）
