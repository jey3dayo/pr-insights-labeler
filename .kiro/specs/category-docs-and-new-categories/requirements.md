# 要件定義書

## はじめに

pr-labelerは現在6種類のデフォルトカテゴリラベル（tests, ci-cd, documentation, config, spec, dependencies）を提供していますが、カテゴリ情報がREADME、configuration.md、advanced-usage.mdに分散しており、専用のカテゴリ一覧ページが存在しません。また、ASTAプロジェクトで有用性が確認された`category/feature`（新機能）と`category/infrastructure`（インフラ・DevOps）のカテゴリが含まれていません。

本機能では、カテゴリ情報を一元管理する専用ドキュメント`docs/en/categories.md`を新規作成し、実績のある新カテゴリを追加することで、ユーザーのドキュメント体験を向上させ、プロジェクトの分類精度を高めます。

## 要件

### 要件1: カテゴリ専用ドキュメントの作成

**目的:** ドキュメント利用者として、カテゴリに関する全情報を一箇所で参照できるドキュメントを利用できるようにし、情報の検索性と理解度を向上させる

#### 受け入れ基準

1. WHEN ユーザーが`docs/en/categories.md`にアクセスするとき THEN PR Insights Labelerは9種類のカテゴリ（既存6種類＋新規3種類）の一覧をテーブル形式で表示すること
2. WHEN ユーザーがカテゴリ一覧テーブルを閲覧するとき THEN PR Insights Labelerは各カテゴリに対して以下の情報を提供すること：
   - ラベル名（例: `category/tests`）
   - 検出対象の説明（例: "テストコード"）
   - マッチするパターン（例: `**/*.test.ts`, `__tests__/**`）
   - 日本語表示名（例: "テストファイル"）
3. WHEN ユーザーがカテゴリの詳細を確認したいとき THEN PR Insights Labelerは各カテゴリごとに以下の詳細情報を提供すること：
   - 検出対象の詳細説明
   - パターン一覧（include/excludeを含む）
   - 用途と適用例
   - 多言語表示名（英語/日本語）
4. WHEN ユーザーがカスタムカテゴリの作成方法を知りたいとき THEN PR Insights Labelerは`.github/pr-labeler.yml`での定義方法をYAMLコード例付きで提供すること
5. WHEN ユーザーが複数カテゴリの適用ルールを確認したいとき THEN PR Insights Labelerは加法的（additive）ポリシーの動作説明（複数カテゴリが同時適用される）を提供すること
6. WHERE `docs/en/categories.md`内で THE PR Insights Labelerは設定例としてカスタムカテゴリ（例: `category/backend`）のYAML定義を含むこと

### 要件2: 新カテゴリの実装

**目的:** 開発者として、ASTAプロジェクトで実績のある`category/feature`と`category/infrastructure`、およびセキュリティ関連変更を追跡する`category/security`をデフォルトカテゴリとして利用できるようにし、プロジェクトの分類精度を向上させる

#### 受け入れ基準

1. WHEN PRに`src/features/**`または`features/**`のファイル変更が含まれるとき THEN PR Insights Labelerは`category/feature`ラベルを適用すること
2. WHEN PRに`src/components/**`のファイル変更が含まれ、かつテストファイルでないとき THEN PR Insights Labelerは`category/feature`ラベルを適用すること
3. WHEN PRに`.github/**`、`Dockerfile*`、`docker-compose*`、`terraform/**`、`.mise.toml`、`mise.toml`、`.tool-versions`のいずれかが含まれるとき THEN PR Insights Labelerは`category/infrastructure`ラベルを適用すること
4. WHEN PRに`k8s/**`、`kubernetes/**`、`helm/**`、`ansible/**`のいずれかが含まれるとき THEN PR Insights Labelerは`category/infrastructure`ラベルを適用すること
5. WHEN PRに`**/auth*/**`、`**/*auth*.ts`、`**/*auth*.js`、`**/*jwt*.ts`、`**/*session*.ts`、`**/*security*`、`.env*`、`secrets/**`のいずれかが含まれるとき THEN PR Insights Labelerは`category/security`ラベルを適用すること
6. IF `category/feature`のパターンにマッチするファイルがテストファイル（`**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`）であるとき THEN PR Insights Labelerは`category/feature`ラベルを適用せず、`category/tests`を適用すること
7. WHEN 新カテゴリが実装されるとき THEN PR Insights Labelerは多言語表示名（英語: "Feature"/"Infrastructure"/"Security", 日本語: "新機能"/"インフラ"/"セキュリティ"）を提供すること

### 要件3: カテゴリ定義の管理

**目的:** 開発者として、新カテゴリの定義を`src/configs/categories.ts`で一元管理できるようにし、保守性と拡張性を維持する

#### 受け入れ基準

1. WHEN 開発者が`src/configs/categories.ts`を更新するとき THEN PR Insights Labelerは以下の型定義に従うこと：

   ```typescript
   interface CategoryConfig {
     label: string;
     patterns: string[];
     exclude?: string[];
     display_name?: DisplayName;
   }
   ```

2. WHEN `category/feature`が定義されるとき THEN PR Insights Labelerは以下のパターンを含むこと：
   - `src/features/**`
   - `features/**`
   - `src/components/**`（excludeに`**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`を含む）
3. WHEN `category/infrastructure`が定義されるとき THEN PR Insights Labelerは以下のパターンを含むこと：
   - `.github/**`
   - `Dockerfile*`
   - `docker-compose*`
   - `terraform/**`
   - `.mise.toml`
   - `mise.toml`
   - `.tool-versions`
   - `k8s/**`
   - `kubernetes/**`
   - `helm/**`
   - `ansible/**`
4. WHEN `category/security`が定義されるとき THEN PR Insights Labelerは以下のパターンを含むこと：
   - `**/auth*/**`
   - `**/*auth*.ts`
   - `**/*auth*.js`
   - `**/*jwt*.ts`
   - `**/*session*.ts`
   - `**/*security*`
   - `.env*`
   - `secrets/**`
5. WHERE `src/configs/categories.ts`内で THE PR Insights Labelerは既存6カテゴリの定義を変更しないこと
6. WHILE 新カテゴリを追加するとき THE PR Insights Labelerはminimatchパターンマッチングを使用すること

### 要件4: 既存ドキュメントからの相互参照

**目的:** ドキュメント利用者として、既存ドキュメント（README.md, configuration.md等）から`docs/en/categories.md`へのリンクを辿れるようにし、情報へのアクセシビリティを向上させる

#### 受け入れ基準

1. WHEN ユーザーが`README.md`のカテゴリラベルセクション（L115-126付近）を閲覧するとき THEN PR Insights Labelerは`docs/en/categories.md`への相互参照リンクを提供すること
2. WHEN ユーザーが`README.ja.md`のカテゴリラベルセクション（L115-126付近）を閲覧するとき THEN PR Insights Labelerは`docs/en/categories.md`への相互参照リンク（日本語説明付き）を提供すること
3. WHEN ユーザーが`docs/en/configuration.md`のカテゴリ設定セクション（L358付近）を閲覧するとき THEN PR Insights Labelerは`docs/en/categories.md`への相互参照リンクを提供すること
4. WHEN ユーザーが`docs/en/advanced-usage.md`のカスタムカテゴリセクション（L320付近）を閲覧するとき THEN PR Insights Labelerは`docs/en/categories.md`への相互参照リンクを提供すること
5. WHERE 相互参照リンク内で THE PR Insights Labelerは「詳細はカテゴリガイドを参照」のような説明文を含むこと

### 要件5: テストカバレッジの維持

**目的:** 開発者として、新カテゴリの実装が既存のテストカバレッジ（93%以上）を維持し、品質を保証できるようにする

#### 受け入れ基準

1. WHEN `category/feature`の検出ロジックがテストされるとき THEN PR Insights Labelerは以下のテストケースをカバーすること：
   - `src/features/auth.ts` → `category/feature`を適用
   - `src/components/Button.tsx` → `category/feature`を適用
   - `src/components/Button.test.tsx` → `category/tests`を適用（`category/feature`は適用しない）
2. WHEN `category/infrastructure`の検出ロジックがテストされるとき THEN PR Insights Labelerは以下のテストケースをカバーすること：
   - `.github/workflows/ci.yml` → `category/infrastructure`を適用
   - `Dockerfile` → `category/infrastructure`を適用
   - `terraform/main.tf` → `category/infrastructure`を適用
   - `k8s/deployment.yaml` → `category/infrastructure`を適用
3. WHEN `category/security`の検出ロジックがテストされるとき THEN PR Insights Labelerは以下のテストケースをカバーすること：
   - `src/lib/auth/middleware.ts` → `category/security`を適用
   - `src/utils/jwt.ts` → `category/security`を適用
   - `.env.local` → `category/security`を適用
   - `secrets/api-keys.json` → `category/security`を適用
4. WHEN 新カテゴリのテストが実行されるとき THEN PR Insights Labelerは`__tests__/label-decision-engine.test.ts`にテストケースを追加すること
5. WHEN 全テストが実行されるとき THEN PR Insights Labelerはテストカバレッジ93%以上を維持すること
6. WHEN 新カテゴリのパターンマッチングがテストされるとき THEN PR Insights Labelerはminimatchの動作を検証すること

### 要件6: ドキュメント品質の保証

**目的:** ドキュメント利用者として、`docs/en/categories.md`および相互参照リンクが正常に機能し、リンク切れがないことを保証する

#### 受け入れ基準

1. WHEN ドキュメントがビルドされるとき THEN PR Insights Labelerはmarkdown-link-checkによるリンク検証を実行すること
2. IF `docs/en/categories.md`内に外部リンクまたは内部リンクが含まれるとき THEN PR Insights Labelerはすべてのリンクが有効であることを検証すること
3. WHEN README.md、README.ja.md、configuration.md、advanced-usage.mdから`docs/en/categories.md`へのリンクが追加されるとき THEN PR Insights Labelerはリンクパスが正確であることを検証すること
4. WHERE `docs/en/categories.md`内で THE PR Insights Labelerはマークダウン記法が正しく、GitHub Flavored Markdown（GFM）に準拠していること
5. WHEN CIパイプラインが実行されるとき THEN PR Insights LabelerはDocumentation Qualityチェックを成功させること

### 要件7: 既存機能への影響回避

**目的:** 開発者として、新カテゴリの追加が既存6カテゴリの動作に影響を与えないことを保証し、後方互換性を維持する

#### 受け入れ基準

1. WHEN 新カテゴリが追加されるとき THEN PR Insights Labelerは既存6カテゴリ（tests, ci-cd, documentation, config, spec, dependencies）のパターン定義を変更しないこと
2. WHEN PRに既存カテゴリのパターンにマッチするファイルが含まれるとき THEN PR Insights Labelerは新カテゴリ追加前と同じラベルを適用すること
3. IF PRに`__tests__/sample.test.ts`が含まれるとき THEN PR Insights Labelerは`category/tests`のみを適用し、`category/feature`は適用しないこと（excludeパターンが正常に機能）
4. WHEN カテゴリラベルが適用されるとき THEN PR Insights Labelerは加法的（additive）ポリシーを維持し、複数カテゴリの同時適用を許可すること
5. WHEN `src/configs/categories.ts`が更新されるとき THEN PR Insights Labelerは既存の型定義（`CategoryConfig`）を変更しないこと

### 要件8: TypeScript型安全性の維持

**目的:** 開発者として、新カテゴリの実装がTypeScript strict modeを遵守し、型安全性を維持できるようにする

#### 受け入れ基準

1. WHEN TypeScript型チェック（`pnpm type-check`）が実行されるとき THEN PR Insights Labelerは型エラー0件を維持すること
2. WHEN `src/configs/categories.ts`が更新されるとき THEN PR Insights Labelerは`CategoryConfig`インターフェースに準拠すること
3. WHERE 新カテゴリ定義内で THE PR Insights Labelerは`any`型を使用しないこと
4. WHEN 新カテゴリが`DEFAULT_CATEGORIES`配列に追加されるとき THEN PR Insights Labelerは`readonly CategoryConfig[]`型を維持すること
5. WHEN ESLint（`pnpm lint`）が実行されるとき THEN PR Insights Labelerはリンター違反0件を維持すること
