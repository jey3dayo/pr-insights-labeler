# 技術設計書: ラベル種別の選択的有効化と入力命名の統一

## 概要

目的: 各ラベル種別（size/complexity/category/risk）を個別にON/OFFできる統一インターフェースを提供し、inputsの命名規則を `*_enabled`, `*_thresholds` に統一する。既存のアーキテクチャ（純粋関数の判定エンジン、型安全な設定、Actions I/Oの分離）に沿って、最小変更で拡張する。

影響: `labeler-types.ts`, `configs/default-config.ts`, `config-loader.ts`, `actions-io.ts`, `input-mapper.ts`, `label-decision-engine.ts`, `action.yml`, `README.md`、および関連テスト。

## Goals / Non-Goals

- Goals:
  - ラベル種別の個別有効化フラグを追加（size/complexity/category/risk）
  - inputs命名の統一（`*_enabled`, `*_thresholds`）と既存名のマッピング
  - 型定義→入出力→設定→判定のデータフロー一貫性
  - Summary出力に無効化情報の表示
- Non-Goals:
  - 既存ラベル判定アルゴリズムの変更（閾値やマッチングの意味は維持）
  - 外部依存の追加（既存neverthrow/minimatch/ESLintのみ）

## 現状アーキテクチャ（抜粋）

- `actions-io.ts`: `ActionInputs` の収集（snake_case文字列）
- `input-mapper.ts`: 文字列→内部 `Config`（camelCase, 型付き）へ変換
- `config-loader.ts`: YAMLの `LabelerConfig` を検証＋デフォルトマージ
- `labeler-types.ts`: `LabelerConfig` 等の型と `DEFAULT_LABELER_CONFIG` のエクスポート
- `label-decision-engine.ts`: 純粋関数でラベル決定（sizeは常に、complexityは enabled で分岐、category/riskは常に）
- `label-manager.ts`: 付与/削除の最終適用（sizeのみ `applySizeLabels` で制御）

課題: sizeだけ `apply_size_labels`/`applySizeLabels` で制御、complexityは `config.complexity.enabled`、category/riskに有効化制御なし。命名も不一致。

## 破壊的変更（Breaking Changes）

**注意**: このPRはv1実装のため、v0.xからの後方互換性は**提供しません**。

### 削除されたInputs

以下のinputsは完全に削除されました:

- `apply_size_labels` (boolean)
- `size_label_thresholds` (JSON: `{small: number, medium: number, ...}`)

### マイグレーションガイド

**v0.xから移行する場合:**

1. **`apply_size_labels`を削除し、`size_enabled`に置き換え**

```diff
- apply_size_labels: 'true'
+ size_enabled: 'true'
```

1. **`size_label_thresholds`を削除し、`size_thresholds`に置き換え**

```diff
- size_label_thresholds: '{"small": 100, "medium": 300, "large": 800}'
+ size_thresholds: '{"small": 50, "medium": 300, "large": 800}'
```

**注意**: 閾値の意味が変更されています:

- **v0.x**: `additions + files`の合計で判定
- **v1**: `additions`のみで判定

1. **ラベル名の変更**

- v0.x: `S`, `M`, `L`, `XL`, `XXL`
- v1: `size/small`, `size/medium`, `size/large`, `size/xlarge`, `size/xxlarge`

### ラベル判定ロジックの変更

- **v0.x**: `label-manager.ts`の`applySizeLabels`ロジック（additions + files）
- **v1**: `label-decision-engine.ts`のPR Insights Labelerロジック（additionsのみ）に統一

## 既存サイズ機能との衝突と方針決定

### 問題点

- **既存機能**: `label-manager.ts` が S/M/L/XL/XXL ラベルを `apply_size_labels` と `size_label_thresholds`（additions + files）で制御
- **新機能**: PR Insights Labeler が size/small〜xlarge を `size_enabled` と `size_thresholds`（additions のみ）で制御
- **衝突**: 入力・閾値スキーマが異なり、混在すると誤設定の温床になる

### 採用方針

**方式A: v0.x のサイズ機能を廃止し、PR Insights Labeler に一本化**（採用）

- **理由**: 命名統一の目的と一貫性を保つ
- **影響**:
  - `label-manager.ts` のサイズ関連ロジックを削除
  - README/docs から v0.x の記述を削除
  - CHANGELOG.md にマイグレーションガイドを追加

### 実装方針

- `label-manager.ts` の `applySizeLabels` ロジックを完全削除
- PR Insights Labeler の `size/small〜xlarge` ラベルに統一
- 削除された `apply_size_labels`/`size_label_thresholds` inputs を action.yml から削除

## 変更設計（ハイライト）

1. 型の拡張（LabelerConfig）

- `size: { enabled: boolean; thresholds: { small, medium, large } }` を追加（enabled新設）
- `complexity.enabled` は現行維持
- `categoryLabeling: { enabled: boolean }` を新設（`categories: CategoryConfig[]` は現行のまま保持）
- `risk: { enabled: boolean; ...現行フィールド }` を拡張

1. Inputsとマッピング

- 新規inputs: `size_enabled`, `size_thresholds`, `complexity_enabled`, `complexity_thresholds`, `category_enabled`, `risk_enabled`
- 削除された inputs: `apply_size_labels` と `size_label_thresholds` は action.yml から削除（v1実装のため後方互換性なし）
- 文字列ブール（"true"/"false" 等）は既存の `parseBoolean` を再利用。閾値JSONは専用パーサを実装

1. データフロー統合

- `ActionInputs` に新規フィールドを追加（string型）、削除されたフィールド（`apply_size_labels`, `size_label_thresholds`）を削除
- `Config`（input-mapper内部型）に `sizeEnabled/complexityEnabled/categoryEnabled/riskEnabled` を追加
- `mapActionInputsToConfig` で新規inputsを処理、デフォルトは `true`
- `mergeWithDefaults` に各 enabled の適用を追加

### Action inputs → LabelerConfig の統合経路

```
ActionInputs (actions-io.ts)
  ↓ getActionInputs()
Action raw inputs (string)
  ↓ input-mapper.ts: mapActionInputsToConfig()
Config (typed, camelCase)
  ↓ index.ts: loadConfig() → YAML読み込み
LabelerConfig (YAML based)
  ↓ index.ts: inputs優先マージ
LabelerConfig (final, inputs優先)
  ↓ label-decision-engine.ts
Label Decisions
```

**統合ロジック（index.ts）**:

1. YAML から `LabelerConfig` を読み込み（`config-loader.ts`）
2. `ActionInputs` から `Config` を生成（`input-mapper.ts`）
3. **inputs 優先マージ**: `Config` の値で `LabelerConfig` を上書き
   - `config.sizeEnabled` → `labelerConfig.size.enabled`
   - `config.complexityEnabled` → `labelerConfig.complexity.enabled`
   - `config.categoryEnabled` → `labelerConfig.categoryLabeling.enabled`
   - `config.riskEnabled` → `labelerConfig.risk.enabled`
   - `config.sizeThresholdsV2` → `labelerConfig.size.thresholds`
   - `config.complexityThresholdsV2` → `labelerConfig.complexity.thresholds`

4. 判定エンジンの分岐

- size: `config.size.enabled` が false の場合はサイズ判定/理由付けをスキップ
- complexity: 既存通り `config.complexity.enabled` で分岐
- category: `config.categoryLabeling.enabled` が false の場合はカテゴリ判定をスキップ
- risk: `config.risk.enabled` が false の場合はリスク判定をスキップ

1. Summary出力

- 無効化されたラベル種別を一覧としてSummaryに追記（例: "Disabled: size, category"）

## 型定義の詳細

LabelerConfig（変更後の抜粋）

```ts
export interface LabelerConfig {
  size: {
    enabled: boolean;
    thresholds: { small: number; medium: number; large: number };
  };
  complexity: ComplexityConfig; // 既存: enabledを保持
  categoryLabeling: { enabled: boolean }; // 新設
  categories: CategoryConfig[];            // 既存
  risk: RiskConfig & { enabled: boolean }; // 拡張
  exclude: ExcludeConfig;
  labels: LabelPolicyConfig;
  runtime: RuntimeConfig;
}
```

ActionInputs（追加・削除フィールド）

```ts
export interface ActionInputs {
  // 既存...

  // 🆕 新規追加
  size_enabled: string;
  size_thresholds: string;
  complexity_enabled: string;
  complexity_thresholds: string;
  category_enabled: string;
  risk_enabled: string;

  // ❌ 削除（v1実装のため後方互換性なし）
  // apply_size_labels: string; → size_enabled に統一
  // size_label_thresholds: string; → size_thresholds に統一
}
```

内部Config（抜粋、既存`Config`へ追加）

```ts
export interface Config {
  // ...既存
  sizeEnabled: boolean;
  complexityEnabled: boolean;
  categoryEnabled: boolean;
  riskEnabled: boolean;
  sizeThresholdsV2: { small: number; medium: number; large: number }; // 新パス
  complexityThresholdsV2: { medium: number; high: number };
}
```

注: `sizeThresholds`（S/M/L構造）を維持しつつ、ラベラー判定用のV2閾値を併置して段階移行を容易にする。最終適用層ではV2を優先。

## 入力マッピング仕様

- ブール入力のデフォルト: すべての `*_enabled` パラメータは省略時に `true`
- 閾値入力のデフォルト:
  - `size_thresholds`: `{"small": 100, "medium": 500, "large": 1000}`
  - `complexity_thresholds`: `{"medium": 10, "high": 20}`
- バリデーション:
  - enabled: `true/false/1/0/yes/no/on/off`（**厳密化**: `parseBooleanStrict` を新設）
  - size_thresholds: `{ small, medium, large }` 数値/非負/順序 small < medium < large
  - complexity_thresholds: `{ medium, high }` 数値/非負/順序 medium < high
  - 不正時は `ConfigurationError/ParseError` を返却しAction失敗

### バリデーション厳密化

**parseBooleanStrict の実装**:

- **現行の parseBoolean**: 未知値を `false` にフォールバック（エラーにしない）
- **新規の parseBooleanStrict**: 未知値は `ConfigurationError` を返却
- **適用対象**: すべての `*_enabled` パラメータ（`size_enabled`, `complexity_enabled`, `category_enabled`, `risk_enabled`）

```ts
// 既存: parseBoolean (寛容)
export function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return ['true', '1', 'yes', 'on'].includes(normalized);
}

// 新規: parseBooleanStrict (厳密)
export function parseBooleanStrict(value: string): Result<boolean, ConfigurationError> {
  const normalized = value.toLowerCase().trim();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return ok(true);
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return ok(false);
  }
  return err(
    new ConfigurationError(
      `Invalid boolean value: "${value}". Allowed values: true/false/1/0/yes/no/on/off`
    )
  );
}
```

## 設定統合（config-loader）

- `mergeWithDefaults` に `size.enabled`, `categoryLabeling.enabled`, `risk.enabled` を追加
- `DEFAULT_LABELER_CONFIG` に対応するデフォルト（全て `true`）を設定
- `validateLabelerConfig` にしきい値順序の検証は既存ロジックを拡張して流用（complexity既存、sizeは追加）

## 判定エンジン（label-decision-engine）変更

- size: `if (config.size.enabled) { decideSizeLabel... }` に変更。無効時はreasoningへ未追加
- category: `if (config.categoryLabeling.enabled) { decideCategoryLabels... }`
- risk: `if (config.risk.enabled) { decideRiskLabel... }`
- complexity: 既存の分岐を維持

## Summary出力拡張

### I/F変更

`writeSummaryWithAnalysis` のシグネチャを拡張：

```ts
// 現行
export async function writeSummaryWithAnalysis(
  metrics: PRMetrics,
  decisions: LabelDecisions,
  config: LabelerConfig
): Promise<Result<SummaryWriteResult, never>>

// 変更後
export async function writeSummaryWithAnalysis(
  metrics: PRMetrics,
  decisions: LabelDecisions,
  config: LabelerConfig,
  options?: { disabledFeatures?: string[] }
): Promise<Result<SummaryWriteResult, never>>
```

### 実装詳細

1. **無効化情報の収集** (`index.ts` または呼び出し元):

   ```ts
   const disabledFeatures: string[] = [];
   if (!config.size.enabled) disabledFeatures.push('size');
   if (!config.complexity.enabled) disabledFeatures.push('complexity');
   if (!config.categoryLabeling.enabled) disabledFeatures.push('category');
   if (!config.risk.enabled) disabledFeatures.push('risk');
   ```

2. **Summary追記** (`writeSummaryWithAnalysis` 内):

   ```ts
   if (options?.disabledFeatures && options.disabledFeatures.length > 0) {
     core.summary.addRaw('\n\n---\n\n');
     core.summary.addQuote(
       `Disabled label types: ${options.disabledFeatures.join(', ')}`
     );
   }
   ```

3. **表示条件**:
   - 無効化されたラベル種別が存在する場合のみ表示
   - 空配列または未指定の場合は何も表示しない

## 代替案と採用理由

- 代替: `categories` そのものに `enabled` を埋め込む → 設定スキーマの意味が混同されるため不採用（パターン定義と制御フラグは責務分離）
- 代替: 削除された inputs を維持して段階的移行 → v1実装のため後方互換性を考慮する必要がないため不採用

## 互換性

- v1実装のため、削除された inputs（`apply_size_labels`, `size_label_thresholds`）は削除
- YAML設定はデフォルト値でカバー（新設の `categoryLabeling.enabled`, `risk.enabled`, `size.enabled` はデフォルトtrue）

## トレーサビリティ（要件対応）

- Req1: 4種のenabledフラグ → 型/入力/判定の各層で分岐を実装
- Req2: 命名統一 → 新inputs導入、inputs 削除
- Req3: 閾値カスタム → `*_thresholds` パース/検証を追加
- Req4: 型とデータフロー → `ActionInputs/Config/LabelerConfig` を拡張
- Req5: 判定分岐 → 各カテゴリでスキップ実装＋reasoning非出力
- Req6: action.yml → 新inputsとデフォルトの定義
- Req7: テスト → マッピング/分岐/しきい値検証のユースケース追加
- Req8: ドキュメント → READMEに新inputsと例を追加
- Req9: エラー/検証 → 既存パターンへ追補
