# Requirements Document

## Project Description (Input)

PR Insights Labelerにしたいな
versionあげてね

## Introduction

本機能では、現在の「PR Labeler」プロダクト名を「PR Insights Labeler」に改名し、バージョンを適切にインクリメントします。この改名により、プロダクトの価値提案である「PRに対する包括的な分析と洞察（insights）の提供」をより明確に表現します。

改名の範囲は以下の通りです：

- プロダクト名の統一的な更新（コード、ドキュメント、設定ファイル）
- バージョンの適切なインクリメント
- GitHub Actions Marketplaceでの公開情報の更新
- 既存機能への影響を最小限に抑える後方互換性の維持

## Requirements

### Requirement 1: プロダクト名の統一的更新

**Objective:** As a プロジェクトメンテナー, I want プロダクト名を「PR Insights Labeler」に統一的に更新する, so that プロダクトの価値提案を正確に伝えることができる

#### Acceptance Criteria

1. WHEN 改名作業を実施する THEN PR Insights Labeler SHALL action.ymlのname・descriptionフィールドを新プロダクト名に更新する
2. WHEN 改名作業を実施する THEN PR Insights Labeler SHALL package.jsonのname・description・keywordsを新プロダクト名に更新する
3. WHEN 改名作業を実施する THEN PR Insights Labeler SHALL README.md・README.ja.mdの全プロダクト名参照を新プロダクト名に更新する
4. WHEN 改名作業を実施する THEN PR Insights Labeler SHALL CHANGELOG.mdに改名の変更履歴を記録する
5. WHEN 改名作業を実施する THEN PR Insights Labeler SHALL .kiro/steering/product.mdのプロダクト説明を新プロダクト名に更新する
6. WHEN 改名作業を実施する THEN PR Insights Labeler SHALL .kiro/steering/structure.mdのプロダクト名参照を新プロダクト名に更新する（ただしルート名はpr-labeler/のまま維持する）
7. WHEN 改名作業を実施する THEN PR Insights Labeler SHALL .kiro/steering/tech.mdのプロダクト名参照を新プロダクト名に更新する
8. WHEN 改名作業を実施する THEN PR Insights Labeler SHALL docs/配下の全ドキュメントのプロダクト名参照を新プロダクト名に更新する
9. WHEN コメント内にプロダクト名が記載されている THEN PR Insights Labeler SHALL ソースコード内のコメントのプロダクト名を新プロダクト名に更新する
10. WHEN 改名作業を実施する THEN PR Insights Labeler SHALL src/locales/en/*.jsonの全"PR Labeler"参照を"PR Insights Labeler"に更新する
11. WHEN 改名作業を実施する THEN PR Insights Labeler SHALL src/locales/ja/*.jsonの全"PR Labeler"参照を"PR Insights Labeler"に更新する
12. WHEN 改名作業を実施する THEN PR Insights Labeler SHALL .github/workflows/*.ymlのjob nameやステップ名のプロダクト名参照を新プロダクト名に更新する

### Requirement 2: バージョン管理とリリース準備

**Objective:** As a プロジェクトメンテナー, I want バージョンを適切にインクリメントする, so that セマンティックバージョニングに従ったリリースを行うことができる

#### Acceptance Criteria

1. WHEN 改名によりマイナーバージョンをインクリメントする THEN PR Insights Labeler SHALL package.jsonのversionフィールドを次のマイナーバージョンに更新する
2. WHEN バージョンを更新する THEN PR Insights Labeler SHALL CHANGELOG.mdに新バージョンのエントリーを追加する
3. WHEN CHANGELOG.mdを更新する THEN PR Insights Labeler SHALL 改名に関する変更内容を明記する
4. WHEN CHANGELOG.mdを更新する THEN PR Insights Labeler SHALL リリース日付をYYYY-MM-DD形式（Keep a Changelog標準形式）で記録する
5. IF バージョンが更新される THEN PR Insights Labeler SHALL pnpm buildを実行してdist/を再生成する

### Requirement 3: GitHub Actions Marketplaceでの公開情報更新

**Objective:** As a ユーザー, I want GitHub Actions Marketplaceで新しいプロダクト名と説明を確認できる, so that プロダクトの目的を正確に理解できる

#### Acceptance Criteria

1. WHEN action.ymlが更新される THEN PR Insights Labeler SHALL brandingセクションのicon・colorを維持する
2. WHEN action.ymlが更新される THEN PR Insights Labeler SHALL 新しいdescriptionがプロダクトの価値提案「PRの包括的な分析と洞察の提供」を反映する
3. WHEN GitHubにプッシュされる THEN PR Insights Labeler SHALL GitHub Actions Marketplaceで新プロダクト名が表示される

### Requirement 4: ドキュメント整合性の確保

**Objective:** As a ユーザー, I want 全ドキュメントで一貫したプロダクト名を確認できる, so that 混乱なくプロダクトを利用できる

#### Acceptance Criteria

1. WHEN README.mdを更新する THEN PR Insights Labeler SHALL タイトル・バッジ・説明・使用例の全てで新プロダクト名を使用する
2. WHEN README.ja.mdを更新する THEN PR Insights Labeler SHALL 英語版READMEと同じセクション構成を維持する
3. WHEN README.ja.mdを更新する THEN PR Insights Labeler SHALL 日本語版でも全プロダクト名参照を新プロダクト名に更新する
4. WHEN docs/配下のドキュメントを更新する THEN PR Insights Labeler SHALL API.md・advanced-usage.md・configuration.md等の全ファイルで新プロダクト名を使用する
5. WHEN ドキュメントを更新する THEN PR Insights Labeler SHALL 旧プロダクト名「PR Labeler」への参照を全て新プロダクト名に置換する

### Requirement 5: 後方互換性の維持

**Objective:** As a 既存ユーザー, I want 改名後も既存のワークフロー設定を変更せずに使用できる, so that 移行コストを最小限に抑えることができる

#### Acceptance Criteria

1. WHEN プロダクト名が変更される THEN PR Insights Labeler SHALL 既存のGitHub Actions入力パラメータを全て維持する
2. WHEN プロダクト名が変更される THEN PR Insights Labeler SHALL 既存のラベル命名規則（size/\*, complexity/\*, category/\*, risk/\*）を全て維持する
3. WHEN プロダクト名が変更される THEN PR Insights Labeler SHALL 既存の設定ファイル形式（.github/pr-labeler.yml, .github/directory-labeler.yml）を全て維持する
4. WHEN プロダクト名が変更される THEN PR Insights Labeler SHALL 既存のコメント投稿・サマリー出力の機能を全て維持する
5. IF ユーザーが既存のワークフロー設定を使用する THEN PR Insights Labeler SHALL エラーなく動作する

### Requirement 6: テストとビルドの検証

**Objective:** As a プロジェクトメンテナー, I want 改名後も全てのテストが成功する, so that 品質を保証できる

#### Acceptance Criteria

1. WHEN 改名作業が完了する THEN PR Insights Labeler SHALL pnpm lintが成功する
2. WHEN 改名作業が完了する THEN PR Insights Labeler SHALL pnpm type-checkが成功する
3. WHEN 改名作業が完了する THEN PR Insights Labeler SHALL pnpm test:vitestが全テストを成功させる
4. WHEN 改名作業が完了する THEN PR Insights Labeler SHALL pnpm buildがエラーなくdist/index.jsを生成する
5. IF 既存のテストケースでプロダクト名を参照している THEN PR Insights Labeler SHALL テストケース内のプロダクト名参照を新プロダクト名に更新する
6. WHEN テストスナップショットにプロダクト名が含まれている THEN PR Insights Labeler SHALL pnpm test:vitest -u でスナップショットを更新する

### Requirement 7: Kiroステアリングドキュメントの更新

**Objective:** As a AI開発アシスタント, I want ステアリングドキュメントで新プロダクト名を認識できる, so that 今後の開発で正しいプロダクト名を使用できる

#### Acceptance Criteria

1. WHEN .kiro/steering/product.mdを更新する THEN PR Insights Labeler SHALL プロダクト名セクションを新プロダクト名に更新する
2. WHEN .kiro/steering/product.mdを更新する THEN PR Insights Labeler SHALL updated_atタイムスタンプを実装時の実際の日時（ISO 8601形式）に更新する
3. WHEN .kiro/steering/structure.mdを更新する THEN PR Insights Labeler SHALL プロダクト名参照を全て新プロダクト名に更新する（ただしルート名pr-labeler/は変更しない）
4. WHEN .kiro/steering/tech.mdを更新する THEN PR Insights Labeler SHALL プロダクト名参照を全て新プロダクト名に更新する
5. WHEN .kiro/steering/tech.mdを更新する THEN PR Insights Labeler SHALL updated_atタイムスタンプを実装時の実際の日時（ISO 8601形式）に更新する

### Requirement 8: リリースノートの作成

**Objective:** As a ユーザー, I want リリースノートで改名の詳細を確認できる, so that 変更内容を理解できる

#### Acceptance Criteria

1. WHEN CHANGELOG.mdに新バージョンエントリーを追加する THEN PR Insights Labeler SHALL Keep a Changelog形式（### Changed）で「プロダクト名をPR Insights Labelerに改名」を記載する
2. WHEN CHANGELOG.mdに新バージョンエントリーを追加する THEN PR Insights Labeler SHALL 「既存機能への影響なし（後方互換性維持）」を明記する
3. WHEN CHANGELOG.mdに新バージョンエントリーを追加する THEN PR Insights Labeler SHALL リリース日付をYYYY-MM-DD形式で記録する
4. WHEN gitコミットメッセージを作成する THEN PR Insights Labeler SHALL Conventional Commits形式でchoreカテゴリを使用する（例: "chore: rename product to PR Insights Labeler"）
5. WHEN GitHub Releaseを作成する THEN PR Insights Labeler SHALL CHANGELOG.mdの新バージョンエントリーをリリースノートに転記する
