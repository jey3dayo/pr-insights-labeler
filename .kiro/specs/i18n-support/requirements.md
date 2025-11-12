# Requirements Document: i18n Support

## Introduction

PR Insights Labelerの多言語対応（i18n）機能を実装します。現在、すべての出力メッセージとドキュメントが英語のみで提供されており、日本語を含む他言語のユーザーにとって利用しづらい状況です。この機能により、GitHub Actions Summaryの出力、エラーメッセージ、ログメッセージ、ドキュメントを多言語化し、グローバルなユーザーベースに対応します。

**ビジネス価値**:

- 日本語ユーザーの利用体験向上
- グローバルな採用促進
- 将来的な多言語展開の基盤構築

**技術方針**:

- i18nライブラリの導入（i18next等を検討）
- デフォルト言語: 英語
- 優先サポート言語: 日本語
- 環境変数または設定ファイルによる言語切り替え

## Architecture Decisions

設計判断が必要な主要論点について、以下の決定を行いました：

### AD-1: i18nライブラリの選定

**決定**: i18next を採用

**理由**:

- Node.js環境での安定性とエコシステムの充実
- TypeScript型定義の充実と型安全性のサポート
- 将来的な複数形対応、変数補間、名前空間などの拡張性
- GitHub Actionsでの実績とバンドルサイズの妥当性
- プラグイン不要のシンプルな構成で運用可能

### AD-2: ディレクトリ構成とキー設計

**ディレクトリ構成**:

```
src/locales/
├── en/
│   ├── summary.json      # GitHub Actions Summary関連
│   ├── errors.json       # エラーメッセージ
│   ├── labels.json       # ラベル関連
│   ├── logs.json         # ログメッセージ
│   └── common.json       # 共通メッセージ
└── ja/
    ├── summary.json
    ├── errors.json
    ├── labels.json
    ├── logs.json
    └── common.json
```

**キー命名規則**:

- ドット区切り lowerCamel形式（例: `summary.overview.title`）
- キーは英語で固定、値を各言語で翻訳
- 名前空間: `summary`, `errors`, `labels`, `logs`, `common`

### AD-3: 言語決定の優先順位

**優先順位** (高→低):

1. 環境変数 `LANGUAGE` または `LANG`
2. 設定ファイル `pr-labeler.yml` の `language` フィールド
3. デフォルト: `en` (英語)

**実装方針**:

- 上位の設定が存在する場合、下位の設定は無視
- 不正な言語コードの場合は警告ログを出力し、次の優先順位へフォールバック

### AD-4: 表示名と実体名の分離

**決定**: GitHubラベルの実体名は英語固定、表示テキストのみ多言語化

**理由**:

- GitHub APIのラベル名は英語固定が一般的な慣習
- 多言語ラベル名は混乱を招く可能性がある
- Summary/コメントなどの説明文は多言語化

**設定スキーマ例**:

```yaml
# pr-labeler.yml
labels:
  size_small:
    name: "size/small"  # GitHub実ラベル名（英語固定）
    display_name:       # 表示名（多言語対応）
      en: "Size: Small"
      ja: "サイズ: 小"
```

### AD-5: ロケール表記の仕様

**数値フォーマット**:

- `Intl.NumberFormat` を使用
- ロケールに応じた桁区切り（英語: "1,000" / 日本語: "1,000"）

**ファイルサイズ**:

- 基数: 1024 (バイナリ単位)
- 単位: B, KB, MB, GB
- 言語別表記: 英語・日本語とも同じ単位記号を使用（"100 KB"）

### AD-6: 型安全の実装

**方針**:

1. 翻訳JSONから型定義を自動生成するスクリプト
2. CIでの翻訳キー整合性チェック
3. i18nextの型拡張による型安全なキーアクセス

**実装**:

- ビルド時に `scripts/generate-i18n-types.ts` で型生成
- `src/types/i18n.ts` に型定義を出力
- エディタでのキー補完とコンパイルエラー検出

## Requirements

### Requirement 1: i18nシステム基盤

**Objective:** As a PR Insights Labeler developer, I want a robust i18n system foundation, so that all user-facing text can be consistently translated across the application

#### Acceptance Criteria

1. WHEN PR Insights Labeler initializes THEN PR Insights Labeler SHALL use i18next library for internationalization management
2. WHEN PR Insights Labeler initializes THEN PR Insights Labeler SHALL load translation resources for the selected language (English or Japanese)
3. WHEN determining the language THEN PR Insights Labeler SHALL follow this priority order: (1) `LANGUAGE` or `LANG` environment variable, (2) `language` field in pr-labeler.yml, (3) default to English
4. IF a translation key is missing in the selected language THEN PR Insights Labeler SHALL fall back to the English translation
5. IF an invalid language code is specified THEN PR Insights Labeler SHALL log a warning AND fall back to the next priority level
6. WHEN loading translation resources fails THEN PR Insights Labeler SHALL log a warning AND continue with English fallback
7. WHERE translation resources are stored THE PR Insights Labeler SHALL organize them in `src/locales/{lang}/{namespace}.json` structure (e.g., `src/locales/en/summary.json`)
8. WHEN organizing translations THEN PR Insights Labeler SHALL use the following namespaces: `summary`, `errors`, `labels`, `logs`, `common`
9. WHERE translation keys are defined THE PR Insights Labeler SHALL use dot-separated lowerCamel format (e.g., `summary.overview.title`)

### Requirement 2: 出力メッセージの多言語化

**Objective:** As a PR Insights Labeler user, I want all output messages in my preferred language, so that I can understand the analysis results without language barriers

#### Acceptance Criteria

1. WHEN generating GitHub Actions Summary THEN PR Insights Labeler SHALL translate all section headers, labels, and descriptions
2. WHEN generating PR comments THEN PR Insights Labeler SHALL translate all comment content including violation messages and recommendations
3. WHEN logging informational messages THEN PR Insights Labeler SHALL translate all log messages to the selected language
4. WHEN reporting errors THEN PR Insights Labeler SHALL translate all error messages while preserving technical details (file names, line numbers, etc.)
5. WHEN applying labels THEN PR Insights Labeler SHALL translate label descriptions in the GitHub Actions Summary
6. WHEN displaying numeric values THEN PR Insights Labeler SHALL use `Intl.NumberFormat` with locale-appropriate formatting (e.g., "1,000" for both English and Japanese)
7. WHEN displaying file sizes THEN PR Insights Labeler SHALL use binary units (base 1024) with format "100 KB" and units B/KB/MB/GB
8. WHERE technical terms appear (file names, paths, error codes) THE PR Insights Labeler SHALL keep them in their original form without translation

### Requirement 3: 設定ファイルの多言語対応

**Objective:** As a PR Insights Labeler administrator, I want to customize label names and categories in multiple languages, so that my team can use the tool in their native language

#### Acceptance Criteria

1. WHEN loading pr-labeler.yml configuration THEN PR Insights Labeler SHALL support `display_name` field with multi-language definitions (e.g., `display_name: { en: "Size: Small", ja: "サイズ: 小" }`)
2. WHEN applying labels to GitHub THEN PR Insights Labeler SHALL use the English `name` field as the actual label name (e.g., "size/small")
3. WHEN displaying labels in Summary or comments THEN PR Insights Labeler SHALL use the localized `display_name` from the selected language
4. IF a `display_name` is not defined for the selected language THEN PR Insights Labeler SHALL fall back to the English `display_name`
5. IF `display_name` is not provided at all THEN PR Insights Labeler SHALL use the `name` field as display text
6. WHEN custom translations are provided in configuration THEN PR Insights Labeler SHALL merge them with built-in translations
7. WHERE label configuration is defined THE PR Insights Labeler SHALL maintain backward compatibility with existing English-only `name` configurations

### Requirement 4: 後方互換性とマイグレーション

**Objective:** As an existing PR Insights Labeler user, I want my current configuration to continue working without changes, so that I can adopt i18n support gradually

#### Acceptance Criteria

1. WHEN using existing English-only configuration THEN PR Insights Labeler SHALL continue to work without any modifications
2. WHEN no language-specific configuration is provided THEN PR Insights Labeler SHALL use default English messages
3. IF configuration contains only English strings THEN PR Insights Labeler SHALL treat them as English translations
4. WHEN migrating to multi-language configuration THEN PR Insights Labeler SHALL support both old and new configuration formats
5. WHERE existing label names are used THE PR Insights Labeler SHALL maintain backward compatibility with English-only label names

### Requirement 5: 開発者体験とメンテナンス性

**Objective:** As a PR Insights Labeler contributor, I want an easy-to-maintain translation system, so that adding new translations and maintaining existing ones is straightforward

#### Acceptance Criteria

1. WHEN adding a new translatable string THEN developers SHALL use a type-safe translation key system with TypeScript types
2. WHEN building the project THEN PR Insights Labeler SHALL run `scripts/generate-i18n-types.ts` to generate type definitions from translation JSON files
3. WHEN a translation key is used in code THEN TypeScript SHALL provide compile-time validation of the key existence and namespace
4. WHEN adding translations THEN developers SHALL organize them by namespace (`summary`, `errors`, `labels`, `logs`, `common`) in `src/locales/{lang}/{namespace}.json`
5. WHERE translations are stored THE system SHALL use JSON format for easy editing and validation
6. WHEN running CI tests THEN PR Insights Labeler SHALL validate that all translation keys have entries in all supported languages
7. WHEN a translation key is missing in any language THEN the test suite SHALL fail with a clear error message indicating the missing key and language
8. IF new language support is added THEN the system SHALL require minimal code changes (only adding new translation JSON files)
9. WHERE translation keys are referenced THE PR Insights Labeler SHALL provide editor auto-completion for translation keys and namespaces

## Technical Constraints

### Integration Points

- **report-formatter.ts**: メインのレポート生成モジュール、全メッセージの翻訳が必要
- **actions-io.ts**: GitHub Actions Summary出力、タイトルと説明の翻訳が必要
- **comment-manager.ts**: PRコメント生成、コメントテンプレートの翻訳が必要
- **label-decision-engine.ts**: ラベル判定ロジック、ラベル説明の翻訳が必要
- **errors/**: エラーメッセージの翻訳が必要

### Technology Stack

**i18nライブラリ**: i18next

- バージョン: 23.x 以上
- 依存関係: i18next のみ（react-i18next等のフレームワーク拡張は不要）
- バンドルサイズ: 約10KB (gzip後)

**ディレクトリ構成**:

```
src/
├── locales/
│   ├── en/
│   │   ├── summary.json
│   │   ├── errors.json
│   │   ├── labels.json
│   │   ├── logs.json
│   │   └── common.json
│   └── ja/
│       ├── summary.json
│       ├── errors.json
│       ├── labels.json
│       ├── logs.json
│       └── common.json
├── types/
│   └── i18n.ts           # 自動生成される型定義
└── i18n.ts               # i18next初期化コード
```

**型安全性の実現**:

- 型生成スクリプト: `scripts/generate-i18n-types.ts`
- 生成される型: `TranslationKeys`, `Namespace`, `LocaleKey`
- i18next型拡張: `declare module 'i18next'` で型安全なキーアクセス

**ビルドプロセス統合**:

- `pnpm build`: 型生成 → TypeScriptコンパイル → nccバンドル
- `pnpm dev`: 型生成 + watch mode
- `pnpm test`: 型生成 + 翻訳キー整合性チェック + テスト実行

### Non-Functional Requirements

**パフォーマンス**:

- 翻訳リソースの読み込みは起動時に1回のみ
- 選択言語 + 英語フォールバックのみロード（全言語の一括ロードは行わない）
- i18next初期化は同期的に実行（非同期初期化は不要）

**バンドルサイズ**:

- 翻訳リソース追加による dist/ サイズ増加は50KB以内
- i18next本体: 約10KB (gzip後)
- 翻訳JSON (en + ja): 約20-30KB想定
- 合計増加: 約30-40KB

**エラーハンドリング**:

- 翻訳失敗時も必ず英語フォールバックで動作継続
- フォールバック発生時は warning レベルでログ記録
- ユーザー向けエラーメッセージと技術詳細を分離

**互換性**:

- Node.js 20以上
- TypeScript 5.9以上
- GitHub Actions環境での動作保証

## Testing Strategy

多言語対応機能の品質を保証するため、以下のテスト戦略を採用します。

### 1. 翻訳キー整合性テスト

**目的**: すべての翻訳キーが全言語で定義されていることを保証

**実装方針**:

```typescript
// __tests__/i18n-integrity.test.ts
describe('Translation Integrity', () => {
  it('すべてのキーが全言語で定義されている', () => {
    const languages = ['en', 'ja'];
    const namespaces = ['summary', 'errors', 'labels', 'logs', 'common'];

    // 英語をマスターとして、他言語との差分をチェック
    // 欠落キーがあれば明確なエラーメッセージで失敗
  });
});
```

**CI統合**: `pnpm test` で自動実行

### 2. スナップショットテスト

**目的**: 各言語での出力結果を検証し、回帰を防ぐ

**対象**:

- GitHub Actions Summary の全セクション
- PRコメントの全パターン
- エラーメッセージ
- ログメッセージ

**実装方針**:

```typescript
// __tests__/i18n-snapshot.test.ts
describe.each(['en', 'ja'])('Snapshot Tests (%s)', (lang) => {
  beforeEach(() => {
    i18n.changeLanguage(lang);
  });

  it('Summary出力のスナップショット', () => {
    const summary = formatSummary(mockMetrics);
    expect(summary).toMatchSnapshot(`summary-${lang}`);
  });

  it('PRコメントのスナップショット', () => {
    const comment = formatComment(mockViolations);
    expect(comment).toMatchSnapshot(`comment-${lang}`);
  });
});
```

### 3. フォールバックテスト

**目的**: 翻訳失敗時の英語フォールバックが正常に動作することを保証

**テストケース**:

- 存在しない翻訳キーの参照
- 翻訳ファイルの読み込み失敗
- 不正な言語コードの指定
- 言語決定の優先順位

**実装例**:

```typescript
describe('Fallback Behavior', () => {
  it('存在しないキーは英語にフォールバック', () => {
    i18n.changeLanguage('ja');
    const result = i18n.t('nonexistent.key');
    expect(result).toBe('Fallback English text');
  });

  it('不正な言語コードは英語にフォールバック', () => {
    const lang = determineLanguage('invalid-lang', config);
    expect(lang).toBe('en');
  });
});
```

### 4. 回帰テスト

**目的**: 既存の英語環境で動作に変更がないことを保証

**実装方針**:

- 既存のテストスイートをすべて実行
- 言語設定なし（デフォルト英語）で全テスト通過
- 出力メッセージの内容が既存と同等

### 5. ロケール表記テスト

**目的**: 数値とファイルサイズのフォーマットが正しいことを保証

**テストケース**:

```typescript
describe('Locale Formatting', () => {
  it('数値フォーマット（英語）', () => {
    i18n.changeLanguage('en');
    expect(formatNumber(1000)).toBe('1,000');
  });

  it('数値フォーマット（日本語）', () => {
    i18n.changeLanguage('ja');
    expect(formatNumber(1000)).toBe('1,000');
  });

  it('ファイルサイズフォーマット', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });
});
```

### 6. 統合テスト

**目的**: エンドツーエンドで多言語対応が機能することを保証

**シナリオ**:

1. 環境変数で言語を指定 → すべての出力が指定言語
2. 設定ファイルで言語を指定 → すべての出力が指定言語
3. 言語未指定 → すべての出力が英語
4. カスタム翻訳の上書き → Summary/コメントに反映

### テストカバレッジ目標

- 全体カバレッジ: 90%以上を維持（既存水準を保持）
- i18n関連モジュール: 95%以上
- 翻訳キー整合性: 100%（すべてのキーをチェック）

## Out of Scope (Phase 1)

以下は初期実装では対象外とし、将来的な拡張として検討：

1. **ドキュメントの多言語化**: README.md、docs/の日本語版作成
2. **追加言語サポート**: 中国語、韓国語等の他言語
3. **動的言語切り替え**: 実行中の言語変更（再起動が必要）
4. **複数形対応**: 英語の単数形/複数形の自動切り替え（"1 file" vs "2 files"）
5. **日付/時刻のロケール対応**: 現在はISO 8601形式のみ

これらは Phase 2 以降で検討します。

## Success Criteria

- すべてのGitHub Actions Summary出力が英語・日本語で表示可能
- すべてのエラーメッセージが翻訳されている
- 既存の英語環境で動作に変更がない
- 日本語環境での動作が完全に機能する
- テストカバレッジが90%以上を維持
- 翻訳リソースの追加が開発者にとって直感的

## References

- **GitHub Issue**: #18 多言語対応
- **Steering Documents**:
  - `.kiro/steering/structure.md` - プロジェクト構造
  - `.kiro/steering/tech.md` - 技術スタック
  - `.kiro/steering/product.md` - プロダクト概要
