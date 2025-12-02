# 実装計画

## 概要

この実装計画は、PR Insights LabelerプロジェクトのREADME.mdを717行から200-300行に簡素化し、詳細情報を`docs/`ディレクトリに分離することで、ユーザビリティとメンテナンス性を向上させることを目的としています。

## 実装タスク

- [ ] 1. 移行準備と現状分析の実施
  - 現在のREADME.mdの構造を分析し、セクションごとの行数と内容を記録する
  - 各セクションを新しいドキュメント構造（README.md / docs/en/configuration.md / docs/en/advanced-usage.md / docs/en/troubleshooting.md）にマッピングする
  - 保持すべき重要なアンカーリンクを特定し、リスト化する（日本語・英語両方）
  - アーカイブ用のGitタグ（`pre-simplification-readme`）を作成する
  - _要件: 5.1, 5.2, 5.5_

- [ ] 2. 詳細ドキュメントの作成
- [ ] 2.1 Configuration Guide（設定ガイド）の作成
  - 全入力パラメータをカテゴリ別にテーブル形式で整理する（Basic Limits, Label Settings, Selective Label Enabling, Action Settings, Exclusion Settings, Directory-Based Labeling）
  - 各パラメータに必須/任意、デフォルト値、説明、実例を含める
  - GitHub Actions Summary出力と出力変数のセクションを追加する
  - デフォルト除外パターンの詳細を記載する
  - YAMLコンフィグファイル（.github/pr-labeler.yml）の構造と全例を提供する
  - _要件: 3.1, 3.2, 6.1, 6.2, 6.6, 7.3_

- [ ] 2.2 Advanced Usage（高度な使用例）の作成
  - フォークからのPR対応（pull_request_target）の完全なworkflow例を作成する
  - 条件付き実行（特定ラベル/ブランチでスキップ）の完全なworkflow例を作成する
  - 厳格モード（違反時にCI失敗）の完全なworkflow例を作成する
  - Summary出力のみ（ラベル・コメントなし）の完全なworkflow例を作成する
  - 選択的ラベル有効化の複数パターン（デフォルト全有効、一部無効化、カスタム閾値）の完全なworkflow例を作成する
  - カスタムPR Insights Labeler設定（.github/pr-labeler.yml）の完全な例を作成する
  - Directory-Based Labeling設定（.github/directory-labeler.yml）の完全な例を作成する
  - 多言語設定の環境変数/設定ファイルでの指定方法を記載する
  - 各セクションにシナリオ説明、セキュリティ考慮事項、使用タイミングを含める
  - _要件: 3.1, 3.3, 3.4, 3.7, 6.2, 7.2_

- [ ] 2.3 Troubleshooting Guide（トラブルシューティングガイド）の作成
  - 権限エラー（"Resource not accessible by integration"）の問題・原因・解決策を記載する
  - ラベルが適用されない問題（ラベルの事前作成が必要）の問題・原因・解決策を記載する
  - Draft PRスキップの問題（skip_draft_prデフォルトがtrue）の問題・原因・解決策を記載する
  - 複雑度分析失敗の問題（構文エラー）の問題・原因・解決策を記載する
  - ファイル数の不一致の問題（デフォルト除外パターン）の問題・原因・解決策を記載する
  - デバッグのヒント（デバッグロギング、GitHub Actions Summary、ワークフロー構文検証）を記載する
  - サポート情報（GitHub Issues、Discussions）へのリンクを提供する
  - _要件: 3.1, 3.5, 6.1_

- [ ] 3. 新しいREADME.mdの作成
- [ ] 3.1 README.mdの基本構造とヘッダーの作成
  - プロジェクトタイトルとバッジ（License, TypeScript, Test Status, Coverage等）を配置する
  - 簡潔な1行説明を記載する
  - 言語選択リンク（🇬🇧 English / 🇯🇵 日本語）を配置する
  - 移行通知セクション（ドキュメント簡素化、アーカイブリンク）を追加する（1-2リリース後に削除予定）
  - _要件: 1.2, 2.1, 4.1, 4.4, 7.4_

- [ ] 3.2 主要機能とクイックスタートの作成
  - 主要機能を3-5個の箇条書きで簡潔に記載する（Automatic PR Labeling, GitHub Actions Integration, Flexible Configuration, Directory-Based Labeling, Multi-language Support）
  - 最小構成のworkflow例（10-15行）を作成し、コピー＆ペースト可能な完全なサンプルとする
  - ラベル適用の注意事項を記載する（リポジトリに事前にラベルを作成する必要がある、またはDirectory-Based Labelingでラベル自動作成を利用できることを案内）
  - 必要な権限設定（contents: read, pull-requests: write）をworkflow例に含める
  - Next Stepsとして、Configuration GuideとAdvanced Usageへのリンクを配置する
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.1, 7.2_

- [ ] 3.3 プレースホルダーセクションとアンカー互換性の実装
  - Input Parametersプレースホルダーセクションを作成し、Configuration Guideへのリンクと主要パラメータへのクイックリファレンスを配置する
  - HTMLアンカーを追加する：`<a id="入力パラメータ"></a>`, `<a id="-入力パラメータ"></a>`, `<a id="input-parameters"></a>`（GitHubの絵文字付き見出し自動スラッグ対応のため`-入力パラメータ`も必須）
  - Advanced Usageプレースホルダーセクションを作成し、Advanced Usage Guideへのリンクと一般的なシナリオへのリンクを配置する
  - HTMLアンカーを追加する：`<a id="高度な使用例"></a>`, `<a id="-高度な使用例"></a>`, `<a id="advanced-usage"></a>`
  - Required Permissionsセクションにアンカーを追加する：`<a id="必要な権限"></a>`, `<a id="-必要な権限"></a>`, `<a id="permissions"></a>`
  - その他の重要なアンカーを適切な位置に配置する：`<a id="使用方法"></a>`, `<a id="-使用方法"></a>`, `<a id="usage"></a>`, `<a id="自動適用ラベル"></a>`, `<a id="-自動適用ラベル"></a>`, `<a id="labels"></a>`
  - _要件: 5.2, 5.5_

- [ ] 3.4 ドキュメントリンクとフッターの作成
  - Documentation Links セクションを作成し、全ドキュメントへの明確なリンクを配置する（Configuration Guide, Advanced Usage, Troubleshooting, API, Release Process）
  - Contributingセクションを作成し、CONTRIBUTING.mdへのリンクを配置する
  - Licenseセクションを作成し、LICENSEファイルへのリンクを配置する
  - 最終的な行数が200-300行（目標235行程度）に収まることを確認する
  - _要件: 1.1, 1.7, 2.1, 2.2, 7.5_

- [ ] 4. 日本語版README.ja.mdの作成
  - README.mdの全内容を日本語に翻訳する
  - 言語選択リンクを配置する（🇬🇧 English / 🇯🇵 日本語）
  - 全セクション構造をREADME.mdと同期させる
  - アンカー互換性を日本語アンカーで実装する
  - _要件: 4.1, 4.2, 4.4_

- [ ] 5. ドキュメント同期ガイドラインの更新
  - documentation-guidelines.mdまたはCONTRIBUTING.mdに、README.md更新時のREADME.ja.md同期手順を記載する
  - action.yml更新時のdocs/en/configuration.md同期手順を記載する
  - 新機能追加時のドキュメント更新要件を記載する
  - docs/の多言語化時のサブディレクトリ構造（docs/en/, docs/ja/）を記載する
  - _要件: 4.3, 4.5, 6.4_

- [ ] 6. バリデーションとテストの実施
- [ ] 6.1 コンテンツ完全性の検証
  - 元のREADME.mdの全セクション（717行）が新しい構造に完全に移行されたことを確認する
  - 全入力パラメータがdocs/en/configuration.mdに存在することを確認する
  - 全高度な使用例がdocs/en/advanced-usage.mdに存在することを確認する
  - サイドバイサイド比較を行い、情報の欠損がないことを確認する
  - _要件: 3.6, 5.1, 5.4_

- [ ] 6.2 リンクとアンカーの検証
  - 全内部リンク（README.md → docs/, docs/ 間の相互参照）が正しく解決されることを確認する
  - 重要なアンカー（日本語版：#-入力パラメータ, #-使用方法, #-高度な使用例, #-必要な権限, #-自動適用ラベル、英語版：#input-parameters, #usage, #advanced-usage, #permissions, #labels）が機能することを確認する
  - ハイフンなし旧アンカー（#入力パラメータ, #使用方法等）も互換性のため機能することを確認する
  - 外部リンクが有効であることを確認する
  - markdown-link-checkツールを使用して自動検証を実行する
  - _要件: 5.2, 5.3, 5.5_

- [ ] 6.3 フォーマットと品質の検証
  - Markdownシンタックス（markdownlint）が正しいことを確認する
  - コードブロックに適切な言語タグ（yaml, bash等）が適用されていることを確認する
  - テーブルが正しくフォーマットされ、可読性が保たれていることを確認する
  - 見出し構造（H1-H4）が論理的であることを確認する
  - 画像のファイルサイズ（500KB以下）と枚数（3枚以下）を確認する
  - _要件: 6.1, 6.2, 6.6, 非機能要件1_

- [ ] 6.4 クイックスタート例の機能テスト
  - 新しいリポジトリにクイックスタートのworkflow例をコピー＆ペーストする
  - ワークフローを実行し、PRサイズチェック機能が動作することを確認する
  - GitHub Actions Summaryにメトリクスが表示されることを確認する
  - ラベルが正しく適用されることを確認する（ラベル作成後）
  - _要件: 1.4, 1.5, 7.2_

- [ ] 7. 変更記録とPR作成
- [ ] 7.1 CHANGELOG.mdの更新
  - ドキュメント再構成の変更内容を記録する（README.md簡素化、docs/分離、アンカー互換性維持）
  - 移行ガイドまたはIssue #35へのリンクを含める
  - _要件: 非機能要件2_

- [ ] 7.2 Pull Requestの作成と移行アナウンス
  - Pull Requestを作成し、詳細な説明（変更の目的、構造の変化、検証結果）を記載する
  - Issue #35に移行完了のコメントを投稿し、新しいドキュメント構造へのリンクを提供する
  - アーカイブREADME（pre-simplification-readme）へのリンクを提供する
  - _要件: 非機能要件3_

## 実装後のチェックリスト

実装完了後、以下を確認してください：

- [ ] README.md の行数が200-300行に収まっている
- [ ] 全要件（1.1-7.5、非機能要件）が満たされている
- [ ] 破損したリンクがゼロである
- [ ] クイックスタート例がテストリポジトリで動作する
- [ ] ピアレビューの承認を得ている
- [ ] コンテンツの欠損がないことを確認している

## ドキュメント構造の最終イメージ

```
pr-labeler/
├── README.md (English, 235 lines)
├── README.ja.md (Japanese, 235 lines)
├── CHANGELOG.md (Updated)
└── docs/
    ├── configuration.md (New - All input parameters)
    ├── advanced-usage.md (New - Real-world examples)
    ├── troubleshooting.md (New - Common issues)
    ├── API.md (Existing - Unchanged)
    ├── release-process.md (Existing - Unchanged)
    └── documentation-guidelines.md (Updated - Sync guidelines)
```

## 注意事項

- 各タスクは独立して実行可能ですが、順序を守ることで効率的に進められます
- タスク完了時には必ずマークダウンのチェックボックスを更新してください
- 問題や不明点があれば、実装を進める前にチームに相談してください
- 移行通知セクションは1-2リリース後に削除する予定です
