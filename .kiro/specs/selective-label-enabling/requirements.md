# Requirements Document

## Project Description (Input)

**GitHub Issue #25: ラベル種別の選択的有効化機能の追加（Input設計の統一化）**

### 概要

ユーザーが各ラベル種別（size/complexity/category/risk）を個別にON/OFFできるようにする。併せて、既存inputsの命名規則を統一し、より直感的で一貫性のある設定UIを提供する。

### 背景・課題

現在の実装には以下の問題がある：

- ✅ sizeラベルは `apply_size_labels` でON/OFF可能
- ✅ complexityラベルは内部configの `complexity.enabled` でON/OFF可能
- ❌ categoryラベルは個別制御できない
- ❌ riskラベルは個別制御できない
- ❌ 命名規則が統一されていない（`apply_size_labels` vs `complexity.enabled`）

ユーザーが必要なラベル種別だけを選択的に使用できるようにし、input設計を統一したい。

### 提案する変更

#### 新規inputs（統一された命名規則）

- `size_enabled`: Enable size labels (default: true)
- `size_thresholds`: Size label thresholds (JSON)
- `complexity_enabled`: Enable complexity labels (default: true)
- `complexity_thresholds`: Complexity thresholds (JSON)
- `category_enabled`: Enable category labels (default: true)
- `risk_enabled`: Enable risk labels (default: true)

#### 削除する既存inputs

- `apply_size_labels` → `size_enabled` に統合
- `size_label_thresholds` → `size_thresholds` にリネーム

### 使用例

1. デフォルト（すべて有効）
2. complexityだけ無効化（`complexity_enabled: false`）
3. カスタム閾値 + 一部無効化
4. 分析のみ（`apply_labels: false`）

### 実装の優先順位

1. **Phase 1**: 型定義の更新（labeler-types.ts, input-mapper.ts, actions-io.ts）
2. **Phase 2**: Input処理の実装（actions-io.ts, input-mapper.ts, config-loader.ts）
3. **Phase 3**: ラベル判定ロジックの更新（label-decision-engine.ts）
4. **Phase 4**: テストの追加・更新
5. **Phase 5**: ドキュメント更新（README.md, action.ymlの説明文）

### 影響を受けるファイル

- action.yml
- src/actions-io.ts
- src/input-mapper.ts
- src/labeler-types.ts
- src/config-loader.ts
- src/label-decision-engine.ts
- src/configs/default-config.ts
- **tests**/label-decision-engine.test.ts
- README.md

## Requirements

### Requirement 1: ラベル種別の個別制御

**目的:** GitHub Actions ユーザーとして、各ラベル種別（size/complexity/category/risk）を個別にON/OFFできるようにしたい。これにより、プロジェクトのニーズに応じて必要なラベル種別だけを選択的に使用できる。

#### 受入基準

1. WHEN ユーザーが `size_enabled: "false"` を設定する THEN PR Insights Labeler はサイズラベル（size/small, size/medium, size/large, size/xlarge）を付与しない
2. WHEN ユーザーが `complexity_enabled: "false"` を設定する THEN PR Insights Labeler は複雑度ラベル（complexity/medium, complexity/high）を付与しない
3. WHEN ユーザーが `category_enabled: "false"` を設定する THEN PR Insights Labeler はカテゴリラベル（category/tests, category/docs等）を付与しない
4. WHEN ユーザーが `risk_enabled: "false"` を設定する THEN PR Insights Labeler はリスクラベル（risk/high, risk/medium）を付与しない
5. WHEN ユーザーがラベル種別のenabledパラメータを省略する THEN PR Insights Labeler は当該ラベル種別をデフォルトで有効（true）として扱う
6. WHEN すべてのラベル種別が無効化されている THEN PR Insights Labeler はラベル分析のみを実行し、GitHub Actions Summaryにメトリクスを出力する

### Requirement 2: Input命名規則の統一化

**目的:** GitHub Actions ユーザーとして、統一された命名規則でinputsを設定したい。これにより、設定の直感性と一貫性を向上させ、学習コストを削減できる。

#### 受入基準

1. WHEN ユーザーがサイズラベル設定を行う THEN PR Insights Labeler は `size_enabled` と `size_thresholds` の統一された命名規則でパラメータを受け付ける
2. WHEN ユーザーが複雑度ラベル設定を行う THEN PR Insights Labeler は `complexity_enabled` と `complexity_thresholds` の統一された命名規則でパラメータを受け付ける
3. WHEN action.yml が読み込まれる THEN すべてのenabledパラメータ（size_enabled, complexity_enabled, category_enabled, risk_enabled）のデフォルト値は "true" である
4. WHEN すべてのラベル種別の命名規則を確認する THEN `*_enabled` と `*_thresholds` のパターンで一貫性がある

### Requirement 3: カスタム閾値設定

**目的:** GitHub Actions ユーザーとして、各ラベル種別の閾値をプロジェクトのニーズに合わせてカスタマイズしたい。これにより、プロジェクト固有の基準でラベル判定を行える。

#### 受入基準

1. WHEN ユーザーが `size_thresholds` をJSON形式で指定する THEN PR Insights Labeler は指定された閾値（small/medium/large）でサイズラベルを判定する
2. WHEN ユーザーが `complexity_thresholds` をJSON形式で指定する THEN PR Insights Labeler は指定された閾値（medium/high）で複雑度ラベルを判定する
3. IF ユーザーが閾値パラメータを省略する THEN PR Insights Labeler はデフォルト閾値を使用する
   - サイズ: `{"small": 100, "medium": 500, "large": 1000}`
   - 複雑度: `{"medium": 10, "high": 20}`
4. WHEN ユーザーが不正なJSON形式の閾値を指定する THEN PR Insights Labeler はエラーメッセージを出力し、GitHub Actionを失敗させる
5. WHEN ユーザーが閾値として負の数や0を指定する THEN PR Insights Labeler はバリデーションエラーを出力し、GitHub Actionを失敗させる

### Requirement 4: 型定義とデータフローの更新

**目的:** 開発者として、型安全性を維持しながら新しいenabledフラグをシステム全体に統合したい。これにより、コンパイル時のエラー検出とコードの保守性を向上させる。

#### 受入基準

1. WHEN `ActionInputs` 型が定義される THEN size_enabled, complexity_enabled, category_enabled, risk_enabled の各フィールドが string 型で含まれる
2. WHEN `ProcessedInputs` 型が定義される THEN sizeEnabled, complexityEnabled, categoryEnabled, riskEnabled の各フィールドが boolean 型で含まれる
3. WHEN `LabelerConfig` 型が定義される THEN size, complexity, categoryLabeling, risk の各セクションに enabled: boolean フィールドが含まれる
4. WHEN Input Mapper がActionInputsを処理する THEN 文字列 "true"/"false" を boolean 型に正しく変換する
5. WHEN Config Loader がProcessedInputsを処理する THEN enabled フラグを適切に LabelerConfig に反映する

### Requirement 5: ラベル判定ロジックの更新

**目的:** 開発者として、enabled フラグに基づいてラベル判定を条件分岐させたい。これにより、無効化されたラベル種別のラベルが誤って付与されることを防ぐ。

#### 受入基準

1. WHEN Label Decision Engine が実行される AND `config.size.enabled` が false である THEN サイズラベルの判定処理をスキップする
2. WHEN Label Decision Engine が実行される AND `config.complexity.enabled` が false である THEN 複雑度ラベルの判定処理をスキップする
3. WHEN Label Decision Engine が実行される AND `config.categoryLabeling.enabled` が false である THEN カテゴリラベルの判定処理をスキップする
4. WHEN Label Decision Engine が実行される AND `config.risk.enabled` が false である THEN リスクラベルの判定処理をスキップする
5. WHEN ラベル判定がスキップされる THEN reasoning 配列にスキップされたラベル種別の情報が含まれない
6. WHEN 無効化されたラベル種別が存在する THEN GitHub Actions Summary にどのラベル種別が無効化されているかの情報を出力する

### Requirement 6: action.yml の更新

**目的:** GitHub Actions ユーザーとして、action.yml の inputs セクションで新しいパラメータを確認・設定したい。これにより、IDE の補完機能やドキュメントからパラメータを発見しやすくする。

#### 受入基準

1. WHEN action.yml が定義される THEN size_enabled input がデフォルト値 "true" と説明文を持つ
2. WHEN action.yml が定義される THEN complexity_enabled input がデフォルト値 "true" と説明文を持つ
3. WHEN action.yml が定義される THEN category_enabled input がデフォルト値 "true" と説明文を持つ
4. WHEN action.yml が定義される THEN risk_enabled input がデフォルト値 "true" と説明文を持つ
5. WHEN action.yml が定義される THEN size_thresholds input がデフォルトJSON値と説明文を持つ
6. WHEN action.yml が定義される THEN complexity_thresholds input がデフォルトJSON値と説明文を持つ

### Requirement 7: テストカバレッジの追加

**目的:** 開発者として、新機能が正しく動作することを自動テストで保証したい。これにより、リグレッションを防ぎ、コードの品質を維持できる。

#### 受入基準

1. WHEN Label Decision Engine のテストが実行される THEN `size.enabled = false` の場合にサイズラベルが付与されないことを検証する
2. WHEN Label Decision Engine のテストが実行される THEN `complexity.enabled = false` の場合に複雑度ラベルが付与されないことを検証する
3. WHEN Label Decision Engine のテストが実行される THEN `categoryLabeling.enabled = false` の場合にカテゴリラベルが付与されないことを検証する
4. WHEN Label Decision Engine のテストが実行される THEN `risk.enabled = false` の場合にリスクラベルが付与されないことを検証する
5. WHEN Input Mapper のテストが実行される THEN size_enabled, complexity_enabled, category_enabled, risk_enabled のパースが正しく動作することを検証する
6. WHEN Config Loader のテストが実行される THEN ProcessedInputs から各 enabled フラグが正しく LabelerConfig に反映されることを検証する
7. WHEN すべてのテストが完了する THEN テストカバレッジが既存の93%以上を維持する

### Requirement 8: ドキュメントの更新

**目的:** GitHub Actions ユーザーとして、新しいパラメータの使い方をREADMEで確認したい。これにより、導入時の学習コストを削減し、正しい設定方法を理解できる。

#### 受入基準

1. WHEN README.md が更新される THEN 新規inputsの一覧表（size_enabled, complexity_enabled, category_enabled, risk_enabled, size_thresholds, complexity_thresholds）が含まれる
2. WHEN README.md が更新される THEN 各ラベル種別を個別に無効化する使用例が3つ以上含まれる
   - 例1: すべて有効（デフォルト）
   - 例2: complexityだけ無効化
   - 例3: カスタム閾値 + 一部無効化
3. WHEN README.md が更新される THEN 統一された命名規則（`*_enabled`, `*_thresholds`）の説明が含まれる

### Requirement 9: エラーハンドリングと検証

**目的:** GitHub Actions ユーザーとして、設定ミスがあった場合に明確なエラーメッセージを受け取りたい。これにより、問題の原因を迅速に特定し、修正できる。

#### 受入基準

1. WHEN ユーザーが enabled パラメータに "true" または "false" 以外の値を設定する THEN PR Insights Labeler は明確なエラーメッセージを出力し、GitHub Action を失敗させる
2. WHEN ユーザーが thresholds パラメータに不正なJSON形式を設定する THEN PR Insights Labeler は JSON パースエラーを出力し、GitHub Action を失敗させる
3. WHEN ユーザーが thresholds パラメータで閾値の順序が不正（small > medium等）な場合 THEN PR Insights Labeler はバリデーションエラーを出力し、GitHub Action を失敗させる
4. WHEN バリデーションエラーが発生する THEN エラーメッセージには問題の詳細（どのパラメータが不正か、期待される形式）が含まれる
5. WHEN エラーが発生する THEN GitHub Actions Summary にエラー詳細が表示され、デバッグが容易である
