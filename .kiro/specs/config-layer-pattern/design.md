# Design Document: Configuration Layer Pattern

## 1. Overview

### 1.1 Design Goals

Configuration Layer Pattern は、PR Insights Labeler の設定管理を統一し、以下の目標を達成します：

1. **明確な優先順位**: action input > pr-labeler.yml > 環境変数 > デフォルト値
2. **疎結合化**: 各関数は必要なパラメータのみを受け取る（例: `initializeI18n(language)` not `initializeI18n(config)`）
3. **Environment Layer**: `process.env` へのアクセスを一箇所に集約
4. **テスト容易性**: 依存注入により全てのレイヤーが独立してテスト可能
5. **型安全性**: TypeScript strict mode で nullable 型を活用

### 1.2 Key Principles

- **Single Source of Truth**: `CompleteConfig` が全ての設定値の信頼できる唯一の情報源
- **Dependency Injection**: 大きなオブジェクトではなく、必要な値のみを渡す
- **Railway-Oriented Programming**: `Result<T, E>` パターンでエラーハンドリング
- **Explicit over Implicit**: デフォルト値は最後のステップで明示的に適用

## 2. Current Architecture (問題点)

### 2.1 Current Problems

```
┌─────────────────────────────────────────────────┐
│  現在の問題                                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. action.yml に default: "en" が設定されている  │
│     → core.getInput('language') は常に値を返す    │
│     → 環境変数 LANGUAGE=ja が無視される           │
│                                                 │
│  2. process.env が各所で直接参照されている         │
│     - src/i18n.ts: determineLanguage()          │
│     - src/actions-io.ts: getEnvVar()            │
│     → テストが困難、依存関係が不明確              │
│                                                 │
│  3. Config と LabelerConfig が分離されている      │
│     → 優先順位が不明確                           │
│     → マージロジックが index.ts に散在            │
│                                                 │
│  4. 関数が Config オブジェクト全体を受け取る       │
│     → 不要な依存、テストが複雑化                  │
│                                                 │
│  5. mapActionInputsToConfig() が130行の複雑な処理 │
│     → JSON パース、単調性検証、型変換              │
│     → 設計書で廃止すると明記するが、代替案未定義  │
│     → 生文字列が CompleteConfig に渡る危険性      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2.2 Current Data Flow

```
action.yml (default: "en")
    ↓
core.getInput('language')  ← 常に 'en' を返す
    ↓
mapActionInputsToConfig()
    ↓
Config { language: 'en' }  ← 常に値あり
    ↓
determineLanguage(config)
    ↓
if (process.env['LANGUAGE']) { ... }  ← 到達不能！
if (config.language) { ... }          ← 常に true
```

## 3. Target Architecture

### 3.1 Three-Layer Pattern

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Environment Layer                              │
│  - loadEnvironmentConfig(): EnvironmentConfig            │
│  - process.env への唯一のアクセスポイント                   │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  Layer 2: Config Builder Layer                           │
│  - buildCompleteConfig(): CompleteConfig                 │
│  - 優先順位解決: input > config file > env > default      │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  Layer 3: Application Layer                              │
│  - initializeI18n(language: LanguageCode)                │
│  - 各関数は必要なパラメータのみを受け取る                    │
└──────────────────────────────────────────────────────────┘
```

### 3.2 New Data Flow

```
┌──────────────────┐
│ action.yml       │
│ (default 削除)    │
└────────┬─────────┘
         ↓
    core.getInput('language')
         ↓ ''
┌──────────────────────────────┐
│ parseActionInputs()          │
│ - JSON パース                 │
│ - 型変換（string→boolean/number）│
│ - バリデーション（単調性検証） │
│ Result<ParsedInputs, Error>  │
└────────┬─────────────────────┘
         ↓
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ ParsedInputs     │    │ LabelerConfig    │    │ EnvironmentConfig│
│ language: undef  │    │ language: 'ja'   │    │ language: 'ja'   │
│ (型安全)          │    │                  │    │                  │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 ↓
                    ┌────────────────────────────┐
                    │ buildCompleteConfig()      │
                    │                            │
                    │ 優先順位解決:               │
                    │  1. parsedInputs.language  │
                    │     → undefined (スキップ)  │
                    │  2. labelerConfig.language │
                    │     → 'ja' → 正規化 → 'ja' ✓│
                    │  3. envConfig.language     │
                    │  4. デフォルト 'en'         │
                    └────────────┬───────────────┘
                                 ↓
                    ┌────────────────────────────┐
                    │ CompleteConfig             │
                    │ language: 'ja'             │
                    │ source: 'labeler-config'   │
                    └────────────┬───────────────┘
                                 ↓
                    ┌────────────────────────────┐
                    │ initializeI18n('ja')       │
                    │ PRコメント: 日本語 ✓        │
                    └────────────────────────────┘
```

## 4. Component Design

### 4.1 Input Parser (`src/input-parser.ts`)

**責務**: Action inputs の変換・バリデーション（参考: action-cache の `getInputs()`）

```typescript
/**
 * Action input parsing and validation
 * 参考: action-cache の getInputs() パターン
 */

import * as core from '@actions/core';
import { err, ok, Result } from 'neverthrow';
import type { ConfigurationError, ParseError } from './errors/index.js';

// ============================================================================
// Parsed Inputs Interface (型安全)
// ============================================================================

export interface ParsedInputs {
  // 言語設定（nullable: action.yml の default 削除により）
  language: string | undefined;

  // GitHub token (required)
  githubToken: string;

  // ファイル制限（number 型）
  fileSizeLimit: number;
  fileLinesLimit: number;
  prAdditionsLimit: number;
  prFilesLimit: number;

  // PR Insights Labeler - 有効化フラグ（boolean 型）
  sizeEnabled: boolean;
  complexityEnabled: boolean;
  categoryEnabled: boolean;
  riskEnabled: boolean;

  // PR Insights Labeler - 閾値（型安全なオブジェクト）
  sizeThresholdsV2: SizeThresholds;
  complexityThresholdsV2: ComplexityThresholds;

  // その他のフィールド
  autoRemoveLabels: boolean;
  skipDraftPr: boolean;
  commentOnPr: CommentMode;
  // ... 他のフィールド
}

// ============================================================================
// Parse Action Inputs
// ============================================================================

/**
 * Parse and validate all action inputs
 * 既存の mapActionInputsToConfig() のロジックを100%保持
 *
 * 参考: action-cache の getInputs()
 */
export function parseActionInputs(): Result<ParsedInputs, ConfigurationError | ParseError> {
  // Language (nullable: action.yml の default 削除により undefined 可能)
  const rawLanguage = core.getInput('language');
  const language = rawLanguage || undefined;  // 空文字列 → undefined

  // GitHub Token (required)
  const githubToken = core.getInput('github_token');
  if (!githubToken) {
    return err(createConfigurationError('github_token', undefined, 'GitHub token is required'));
  }

  // File size limit (parse "100KB" → 102400)
  const fileSizeLimitResult = parseSize(core.getInput('file_size_limit') || '100KB');
  if (fileSizeLimitResult.isErr()) {
    return err(fileSizeLimitResult.error);
  }

  // Boolean flags (strict validation)
  const sizeEnabledResult = parseBooleanStrict(core.getInput('size_enabled') || 'true');
  if (sizeEnabledResult.isErr()) {
    return err(sizeEnabledResult.error);
  }

  // Size thresholds (JSON parse + monotonicity validation)
  const sizeThresholdsResult = parseSizeThresholdsV2(
    core.getInput('size_thresholds') || '{"small": 100, "medium": 500, "large": 1000}'
  );
  if (sizeThresholdsResult.isErr()) {
    return err(sizeThresholdsResult.error);
  }

  // ... 他のフィールドも同様にパース（既存ロジックを100%保持）

  return ok({
    language,
    githubToken,
    fileSizeLimit: fileSizeLimitResult.value,
    sizeEnabled: sizeEnabledResult.value,
    sizeThresholdsV2: sizeThresholdsResult.value,
    // ... 他のフィールド
  });
}
```

**設計ポイント**:

- 空文字列 → `undefined` 変換（`rawLanguage || undefined`）
- Result<T, E> によるエラーハンドリング
- 既存の `mapActionInputsToConfig()` ロジックを100%保持（約130行）
- JSON パース + 単調性検証（small < medium < large）
- Strict boolean validation（"true" または "false" のみ）

### 4.2 Environment Loader (`src/environment-loader.ts`)

**責務**: 環境変数への唯一のアクセスポイント

```typescript
/**
 * 環境変数から設定を読み込む
 * process.env への唯一のアクセスポイント
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  return {
    language: process.env['LANGUAGE'] || process.env['LANG'] || undefined,
    githubToken: process.env['GITHUB_TOKEN'] || process.env['GH_TOKEN'] || undefined,
  };
}

export interface EnvironmentConfig {
  language: string | undefined;
  githubToken: string | undefined;
}
```

**設計ポイント**:

- `process.env` への直接アクセスはこのモジュールのみ
- `undefined` を返すことで「未設定」を表現
- 優先順位（LANGUAGE > LANG）はここで解決

### 4.3 Config Builder (`src/config-builder.ts`)

**責務**: 全ての設定ソースを統合し、優先順位に従って CompleteConfig を構築（参考: action-cache の `createClientConfig()`）

```typescript
/**
 * 全ての設定ソースを統合し、CompleteConfig を構築
 *
 * 優先順位:
 *   1. parsedInputs (action input - パース・バリデーション済み)
 *   2. labelerConfig (pr-labeler.yml)
 *   3. envConfig (環境変数)
 *   4. デフォルト値
 *
 * 参考: action-cache の createClientConfig()
 */
export function buildCompleteConfig(
  parsedInputs: ParsedInputs,     // P0修正: パース済みの型安全なデータ
  labelerConfig: LabelerConfig,
  envConfig: EnvironmentConfig,
): CompleteConfig {
  // 言語設定の優先順位解決
  const language = resolveLanguage(
    parsedInputs.language,
    labelerConfig.language,
    envConfig.language,
  );

  // デバッグログ出力
  logDebug('[Config Builder] Configuration sources:');
  logDebug(`  - Action input language: ${parsedInputs.language ?? 'undefined'}`);
  logDebug(`  - Labeler config language: ${labelerConfig.language ?? 'undefined'}`);
  logDebug(`  - Environment language: ${envConfig.language ?? 'undefined'}`);
  logDebug(`  - Resolved language: ${language.value} (source: ${language.source})`);

  return {
    // 言語設定
    language: language.value,

    // ParsedInputs から型安全に取得（P0修正: 既にパース済み）
    sizeEnabled: parsedInputs.sizeEnabled,
    sizeThresholdsV2: parsedInputs.sizeThresholdsV2,
    complexityEnabled: parsedInputs.complexityEnabled,
    complexityThresholdsV2: parsedInputs.complexityThresholdsV2,
    categoryEnabled: parsedInputs.categoryEnabled,
    riskEnabled: parsedInputs.riskEnabled,
    // ... 他のフィールド
  };
}

/**
 * 言語設定の優先順位解決
 * P1修正: 全ソースに normalizeLanguageCode() を適用
 *
 * @param configFile - pr-labeler.yml の language 設定（ロケール形式 'ja-JP' も許容）
 */
function resolveLanguage(
  actionInput: string | undefined,
  configFile: string | undefined,
  env: string | undefined,
): { value: LanguageCode; source: ConfigSource } {
  // 優先度1: action input
  if (actionInput !== undefined) {
    return {
      value: normalizeLanguageCode(actionInput),  // 正規化
      source: 'action-input',
    };
  }

  // 優先度2: pr-labeler.yml
  if (configFile !== undefined) {
    return {
      value: normalizeLanguageCode(configFile),  // P1修正: 正規化追加
      source: 'labeler-config',
    };
  }

  // 優先度3: 環境変数
  if (env !== undefined) {
    return {
      value: normalizeLanguageCode(env),  // 正規化
      source: 'environment',
    };
  }

  // 優先度4: デフォルト値
  return {
    value: 'en',
    source: 'default',
  };
}

type ConfigSource = 'action-input' | 'labeler-config' | 'environment' | 'default';

export interface CompleteConfig {
  // 言語設定
  language: LanguageCode;

  // 既存の Config インターフェースの全フィールド
  // (src/input-mapper.ts の Config interface を継承)
  sizeEnabled: boolean;
  sizeThresholdsV2: SizeThresholds;
  complexityEnabled: boolean;
  complexityThresholdsV2: ComplexityThresholds;
  categoryEnabled: boolean;
  riskEnabled: boolean;
  // ... 他のフィールド
}
```

**設計ポイント**:

- `undefined` チェックで優先順位を明確化
- デバッグログで各ソースの値と最終決定値を出力
- `ConfigSource` で設定値の由来を追跡可能

### 4.4 i18n Module (`src/i18n.ts` 修正)

**変更点**: 関数シグネチャの疎結合化

```typescript
// Before
export function initializeI18n(config: Config): Result<void, ConfigurationError> {
  const language = determineLanguage(config);
  // ...
}

function determineLanguage(config: Config): LanguageCode {
  // process.env を直接参照
  const languageEnv = process.env['LANGUAGE'];
  if (languageEnv) { ... }

  if (config.language) { ... }  // 常に true（バグ）
}

// After
export function initializeI18n(language: LanguageCode): Result<void, ConfigurationError> {
  logDebug(`[i18n] Initializing with language: ${language}`);

  const result = i18next.init({
    lng: language,
    resources: {
      en: { translation: en },
      ja: { translation: ja },
    },
    fallbackLng: 'en',
  });

  // ...
}

// determineLanguage() は削除
// → buildCompleteConfig() の resolveLanguage() に統合
```

**設計ポイント**:

- `Config` オブジェクト全体ではなく `LanguageCode` のみを受け取る
- 環境変数の参照を削除（Environment Layer に集約）
- `determineLanguage()` を削除し、Config Builder に統合

### 4.5 Main Entry Point (`src/index.ts` 修正)

**変更点**: 新しい設定フローの採用（参考: action-cache の `createActionContext()`）

```typescript
// Before (lines 48-82)
async function run(): Promise<void> {
  try {
    const inputs = getActionInputs();
    const tokenResult = getGitHubToken();
    const token = tokenResult.value;
    const prContext = getPullRequestContext();

    const configResult = mapActionInputsToConfig(inputs);
    const config = configResult.value;

    const i18nResult = initializeI18n(config);  // ← Config 全体を渡す
    // ...
  }
}

// After
async function run(): Promise<void> {
  try {
    // Step 1: Parse action inputs (Result<T,E>)
    logInfoI18n('initialization.gettingInputs');
    const parsedInputsResult = parseActionInputs();
    if (parsedInputsResult.isErr()) {
      throw parsedInputsResult.error;  // パースエラー → 即座に失敗
    }
    const parsedInputs = parsedInputsResult.value;

    // Step 2: Get GitHub token (ParsedInputs から取得)
    const token = parsedInputs.githubToken;

    // Step 3: Get PR context
    const prContext = getPullRequestContext();

    logInfoI18n('initialization.analyzingPr', {
      prNumber: prContext.pullNumber,
      owner: prContext.owner,
      repo: prContext.repo,
    });

    // Step 4: Load environment config
    const envConfig = loadEnvironmentConfig();

    // Step 5: Load labeler config (pr-labeler.yml)
    logInfoI18n('labels.loading');
    const labelerConfigResult = await loadConfig(token, prContext.owner, prContext.repo, prContext.headSha);
    const labelerConfig = labelerConfigResult.unwrapOr(getDefaultLabelerConfig());

    // Step 6: Build complete config (優先順位解決)
    const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

    // Step 7: Initialize i18n (言語コードのみ)
    const i18nResult = initializeI18n(config.language);
    if (i18nResult.isErr()) {
      logWarningI18n('initialization.i18nFailed', { message: i18nResult.error.message });
    }

    // ... 以降の処理（変更なし）
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logErrorI18n('completion.failed', { message: errorMessage });
    setFailed(errorMessage);
  }
}
```

**設計ポイント**:

- `parseActionInputs()` で型安全なパース（Result<T,E>）
- パースエラー時は即座に失敗（早期リターン）
- Environment config → labeler config → 統合の順序
- `initializeI18n()` には言語コードのみを渡す

## 5. Interface Definitions

### 5.1 EnvironmentConfig

```typescript
/**
 * 環境変数から読み込まれた設定
 * loadEnvironmentConfig() の戻り値
 */
export interface EnvironmentConfig {
  /** LANGUAGE または LANG 環境変数 */
  language: string | undefined;

  /** GITHUB_TOKEN または GH_TOKEN 環境変数 */
  githubToken: string | undefined;
}
```

### 5.2 ParsedInputs

```typescript
/**
 * パース・バリデーション済みの action inputs
 * parseActionInputs() の戻り値
 */
export interface ParsedInputs {
  /** language input (未設定の場合は undefined) */
  language: string | undefined;

  /** GitHub token (required) */
  githubToken: string;

  /** ファイル制限（number 型） */
  fileSizeLimit: number;
  fileLinesLimit: number;
  prAdditionsLimit: number;
  prFilesLimit: number;

  /** PR Insights Labeler - 有効化フラグ（boolean 型） */
  sizeEnabled: boolean;
  complexityEnabled: boolean;
  categoryEnabled: boolean;
  riskEnabled: boolean;

  /** PR Insights Labeler - 閾値（型安全なオブジェクト） */
  sizeThresholdsV2: SizeThresholds;
  complexityThresholdsV2: ComplexityThresholds;

  // ... 他のフィールド
}
```

### 5.3 CompleteConfig (新規)

```typescript
/**
 * 全ての設定ソースを統合した完全な設定
 * buildCompleteConfig() の戻り値
 */
export interface CompleteConfig {
  /** 決定された言語コード */
  language: LanguageCode;

  // 既存の Config インターフェースの全フィールドを含む
  sizeEnabled: boolean;
  sizeThresholdsV2: SizeThresholds;
  complexityEnabled: boolean;
  complexityThresholdsV2: ComplexityThresholds;
  categoryEnabled: boolean;
  riskEnabled: boolean;
  // ... 他のフィールド
}

export type LanguageCode = 'en' | 'ja';
```

### 5.4 LabelerConfig の型変更

**重要**: `LabelerConfig.language` の型を変更し、ロケール形式を許容します。

```typescript
// Before (src/labeler-types.ts)
export interface LabelerConfig {
  language?: 'en' | 'ja';  // 厳密すぎる型定義
  // ...
}

// After
export interface LabelerConfig {
  language?: string;  // ロケール形式 'ja-JP', 'en-US' も許容
  // ...
}
```

**理由**:

- pr-labeler.yml では `language: ja-JP` のようなロケール表記を許容すべき
- `normalizeLanguageCode()` で最終的に `LanguageCode` ('en' | 'ja') に収束
- コンパイル時に型エラーを防ぎ、正規化フローを実証可能にする

**データフロー**:

```
pr-labeler.yml: language: 'ja-JP'
    ↓
LabelerConfig.language: string ('ja-JP')
    ↓
resolveLanguage(configFile: string | undefined)
    ↓
normalizeLanguageCode('ja-JP')
    ↓
LanguageCode: 'ja'
```

## 6. Priority Resolution Flow

### 6.1 Language Priority

```
┌─────────────────────────────────────────────────────┐
│ Language Priority Resolution                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. parsedInputs.language                           │
│     ├─ undefined  → 次へ                            │
│     └─ 値あり     → 正規化 → 採用 (action-input)    │
│                                                     │
│  2. labelerConfig.language                          │
│     ├─ undefined  → 次へ                            │
│     └─ 値あり     → 正規化 → 採用 (labeler-config)  │
│                                                     │
│  3. envConfig.language                              │
│     ├─ undefined  → 次へ                            │
│     └─ 値あり     → 正規化 → 採用 (environment)     │
│                                                     │
│  4. デフォルト値: 'en'                               │
│     └─ 採用 (source: 'default')                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.2 Test Cases

| Action Input | Labeler Config | Environment | Expected | Source |
| ------------ | -------------- | ----------- | -------- | ------------------------------ |
| `undefined` | `undefined` | `undefined` | `'en'` | default |
| `undefined` | `undefined` | `'ja'` | `'ja'` | environment |
| `undefined` | `'ja'` | `'en'` | `'ja'` | labeler-config |
| `'en'` | `'ja'` | `'ja'` | `'en'` | action-input |
| `'ja-JP'` | `'en'` | `'en'` | `'ja'` | action-input (normalized) |
| `'fr'` | `'en'` | `'en'` | `'en'` | action-input (normalized/warn) |

## 7. Migration Strategy

### 7.1 Phase 1: 新しいモジュール追加

1. `src/input-parser.ts` を作成
   - `parseActionInputs()` 実装
   - 既存の `mapActionInputsToConfig()` ロジックを移植（約130行）
2. `src/config-builder.ts` を作成
   - `buildCompleteConfig()` 実装
   - `resolveLanguage()` 実装（P1修正含む）
3. `src/environment-loader.ts` を作成
   - `loadEnvironmentConfig()` 実装
4. テストファイルを作成:
   - `__tests__/input-parser.test.ts`
   - `__tests__/config-builder.test.ts`
   - `__tests__/environment-loader.test.ts`

### 7.2 Phase 2: 既存モジュール修正

1. `action.yml` から `language` input の `default: "en"` を削除
2. `src/labeler-types.ts` の `LabelerConfig.language` を `string | undefined` に変更
3. `src/i18n.ts` の `initializeI18n()` シグネチャ変更（`language: LanguageCode` のみ）
4. `src/i18n.ts` から `determineLanguage()` を削除

### 7.3 Phase 3: メイン処理の統合

1. `src/index.ts` で新しい設定フローを採用
2. `src/input-mapper.ts` から `mapActionInputsToConfig()` を削除（`parseActionInputs()` に移行済み）
3. `Config` インターフェースを `CompleteConfig` に統合

### 7.4 Phase 4: テスト更新

1. `__tests__/i18n.test.ts` を更新
2. `__tests__/index.test.ts` を更新
3. 優先順位解決のテストを追加

## 8. Testing Strategy

### 8.1 Unit Tests

#### 8.1.1 Input Parser

```typescript
describe('parseActionInputs', () => {
  it('should parse all inputs successfully', () => {
    // core.getInput() をモック
    const result = parseActionInputs();
    expect(result.isOk()).toBe(true);
    expect(result.value.language).toBeUndefined();  // default 削除により
  });

  it('should return error for invalid size thresholds', () => {
    // core.getInput('size_thresholds') = '{"small": 1000, "medium": 500}'
    const result = parseActionInputs();
    expect(result.isErr()).toBe(true);
    expect(result.error.message).toContain('monotonicity');
  });

  it('should convert empty string to undefined', () => {
    // core.getInput('language') = ''
    const result = parseActionInputs();
    expect(result.isOk()).toBe(true);
    expect(result.value.language).toBeUndefined();
  });
});
```

#### 8.1.2 Environment Loader

```typescript
describe('loadEnvironmentConfig', () => {
  it('should load LANGUAGE environment variable', () => {
    process.env['LANGUAGE'] = 'ja';
    const config = loadEnvironmentConfig();
    expect(config.language).toBe('ja');
  });

  it('should prioritize LANGUAGE over LANG', () => {
    process.env['LANGUAGE'] = 'ja';
    process.env['LANG'] = 'en';
    const config = loadEnvironmentConfig();
    expect(config.language).toBe('ja');
  });

  it('should return undefined if no env vars are set', () => {
    delete process.env['LANGUAGE'];
    delete process.env['LANG'];
    const config = loadEnvironmentConfig();
    expect(config.language).toBeUndefined();
  });
});
```

#### 8.1.3 Config Builder

```typescript
describe('buildCompleteConfig', () => {
  it('should prioritize action input over labeler config', () => {
    const config = buildCompleteConfig(
      { language: 'en', /* ... */ },
      { language: 'ja', /* ... */ },
      { language: undefined },
    );
    expect(config.language).toBe('en');
  });

  it('should use labeler config if action input is undefined', () => {
    const config = buildCompleteConfig(
      { language: undefined, /* ... */ },
      { language: 'ja', /* ... */ },
      { language: 'en' },
    );
    expect(config.language).toBe('ja');
  });

  it('should use environment if both inputs are undefined', () => {
    const config = buildCompleteConfig(
      { language: undefined, /* ... */ },
      { language: undefined, /* ... */ },
      { language: 'ja' },
    );
    expect(config.language).toBe('ja');
  });

  it('should use default if all sources are undefined', () => {
    const config = buildCompleteConfig(
      { language: undefined, /* ... */ },
      { language: undefined, /* ... */ },
      { language: undefined },
    );
    expect(config.language).toBe('en');
  });

  it('should normalize language codes from all sources (P1)', () => {
    const config = buildCompleteConfig(
      { language: undefined, /* ... */ },
      { language: 'ja-JP', /* ... */ },  // P1修正対象
      { language: undefined },
    );
    expect(config.language).toBe('ja');  // 'ja-JP' → 'ja' に正規化
  });
});
```

#### 8.1.4 i18n Module

```typescript
describe('initializeI18n', () => {
  it('should initialize with English', () => {
    const result = initializeI18n('en');
    expect(result.isOk()).toBe(true);
    expect(t('logs', 'initialization.gettingInputs')).toBeTruthy();
  });

  it('should initialize with Japanese', () => {
    const result = initializeI18n('ja');
    expect(result.isOk()).toBe(true);
    expect(t('logs', 'initialization.gettingInputs')).toContain('入力');
  });
});
```

### 8.2 Integration Tests

```typescript
describe('Configuration Integration', () => {
  it('should respect priority chain: action input > labeler config > env', async () => {
    // Setup environment
    process.env['LANGUAGE'] = 'en';

    // Setup action inputs
    const inputs: ActionInputs = {
      language: undefined,  // 未設定
      /* ... */
    };

    // Setup labeler config
    const labelerConfig: LabelerConfig = {
      language: 'ja',  // 日本語設定
      /* ... */
    };

    // Load environment
    const envConfig = loadEnvironmentConfig();

    // Build complete config
    const config = buildCompleteConfig(inputs, labelerConfig, envConfig);

    // Assert: labeler config が優先される
    expect(config.language).toBe('ja');
  });
});
```

### 8.3 Coverage Goals

- **Overall**: 93%以上を維持
- **New Modules**: 100%カバレッジ
  - `input-parser.ts`: 100%
  - `config-builder.ts`: 100%
  - `environment-loader.ts`: 100%

## 9. Rollout Plan

### 9.1 Step-by-Step Implementation

1. **Week 1**: 新しいモジュールの作成とテスト
   - `input-parser.ts` + tests（既存ロジック移植）
   - `config-builder.ts` + tests
   - `environment-loader.ts` + tests

2. **Week 2**: 既存モジュールの修正
   - `action.yml` 修正（language default 削除）
   - `i18n.ts` 修正（シグネチャ変更、determineLanguage 削除）

3. **Week 3**: 統合とテスト
   - `index.ts` 統合
   - 既存テストの更新
   - 統合テストの追加

4. **Week 4**: レビューと修正
   - コードレビュー
   - バグフィックス
   - ドキュメント更新

### 9.2 Success Criteria

- ✅ 全てのテストが成功する
- ✅ テストカバレッジ93%以上を維持
- ✅ `pnpm type-check` がエラーなしで完了
- ✅ `pnpm lint` がエラーなしで完了
- ✅ `pnpm build` が成功する
- ✅ 言語設定バグが修正される（LANGUAGE=ja が正しく動作）

## 10. Risk Analysis

### 10.1 Technical Risks

| Risk | Impact | Mitigation |
| ------------------ | ------ | ----------------------------------------- |
| テストの破壊 | High | 段階的な移行、既存テストを先に更新 |
| 型エラー | Medium | strict mode でコンパイル、段階的な修正 |
| パフォーマンス低下 | Low | 設定構築は1回のみ、オーバーヘッド無視可能 |

### 10.2 Integration Risks

| Risk | Impact | Mitigation |
| ---------------------- | ------ | ------------------------------- |
| LabelerConfig との統合 | Medium | 既存の loadConfig() を再利用 |
| 既存機能への影響 | Low | CompleteConfig は Config の拡張 |

## 11. Open Questions

1. **Q**: `mapActionInputsToConfig()` は完全に削除すべきか？
   **A**: `parseActionInputs()` として `input-parser.ts` に移行。既存の検証ロジック（約130行）を100%保持。

2. **Q**: `Config` インターフェースは残すべきか？
   **A**: `CompleteConfig` に統合。型エイリアス `type Config = CompleteConfig` で互換性維持も可能。

3. **Q**: デバッグログはどこまで出力すべきか？
   **A**: 設定の由来（source）と各ソースの値をデバッグログで出力。

## 12. Appendix

### 12.1 Related Files

- `src/input-mapper.ts` - ActionInputs, Config
- `src/labeler-types.ts` - LabelerConfig
- `src/i18n.ts` - initializeI18n, determineLanguage
- `src/index.ts` - main entry point
- `src/actions-io.ts` - getEnvVar
- `action.yml` - action inputs definition

### 12.2 References

- Requirement 1: Environment Layer の導入
- Requirement 2: 統合Config構築
- Requirement 3: 言語決定ロジックの明確化
- Requirement 4: i18n初期化の疎結合化
- Requirement 9: action.yml の変更
- Requirement 10: Input Parser Layer の導入
