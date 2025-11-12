# 要件定義書

## はじめに

PR Insights Labelerプロジェクトの現在の入力パラメータ設計は以下の課題を抱えています:

1. **`apply_labels`パラメータの冗長性**: 個別制御(`size_enabled`, `complexity_enabled`等)が既に存在するため、`apply_labels`パラメータは設計として冗長です。`apply_labels: false`に設定するとすべてのラベルが無効化され、ツール自体がほぼ使用不可になります。
2. **複雑度分析のデフォルト設定**: 複雑度機能がデフォルトONであり、現在の閾値(`{"medium": 10, "high": 20}`)が厳しすぎます。実用的には複雑度20以上はコードレビュー時点では遅く、多くのプロジェクトでは事前のlint設定やIDE警告で対処すべき問題です。
3. **ユーザー混乱**: 複数の類似機能の存在により、ユーザーがどのパラメータを使用すべきか混乱しやすい設計になっています。

本要件では、これらの課題を解決し、よりシンプルで実用的な入力パラメータ設計に最適化します。

### ビジネス価値

- **ユーザー**: 直感的な設定で、必要な機能を個別に制御でき、混乱なく導入・運用できる
- **メンテナー**: パラメータ数が削減され、ドキュメント負担とサポートコストが軽減される
- **プロジェクト**: 実用的なデフォルト値により、初回導入時の調整作業が不要になる

## 要件

### 要件1: `apply_labels`パラメータの完全削除

**目的**: ユーザーとして、冗長な`apply_labels`パラメータなしで、個別の`*_enabled`パラメータのみを使用してラベル制御を行いたい

#### 受入基準

1. WHERE action.ymlにおいて THE `apply_labels`パラメータ定義が完全に削除されているものとする
2. WHERE `src/input-mapper.ts`において THE `Config`インターフェースから`applyLabels`プロパティが削除されているものとする
3. WHERE `src/input-mapper.ts`の`mapActionInputsToConfig`関数において THE `apply_labels`の読み込み処理が削除されているものとする
4. WHERE `src/label-applicator.ts`において THE `applyLabels`パラメータへの参照がすべて削除され、個別の`*_enabled`フラグのみを使用するロジックに変更されているものとする
5. WHERE `src/index.ts`において THE `applyLabels`への参照がすべて削除されているものとする
6. WHERE `src/actions-io.ts`において THE `applyLabels`への参照がすべて削除されているものとする
7. IF ユーザーがラベル適用を無効化したい場合 THEN 個別の`size_enabled: "false"`、`complexity_enabled: "false"`等を設定することで実現できるものとする

### 要件2: 複雑度機能のデフォルトOFF化

**目的**: ユーザーとして、複雑度分析をオプトイン機能として利用し、必要な場合のみ明示的に有効化したい

#### 受入基準

1. WHEN PR Insights Labelerがデフォルト設定で実行されるとき THEN 複雑度分析機能は無効化されており、複雑度ラベルが適用されないものとする
2. WHERE action.ymlの`complexity_enabled`パラメータにおいて THE デフォルト値が`"false"`に設定されているものとする
3. WHEN ユーザーが`complexity_enabled: "true"`を明示的に設定するとき THEN 複雑度分析が実行され、複雑度ラベルが適用されるものとする
4. WHERE README.mdのクイックスタートにおいて THE 複雑度機能の記載が「オプション機能」として明記され、デフォルトでは無効であることが説明されているものとする
5. WHERE GitHub Actions Summaryにおいて WHEN 複雑度機能が無効の場合 THEN 複雑度セクションが表示されないものとする
6. IF ユーザーが複雑度分析を有効化した場合 THEN ドキュメントに「事前lint設定やIDE警告での対処が推奨される」旨の注意書きが記載されているものとする

### 要件3: 複雑度閾値の緩和

**目的**: メンテナーとして、複雑度機能を有効化するユーザーに対して、より実用的な閾値をデフォルト値として提供したい

#### 受入基準

1. WHERE action.ymlの`complexity_thresholds`パラメータにおいて THE デフォルト値が`'{"medium": 15, "high": 30}'`に変更されているものとする(旧: `'{"medium": 10, "high": 20}'`)
2. WHEN ユーザーが複雑度機能を有効化し、閾値をカスタマイズしないとき THEN 新しいデフォルト閾値(`medium: 15, high: 30`)が適用されるものとする
3. WHERE src/labeler-types.tsまたは関連ファイルにおいて THE デフォルト複雑度閾値定数が`{ medium: 15, high: 30 }`に更新されているものとする
4. WHERE docs/configuration.mdにおいて THE 複雑度閾値の推奨値として新しいデフォルト値が記載され、業界標準(21-50が複雑)との整合性が説明されているものとする
5. IF ユーザーがカスタム閾値を設定する場合 THEN 引き続きJSON形式で自由に設定可能であるものとする

### 要件4: テストの更新

**目的**: メンテナーとして、すべてのテストが新しいパラメータ設計に対応していることを確認したい

#### 受入基準

1. WHERE `__tests__/input-mapper.test.ts`において THE `apply_labels`パラメータに関連するテストケースが完全に削除されているものとする
2. WHERE `__tests__/label-applicator.test.ts`において THE `applyLabels`パラメータへの依存が削除され、個別`*_enabled`フラグを使用するテストケースに更新されているものとする
3. WHERE `__tests__/`全体において THE 複雑度機能のデフォルトが`false`であることを前提としたテストケースが追加されているものとする
4. WHERE `__tests__/`全体において THE 新しい複雑度閾値(`medium: 15, high: 30`)を使用するテストケースが追加されているものとする
5. WHEN すべてのテストを実行するとき THEN `pnpm test`が成功し、カバレッジが維持されている(93%以上)ものとする

### 要件5: ドキュメントの更新

**目的**: ユーザーとして、最新のパラメータ設計を反映した正確なドキュメントを参照し、スムーズに移行できるようにしたい

#### 受入基準

1. WHERE README.mdにおいて THE `apply_labels`パラメータに関する記載がすべて削除されているものとする
2. WHERE README.mdのクイックスタートにおいて THE 個別`*_enabled`パラメータの使用方法が明確に記載され、例示されているものとする
3. WHERE README.mdにおいて THE 複雑度機能がオプション機能であり、デフォルトOFFであることが記載されているものとする
4. WHERE docs/configuration.mdにおいて THE すべての入力パラメータテーブルから`apply_labels`が削除され、個別制御パラメータのみが記載されているものとする
5. WHERE docs/configuration.mdにおいて THE 新しい複雑度デフォルト値(`complexity_enabled: "false"`, `complexity_thresholds: {"medium": 15, "high": 30}`)が記載されているものとする
6. WHERE CHANGELOG.mdにおいて THE 以下の破壊的変更が明確に記録されているものとする:
   - `apply_labels`パラメータの削除(個別`*_enabled`で代替)
   - `complexity_enabled`のデフォルト値変更(`"true"` → `"false"`)
   - `complexity_thresholds`のデフォルト値変更(`{"medium": 10, "high": 20}` → `{"medium": 15, "high": 30}`)
7. WHERE CHANGELOG.mdにおいて THE 移行ガイドが記載され、既存ユーザーが設定をどう調整すべきかが説明されているものとする

### 要件6: 既存機能の保全と動作確認

**目的**: メンテナーとして、パラメータ削除後も既存の個別制御機能(`*_enabled`)が正常に動作し、既存ユーザーへの影響が最小限であることを確認したい

#### 受入基準

1. WHEN ユーザーが`size_enabled: "false"`を設定するとき THEN サイズラベルが適用されないものとする
2. WHEN ユーザーが`complexity_enabled: "true"`を設定するとき THEN 複雑度分析が実行され、複雑度ラベルが適用されるものとする
3. WHEN ユーザーが`category_enabled: "false"`を設定するとき THEN カテゴリラベルが適用されないものとする
4. WHEN ユーザーが`risk_enabled: "false"`を設定するとき THEN リスクラベルが適用されないものとする
5. WHERE src/label-applicator.tsにおいて THE 個別`*_enabled`フラグの優先順位ロジックが維持され、各ラベル種別が独立して制御できるものとする
6. WHEN すべての品質チェックを実行するとき THEN `pnpm lint && pnpm type-check && pnpm test && pnpm build`がすべて成功するものとする

## 非機能要件

### パフォーマンスと品質

1. WHEN パラメータ削除によりコード量が削減されるとき THEN ビルド後のdist/index.jsのファイルサイズが削減または維持されるものとする
2. WHEN テストカバレッジを測定するとき THEN カバレッジが93%以上を維持しているものとする
3. WHERE ESLintとPrettierにおいて THE すべてのコード品質チェックがエラー0件で成功するものとする
