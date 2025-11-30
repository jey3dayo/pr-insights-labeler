# README.md 構造分析と移行マッピング

## 📊 現在のREADME.md構造（730行）

### セクション別行数

| セクション | 行数 | 行範囲 | 内容 |
| ----------------------------- | ---- | ------- | ------------------------------------------------------------------------------------ |
| Header | 8 | 1-8 | タイトル、バッジ、説明 |
| 🚀 機能 | 95 | 9-103 | コア機能、PR Insights Labeler、Directory-Based Labeler |
| 📋 使用方法 | 172 | 104-275 | 基本例、実践例、カスタム例、多言語設定 |
| 🔧 入力パラメータ | 102 | 276-377 | 全パラメータ表（基本制限、ラベル設定、動作設定、除外設定、Directory-Based Labeling） |
| 📊 GitHub Actions Summary出力 | 27 | 412-438 | Summary表示内容、サイズ制限、動作説明 |
| 📤 出力変数 | 13 | 439-451 | 出力変数の一覧表 |
| 🏷️ 自動適用ラベル | 34 | 452-485 | 違反ラベル、PR Insights Labelerラベル（サイズ、カテゴリ、リスク） |
| 🔒 必要な権限 | 11 | 486-496 | permissions設定 |
| 📝 高度な使用例 | 201 | 497-697 | フォーク対応、条件付き実行、厳格モード、選択的ラベル有効化、PR Insights Labeler設定 |
| 🎯 デフォルト除外パターン | 15 | 698-712 | 自動除外されるファイルパターン |
| 🤝 コントリビューション | 3 | 713-715 | コントリビューション案内 |
| 📄 ライセンス | 3 | 716-718 | MIT |
| 🙏 謝辞 | 12 | 719-730 | 使用ライブラリ一覧 |

**合計**: 730行

## 🗂️ 新しいドキュメント構造へのマッピング

### 新しいREADME.md (目標235行)

| 新セクション | 行数 | 移行元 | 説明 |
| ----------------------------------------- | ---- | ------------- | ---------------------------------------------- |
| Header + 言語選択 + 移行通知 | 15 | 1-8 + 新規 | バッジ、説明、言語選択、アーカイブリンク |
| 🚀 主要機能 | 20 | 9-103簡略化 | 3-5個の箇条書きに簡素化 |
| 📋 クイックスタート | 35 | 104-193簡略化 | 最小構成例（10-15行）+ Next Steps |
| 🔒 必要な権限 | 15 | 486-496移動 | permissions設定 + アンカー |
| 🏷️ 自動適用ラベル | 25 | 452-485簡略化 | 主要ラベル概要 |
| 🔧 入力パラメータ（プレースホルダー） | 10 | 新規 | Configuration Guideへのリンク + アンカー互換性 |
| 📝 高度な使用例（プレースホルダー） | 10 | 新規 | Advanced Usageへのリンク + アンカー互換性 |
| 📚 ドキュメントリンク | 20 | 新規 | 全ドキュメントへのリンク |
| 🤝 コントリビューション・ライセンス・謝辞 | 20 | 713-730 | フッター情報 |

**予想合計**: 170行 → 追加で65行の余裕あり（詳細な説明やサンプルを追加可能）

### docs/en/configuration.md (新規作成)

| セクション | 移行元 | 内容 |
| ------------------------- | ------- | ---------------------------- |
| Introduction | 新規 | このドキュメントの目的 |
| Input Parameters | 276-377 | 全パラメータ表（カテゴリ別） |
| Label Thresholds Defaults | 378-411 | デフォルト閾値の詳細 |
| GitHub Actions Summary | 412-438 | Summary出力の詳細 |
| Output Variables | 439-451 | 出力変数 |
| Default Exclude Patterns | 698-712 | 除外パターン |
| YAML Config File | 新規 | .github/pr-labeler.yml構造 |

### docs/en/advanced-usage.md (新規作成)

| セクション | 移行元 | 内容 |
| ------------------------ | --------------- | ------------------------ |
| Introduction | 新規 | このドキュメントの目的 |
| Fork PR Handling | 497-523 | pull_request_target使用 |
| Conditional Execution | 524-546 | paths条件、パターン除外 |
| Strict Mode | 547-562 | 厳格チェック |
| Summary Only Mode | 563-579 | ラベル・コメント無効化 |
| Selective Label Enabling | 580-632 | ラベル種別の個別制御 |
| PR Insights Labeler Config | 633-697 | YAML設定の詳細 |
| Directory-Based Labeling | 57-103, 366-377 | ディレクトリベースラベル |
| Multi-language Support | 218-275 | 多言語設定 |

### docs/en/troubleshooting.md (新規作成)

| セクション | 移行元 | 内容 |
| -------------------------- | ------ | ---------------------------------------------- |
| Introduction | 新規 | トラブルシューティングガイド |
| Permission Errors | 新規 | "Resource not accessible by integration"エラー |
| Labels Not Applied | 新規 | ラベル未作成問題 |
| Draft PR Skipped | 新規 | skip_draft_prデフォルトtrue |
| Complexity Analysis Failed | 新規 | 構文エラー問題 |
| File Count Mismatch | 新規 | デフォルト除外パターン |
| Debug Tips | 新規 | デバッグロギング、Summary確認 |
| Support | 新規 | GitHub Issues/Discussionsリンク |

## 🔗 重要なアンカーリンク

### 保持すべきアンカー（外部参照の可能性）

| 日本語アンカー | ハイフン付き | 英語アンカー | 現在の行 | 新しい配置 | 対応方法 |
| ----------------- | ------------------ | ------------------- | -------- | ---------------------- | ------------------------------- |
| `#使用方法` | `#-使用方法` | `#usage` | 104 | README.md Quick Start | 直接セクション |
| `#入力パラメータ` | `#-入力パラメータ` | `#input-parameters` | 276 | docs/en/configuration.md | プレースホルダー + リダイレクト |
| `#高度な使用例` | `#-高度な使用例` | `#advanced-usage` | 497 | docs/en/advanced-usage.md | プレースホルダー + リダイレクト |
| `#必要な権限` | `#-必要な権限` | `#permissions` | 486 | README.md Permissions | 直接セクション |
| `#自動適用ラベル` | `#-自動適用ラベル` | `#labels` | 452 | README.md Labels | 直接セクション |

### アンカー互換性戦略

各プレースホルダーセクションに以下を配置：

```markdown
## 🔧 入力パラメータ

詳細な入力パラメータのドキュメントは [Configuration Guide](docs/en/configuration.md) を参照してください。

<!-- Legacy anchor compatibility -->
<a id="入力パラメータ"></a>
<a id="-入力パラメータ"></a>
<a id="input-parameters"></a>
```

## ✅ タスク1完了チェックリスト

- [x] 現在のREADME.mdの構造を分析（セクション別行数・内容記録）
- [x] 各セクションを新しいドキュメント構造にマッピング
- [x] 重要なアンカーリンクを特定（日本語・英語・ハイフン付き）
- [x] アーカイブ用のGitタグ（`pre-simplification-readme`）を作成

## 📝 次のステップ

タスク2: 詳細ドキュメントの作成

- [ ] 2.1 Configuration Guide（設定ガイド）の作成
- [ ] 2.2 Advanced Usage（高度な使用例）の作成
- [ ] 2.3 Troubleshooting Guide（トラブルシューティングガイド）の作成
