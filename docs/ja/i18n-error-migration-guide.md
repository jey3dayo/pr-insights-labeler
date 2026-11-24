# 🌐 エラーファクトリー i18n 移行ガイド

**対象**: 開発者
**タグ**: `category/development`, `audience/developer`

**言語**: English（準備中） | 日本語

## 概要

既存のエラーハンドリングコードを、多言語対応のエラーファクトリーへ移行するための手順書です。

## 目次

- [移行の基本フロー](#移行の基本フロー)
- [パターン別移行例](#パターン別移行例)
- [実践的なレシピ](#実践的なレシピ)
- [トラブルシューティング](#トラブルシューティング)
- [チェックリスト](#チェックリスト)

---

## 移行の基本フロー

### ステップ1: 現状調査

カスタムメッセージを直接渡している既存のエラーハンドリング箇所を洗い出します。

```bash
# カスタムメッセージを使用しているエラーを検索
grep -r "createConfigurationError.*'.*'" src/
grep -r "createGitHubAPIError.*'.*'" src/
grep -r "createFileSystemError.*'.*'" src/
```

### ステップ2: 翻訳リソースの確認

対象のエラーに対応する翻訳キーが登録されているか確認します。

```bash
# errors.json の確認
cat src/locales/en/errors.json | jq .
cat src/locales/ja/errors.json | jq .
```

### ステップ3: コードの移行

不要なカスタムメッセージを削除し、翻訳キーを使ってメッセージを生成する呼び出し方へ書き換えます。

### ステップ4: テストの実行

移行後のコードが英語・日本語の両環境で正しく動作することを確認します。

```bash
pnpm test __tests__/error-factories-i18n.test.ts
```

---

## パターン別移行例

### パターン1: シンプルなエラーメッセージ

#### 移行前

```typescript
// ハードコードされた英語メッセージ
throw createConfigurationError('language', code, 'Invalid language code');
```

#### 移行後

```typescript
// 翻訳キーを使用
throw createConfigurationError('language', code);
```

#### 出力の確認

```typescript
// 英語環境
// EN: "Invalid configuration field: language"

// 日本語環境
// JA: "設定フィールドが無効です: language"
```

---

### パターン2: 詳細情報を含むエラー

ユーザーへの具体的な修正案内など、詳細な情報を含む場合はカスタムメッセージをそのまま使用します。

#### 移行前

```typescript
throw createConfigurationError(
  'file_size_limit',
  '10KB 20MB',
  'Multiple units detected. Use single value like "10KB" or "20MB"'
);
```

#### 移行後

```typescript
// カスタムメッセージを継続使用（翻訳リソースに収まらない詳細情報）
throw createConfigurationError(
  'file_size_limit',
  '10KB 20MB',
  'Multiple units detected. Use single value like "10KB" or "20MB"'
);

// または、翻訳リソースに新しいキーを追加
// src/locales/en/errors.json
// {
//   "configuration": {
//     "multipleUnits": "Multiple units detected. Use single value like \"10KB\" or \"20MB\""
//   }
// }

// 移行後（翻訳キー使用）
throw createConfigurationError('file_size_limit', '10KB 20MB');
// ※ただし、この場合は詳細なガイダンスが失われるため、カスタムメッセージ継続を推奨
```

---

### パターン3: ファイルシステムエラー

#### 移行前

```typescript
throw createFileSystemError(path, undefined, 'Failed to read configuration file');
```

#### 移行後

```typescript
// 操作種別を明示
throw createFileSystemError(path, 'read');
// EN: "Failed to read file: /path/to/config.yml"
// JA: "ファイルの読み込みに失敗しました: /path/to/config.yml"
```

#### 操作種別の選び方

- `'read'` - ファイル読み込みエラー
- `'write'` - ファイル書き込みエラー
- `'notFound'` - ファイルが見つからないエラー
- `'permission'` - 権限エラー

---

### パターン4: GitHub API エラー

#### 移行前

```typescript
throw createGitHubAPIError('API request failed', 404);
```

#### 移行後

```typescript
// メッセージはAPIレスポンスから取得されるため、そのまま渡す
throw createGitHubAPIError(apiErrorMessage, status);
// EN: "GitHub API error: {apiErrorMessage}"
// JA: "GitHub APIエラー: {apiErrorMessage}"
```

**注意**: GitHub API から返るエラーメッセージ自体は英語のため、翻訳キーのテンプレートで囲んで出力します。

---

### パターン5: パースエラー

#### 移行前

```typescript
throw createParseError(input, 'Invalid size format');
```

#### 移行後

```typescript
// デフォルトの翻訳キーを使用
throw createParseError(input);
// EN: "Invalid format: {input}"
// JA: "無効な形式: {input}"

// または、特定のエラー用にカスタムメッセージ
throw createParseError(input, 'Invalid JSON for size thresholds');
```

---

## 実践的なレシピ

### レシピ1: 設定バリデーションエラーの移行

**シナリオ**: ユーザーが入力した設定値が不正な場合のエラーを移行します。

```typescript
// Before
function validateFileSize(input: string): Result<number, ConfigurationError> {
  if (!isValidFormat(input)) {
    return err(
      createConfigurationError('file_size_limit', input, 'Invalid file size format')
    );
  }
  // ...
}

// After
function validateFileSize(input: string): Result<number, ConfigurationError> {
  if (!isValidFormat(input)) {
    return err(createConfigurationError('file_size_limit', input));
  }
  // ...
}
```

#### テスト例

```typescript
describe('validateFileSize - i18n', () => {
  it('should return English error message', () => {
    initializeI18n({ language: 'en' } as Config);
    const result = validateFileSize('invalid');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Invalid configuration field');
      expect(result.error.message).toContain('file_size_limit');
    }
  });

  it('should return Japanese error message', () => {
    initializeI18n({ language: 'ja' } as Config);
    const result = validateFileSize('invalid');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('設定フィールドが無効です');
      expect(result.error.message).toContain('file_size_limit');
    }
  });
});
```

---

### レシピ2: ファイル読み込みエラーの移行

**シナリオ**: 設定ファイルの読み込みに失敗した場合のエラーを移行します。

```typescript
// Before
async function loadConfig(path: string): Promise<Result<Config, FileSystemError>> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return ok(parseConfig(content));
  } catch (error) {
    return err(createFileSystemError(path, undefined, 'Failed to read configuration file'));
  }
}

// After
async function loadConfig(path: string): Promise<Result<Config, FileSystemError>> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return ok(parseConfig(content));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return err(createFileSystemError(path, 'notFound'));
    }
    if (error.code === 'EACCES') {
      return err(createFileSystemError(path, 'permission'));
    }
    return err(createFileSystemError(path, 'read'));
  }
}
```

#### 改善点

1. 操作種別（`'read'`、`'notFound'`、`'permission'`）を明示しています
2. エラー種別に応じた翻訳メッセージが自動で選ばれます
3. カスタムメッセージを手書きする必要がなくなります

---

### レシピ3: GitHub API 呼び出しエラーの移行

**シナリオ**: GitHub API からエラーレスポンスが返った場合の処理を移行します。

```typescript
// Before
async function fetchPullRequest(
  owner: string,
  repo: string,
  prNumber: number
): Promise<Result<PullRequest, GitHubAPIError>> {
  try {
    const response = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
    return ok(response.data);
  } catch (error) {
    return err(
      createGitHubAPIError(
        'Failed to fetch pull request',
        error.status
      )
    );
  }
}

// After
async function fetchPullRequest(
  owner: string,
  repo: string,
  prNumber: number
): Promise<Result<PullRequest, GitHubAPIError>> {
  try {
    const response = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
    return ok(response.data);
  } catch (error) {
    // APIから返されたエラーメッセージをそのまま渡す
    const message = error.response?.data?.message || error.message;
    return err(createGitHubAPIError(message, error.status));
    // EN: "GitHub API error: {message}"
    // JA: "GitHub APIエラー: {message}"
  }
}
```

#### 改善点

1. GitHub API から返された原文のエラーメッセージをそのまま保持できます
2. 翻訳キーのプレフィックス（`"GitHub API error: "` / `"GitHub APIエラー: "`）を言語に応じて切り替えられます
3. HTTP ステータスコードなどの技術情報も失われません

---

### レシピ4: 複数エラーの集約

**シナリオ**: 複数の設定エラーをまとめて収集して報告する場合の移行例です。

```typescript
// Before
function validateConfig(input: RawConfig): Result<Config, ConfigurationError[]> {
  const errors: ConfigurationError[] = [];

  if (!isValidLanguage(input.language)) {
    errors.push(
      createConfigurationError('language', input.language, 'Invalid language code')
    );
  }

  if (!isValidFileSize(input.file_size_limit)) {
    errors.push(
      createConfigurationError('file_size_limit', input.file_size_limit, 'Invalid file size')
    );
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(input as Config);
}

// After
function validateConfig(input: RawConfig): Result<Config, ConfigurationError[]> {
  const errors: ConfigurationError[] = [];

  if (!isValidLanguage(input.language)) {
    errors.push(createConfigurationError('language', input.language));
    // EN: "Invalid configuration field: language"
    // JA: "設定フィールドが無効です: language"
  }

  if (!isValidFileSize(input.file_size_limit)) {
    errors.push(createConfigurationError('file_size_limit', input.file_size_limit));
    // EN: "Invalid configuration field: file_size_limit"
    // JA: "設定フィールドが無効です: file_size_limit"
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(input as Config);
}
```

#### エラー出力例

```typescript
const result = validateConfig(invalidInput);
if (result.isErr()) {
  result.error.forEach(error => {
    console.error(`[${error.type}] ${error.message}`);
  });
}

// 英語環境:
// [ConfigurationError] Invalid configuration field: language
// [ConfigurationError] Invalid configuration field: file_size_limit

// 日本語環境:
// [ConfigurationError] 設定フィールドが無効です: language
// [ConfigurationError] 設定フィールドが無効です: file_size_limit
```

---

### レシピ5: カスタムメッセージを残すべきケース

**シナリオ**: 複雑なバリデーションルールなど、詳しい修正案内を伝えたい場合の例です。

```typescript
// カスタムメッセージを継続使用（推奨）
function parseThresholds(input: string): Result<Thresholds, ParseError> {
  try {
    const parsed = JSON.parse(input);

    if (!hasRequiredKeys(parsed)) {
      return err(
        createParseError(
          input,
          'Missing required size thresholds (S, M, L). Each size must have "additions" and "files" fields.'
        )
      );
    }

    if (!isMonotonic(parsed)) {
      return err(
        createParseError(
          input,
          'Size thresholds must be monotonic (S ≤ M ≤ L for both additions and files)'
        )
      );
    }

    return ok(parsed);
  } catch (error) {
    // 一般的なJSONパースエラーは翻訳キーを使用
    return err(createParseError(input));
    // EN: "Invalid format: {input}"
    // JA: "無効な形式: {input}"
  }
}
```

#### 使い分けの目安

- **翻訳キーを使う場合**: 一般的なエラー（`"Invalid format"`、`"File not found"` など）
- **カスタムメッセージを使う場合**: 詳細な修正ガイドや複雑なバリデーションルールを伝える必要があるエラー

---

## トラブルシューティング

### 問題1: 翻訳されたメッセージが表示されない

**原因**: i18n が初期化されていません。

#### 解決策

```typescript
// エントリーポイント（src/index.ts）で初期化を確認
import { initializeI18n } from './i18n.js';
import { mapInputs } from './input-mapper.js';

const config = mapInputs();
initializeI18n(config);  // 必須
```

---

### 問題2: 型エラー `"Property 'xxx' does not exist"` が発生する

**原因**: 翻訳リソースに新しいキーを追加したあと、型定義が再生成されていません。

#### 解決策

```bash
# 型定義の再生成
pnpm build

# または
pnpm run generate:i18n-types
```

---

### 問題3: テストで言語を切り替えられない

**原因**: テストケース間で i18n の状態が共有されています。

#### 解決策

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { resetI18n, initializeI18n } from '../src/i18n.js';

describe('My Test', () => {
  beforeEach(() => {
    resetI18n();  // 各テスト前にリセット
  });

  it('should use English messages', () => {
    initializeI18n({ language: 'en' } as Config);
    // ...
  });

  it('should use Japanese messages', () => {
    initializeI18n({ language: 'ja' } as Config);
    // ...
  });
});
```

---

### 問題4: カスタムメッセージが反映されず翻訳されてしまう

**原因**: `customMessage` パラメータを引数として渡していません。

#### 解決策

```typescript
// 誤り（翻訳キーが使用される）
const error = createConfigurationError('field', value);
error.message = 'My custom message';  // 効果なし

// 正しい（カスタムメッセージを使用）
const error = createConfigurationError('field', value, 'My custom message');
```

---

### 問題5: パスなどの技術情報までメッセージに埋め込んでしまっている

**原因**: ファイルパスなどの技術情報をカスタムメッセージ内に直接展開しています。

#### 解決策

```typescript
// 誤り（メッセージが特定言語に固定される）
const error = createFileSystemError(
  path,
  undefined,
  `ファイルが見つかりません: ${path}`  // パスを含むカスタムメッセージ
);

// 正しい（翻訳キーを使用し、パスは変数補間で渡す）
const error = createFileSystemError(path, 'notFound');
// EN: "File not found: /path/to/file"
// JA: "ファイルが見つかりません: /path/to/file"
// ※ パス "/path/to/file" は変更されない
```

---

## チェックリスト

### 移行前チェックリスト

- [ ] 移行対象のエラーファクトリー関数を特定しています
- [ ] 翻訳リソースに対応するキーが存在するか確認しています
- [ ] カスタムメッセージを残すべきか判断しています
- [ ] パスやコードなどの技術情報の扱いを確認しています

### 移行後チェックリスト

- [ ] 不要なカスタムメッセージを削除し、必要な箇所のみ残しています
- [ ] 翻訳キーが正しく参照されています
- [ ] 技術情報がプロパティとメッセージに正しく保持されています
- [ ] 英語と日本語の両環境でテストを実行しています
- [ ] 型エラーがないことを確認しています（`pnpm type-check`）
- [ ] リントエラーがないことを確認しています（`pnpm lint`）
- [ ] すべてのテストが成功することを確認しています（`pnpm test`）

### デプロイ前チェックリスト

- [ ] 対象箇所の移行がすべて完了しています
- [ ] ビルドが成功しています（`pnpm build`）
- [ ] 統合テストが成功しています
- [ ] 関連ドキュメントを更新しています
- [ ] レビューが完了しています

---

## まとめ

移行作業で意識すべきポイントを振り返ります。

### 重要なポイント

1. 一般的なエラーは翻訳キーを使います
2. 詳細な修正案内が必要なエラーはカスタムメッセージを継続して使います
3. ファイルパスやステータスコードなどの技術情報は、翻訳せずにそのまま保持します
4. テストでは英語・日本語の両方の出力を検証します
5. 翻訳キーを追加したら `pnpm build`（または `pnpm run generate:i18n-types`）で型定義を再生成します

#### 関連資料

- [API.md - エラーファクトリー i18n 統合](./API.md#-エラーファクトリーの多言語化-i18n-integration)
- [src/errors/factories.ts](../../src/errors/factories.ts) - エラーファクトリーの実装
- [**tests**/error-factories-i18n.test.ts](../../__tests__/error-factories-i18n.test.ts) - i18n テストの実装例
