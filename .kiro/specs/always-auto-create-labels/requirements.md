# Requirements Document

## Project Description (Input)

Remove `auto_create_labels` input and related configuration options. Directory-Based Labeling should always auto-create labels when they don't exist, as this is the most practical behavior for automated labeling. Current implementation:

- `auto_create_labels` (default: false) - controls whether to auto-create missing labels
- `label_color` (default: cccccc) - color for auto-created labels
- `label_description` (default: "") - description for auto-created labels

The problem: Users enabling Directory-Based Labeling expect full automation. Requiring manual label creation (auto_create_labels: false) defeats the purpose. There's no practical use case for disabling auto-creation.

Proposal: Remove these 3 inputs and always auto-create labels with fixed defaults (color: cccccc, description: ""). This simplifies the API and provides better user experience.

Scope:

- Update action.yml to remove the 3 inputs
- Update ActionInputs and Config interfaces
- Update input-mapper.ts to remove parsing logic
- Update label-applicator.ts to always use autoCreate: true with fixed defaults
- Update tests
- Update README and documentation

This change aligns with the simplification goals and removes unnecessary configuration complexity.

## Requirements

### 要件1: 入力パラメータの削除

**目的**: ユーザーとして、Directory-Based Labeling機能を有効化したときに、不要な設定なしで自動的にラベルが作成・適用されることで、設定の複雑さを減らしたい

#### 受け入れ基準

1. WHEN `action.yml`が読み込まれる THEN `action.yml` SHALL `auto_create_labels`入力パラメータを含まない
2. WHEN `action.yml`が読み込まれる THEN `action.yml` SHALL `label_color`入力パラメータを含まない
3. WHEN `action.yml`が読み込まれる THEN `action.yml` SHALL `label_description`入力パラメータを含まない
4. WHEN ユーザーが`action.yml`の入力仕様を確認する THEN `action.yml` SHALL Directory-Based Labeling関連の入力として`enable_directory_labeling`, `directory_labeler_config_path`, `max_labels`, `use_default_excludes`のみを定義する

### 要件2: 型定義とインターフェースの更新

**目的**: 開発者として、削除された入力パラメータに関連する型定義が完全に削除されることで、コードベースの一貫性を保ちたい

#### 受け入れ基準

1. WHEN TypeScriptコンパイラが`ActionInputs`インターフェースを検証する THEN PR Insights Labeler SHALL `auto_create_labels`プロパティを含まない
2. WHEN TypeScriptコンパイラが`ActionInputs`インターフェースを検証する THEN PR Insights Labeler SHALL `label_color`プロパティを含まない
3. WHEN TypeScriptコンパイラが`ActionInputs`インターフェースを検証する THEN PR Insights Labeler SHALL `label_description`プロパティを含まない
4. WHEN TypeScriptコンパイラが`Config`インターフェースを検証する THEN PR Insights Labeler SHALL `autoCreateLabels`プロパティを含まない
5. WHEN TypeScriptコンパイラが`Config`インターフェースを検証する THEN PR Insights Labeler SHALL `labelColor`プロパティを含まない
6. WHEN TypeScriptコンパイラが`Config`インターフェースを検証する THEN PR Insights Labeler SHALL `labelDescription`プロパティを含まない
7. IF 開発者が`ActionInputs`または`Config`型を使用しようとする THEN TypeScriptコンパイラ SHALL 削除されたプロパティへのアクセスに対してコンパイルエラーを出力する

### 要件3: 入力マッピングロジックの簡素化

**目的**: 開発者として、入力パラメータのパース処理が削除されることで、コードの複雑さを減らしたい

#### 受け入れ基準

1. WHEN `input-mapper.ts`の`mapActionInputsToConfig`関数が呼び出される THEN PR Insights Labeler SHALL `auto_create_labels`のパース処理を実行しない
2. WHEN `input-mapper.ts`の`mapActionInputsToConfig`関数が呼び出される THEN PR Insights Labeler SHALL `label_color`のパース処理を実行しない
3. WHEN `input-mapper.ts`の`mapActionInputsToConfig`関数が呼び出される THEN PR Insights Labeler SHALL `label_description`のパース処理を実行しない
4. WHERE `parseBoolean`関数が`auto_create_labels`に対して呼び出されていた箇所 THE PR Insights Labeler SHALL 該当する関数呼び出しを含まない
5. IF `mapActionInputsToConfig`が正常に完了する THEN 返される`Config`オブジェクト SHALL `autoCreateLabels`, `labelColor`, `labelDescription`プロパティを含まない

### 要件4: ラベル適用ロジックの固定化

**目的**: ユーザーとして、Directory-Based Labeling機能が有効なときに、ラベルが存在しない場合は自動的に固定のデフォルト値で作成されることで、完全な自動化を実現したい

#### 受け入れ基準

1. WHEN `label-applicator.ts`の`applyDirectoryLabels`関数が呼び出される THEN PR Insights Labeler SHALL 常に`autoCreate: true`でラベル作成を試みる
2. WHEN ラベルが存在せず作成が必要な場合 THEN PR Insights Labeler SHALL 固定色`cccccc`を使用してラベルを作成する
3. WHEN ラベルが存在せず作成が必要な場合 THEN PR Insights Labeler SHALL 空文字列`""`を説明として使用してラベルを作成する
4. WHERE `ApplyOptions`インターフェースが使用されている箇所 THE PR Insights Labeler SHALL `autoCreate`プロパティを削除し、常に`true`として動作する
5. WHERE `ApplyOptions`インターフェースが使用されている箇所 THE PR Insights Labeler SHALL `labelColor`プロパティを削除し、固定値`cccccc`を使用する
6. WHERE `ApplyOptions`インターフェースが使用されている箇所 THE PR Insights Labeler SHALL `labelDescription`プロパティを削除し、固定値`""`を使用する
7. IF `createMissingLabels`関数が呼び出される THEN PR Insights Labeler SHALL `options`パラメータなしで固定値のみを使用してラベルを作成する
8. WHEN ラベル作成が成功する THEN PR Insights Labeler SHALL `core.info`でラベル作成の成功をログ出力する
9. IF ラベル作成が権限不足やレート制限で失敗する THEN PR Insights Labeler SHALL エラー情報を`ApplyResult`の`failed`配列に記録し、処理を継続する

### 要件5: テストコードの更新

**目的**: 開発者として、既存のテストが新しい動作を正しく検証することで、リグレッションを防ぎたい

#### 受け入れ基準

1. WHEN `input-mapper.test.ts`が実行される THEN PR Insights Labeler SHALL 削除された3つの入力パラメータに関するテストケースを含まない
2. WHEN `label-applicator.test.ts`が実行される THEN PR Insights Labeler SHALL `autoCreate: false`を使用するテストケースを含まない
3. WHEN `label-applicator.test.ts`の新しいテストが実行される THEN PR Insights Labeler SHALL ラベルが存在しない場合に固定値`cccccc`と`""`で自動作成されることを検証する
4. WHEN 統合テスト（`integration.test.ts`）が実行される THEN PR Insights Labeler SHALL `auto_create_labels`パラメータを使用しないDirectory-Based Labelingのシナリオを検証する
5. IF テストスイート全体が実行される THEN PR Insights Labeler SHALL すべてのテストがエラーなく成功する
6. WHERE モックオブジェクトで`ApplyOptions`を使用している箇所 THE PR Insights Labeler SHALL 削除されたプロパティ（`autoCreate`, `labelColor`, `labelDescription`）を含まない

### 要件6: ドキュメントの更新

**目的**: ユーザーとして、ドキュメントが最新の動作を正確に反映することで、混乱なく機能を利用したい

#### 受け入れ基準

1. WHEN ユーザーが`README.md`のDirectory-Based Labelingセクションを読む THEN PR Insights Labeler SHALL `auto_create_labels`入力パラメータの説明を含まない
2. WHEN ユーザーが`README.md`のDirectory-Based Labelingセクションを読む THEN PR Insights Labeler SHALL `label_color`入力パラメータの説明を含まない
3. WHEN ユーザーが`README.md`のDirectory-Based Labelingセクションを読む THEN PR Insights Labeler SHALL `label_description`入力パラメータの説明を含まない
4. WHEN ユーザーがDirectory-Based Labelingの動作説明を読む THEN ドキュメント SHALL ラベルが存在しない場合に自動的に作成されることを明記する
5. WHEN ユーザーがデフォルト値の説明を読む THEN ドキュメント SHALL ラベル色が`cccccc`、説明が空文字列であることを明記する
6. WHERE 既存のワークフロー例が`auto_create_labels`を使用している箇所 THE ドキュメント SHALL 該当パラメータを削除した更新版のワークフロー例を提供する
7. IF プロジェクトに他のドキュメントファイル（例: `.kiro/specs/directory-based-labeler/requirements.md`）が存在する THEN 関連する箇所 SHALL 削除された入力パラメータへの言及を削除または更新する

### 要件7: 後方互換性の確保

**目的**: ユーザーとして、既存のワークフローが削除されたパラメータを使用していても、動作が継続することで、スムーズな移行を実現したい

#### 受け入れ基準

1. IF 既存のワークフローが`auto_create_labels: true`を指定している THEN PR Insights Labeler SHALL エラーを出さずに動作を継続し、常にラベルを自動作成する
2. IF 既存のワークフローが`auto_create_labels: false`を指定している THEN PR Insights Labeler SHALL エラーを出さずに動作を継続し、常にラベルを自動作成する（`false`の指定は無視される）
3. IF 既存のワークフローが`label_color`や`label_description`を指定している THEN PR Insights Labeler SHALL エラーを出さずに動作を継続し、固定値（color: `cccccc`, description: `""`）を使用する
4. WHEN ワークフローが削除された入力パラメータ（`auto_create_labels`/`label_color`/`label_description`）を指定している THEN GitHub Actionsプラットフォーム SHALL 未知入力の警告を出す可能性があるが、PR Insights Labeler SHALL エラーを出さずに実行を継続し、ラベル自動作成を常に有効として動作する
5. WHERE ユーザーが新しいバージョンにアップグレードする THE PR Insights Labeler SHALL 既存のワークフローファイルを変更しなくても正常に動作する

### 要件8: エラーハンドリングの維持

**目的**: 開発者として、既存のエラーハンドリングパターン（neverthrowの`Result<T, E>`型）が維持されることで、コードの堅牢性を保ちたい

#### 受け入れ基準

1. WHEN `applyDirectoryLabels`関数がエラーに遭遇する THEN PR Insights Labeler SHALL `Result<ApplyResult, Error>`型でエラーを返す
2. IF ラベル作成がGitHub API権限不足で失敗する THEN PR Insights Labeler SHALL `PermissionError`型のエラーを返す
3. IF ラベル作成がレート制限で失敗する THEN PR Insights Labeler SHALL `RateLimitError`型のエラーを返す
4. WHEN 部分的な失敗（一部ラベル作成成功、一部失敗）が発生する THEN PR Insights Labeler SHALL `ApplyResult`の`applied`と`failed`配列に適切に記録する
5. WHERE エラーハンドリングロジックが存在する箇所 THE PR Insights Labeler SHALL 削除されたパラメータに関連する分岐処理を含まない
