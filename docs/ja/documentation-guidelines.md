# 📚 ドキュメント管理ガイドライン

**最終更新**: 2025-11-30
**対象**: 開発者・コントリビューター
**タグ**: `category/documentation`, `audience/developer`

## 📋 概要

本文書では、PR Insights Labeler プロジェクトのドキュメント管理体系、タグ分類システム、メタデータ形式の統一ルールを定義します。

## 🏷️ タグ体系

タグは以下の接頭辞付き形式を使用します：`category/値`, `audience/値`, `environment/値`

### カテゴリタグ (`category/`)

- `category/documentation` - ドキュメント管理関連
- `category/action` - GitHub Action定義・設定
- `category/api` - GitHub API・Octokit関連
- `category/development` - 開発ガイド・設定
- `category/testing` - テスト戦略・実装
- `category/deployment` - リリース・デプロイメント
- `category/cicd` - CI/CD・GitHub Actions
- `category/security` - セキュリティ・認証
- `category/operations` - 運用・メンテナンス
- `category/cc-sdd` - cc-sdd関連ドキュメント

### 対象者タグ (`audience/`)

- `audience/developer` - 開発者向け
- `audience/contributor` - コントリビューター向け
- `audience/user` - エンドユーザー向け
- `audience/maintainer` - メンテナー向け

### 環境タグ (`environment/`)

- `environment/development` - 開発環境
- `environment/testing` - テスト環境
- `environment/production` - 本番環境（GitHub Actions実行時）

## 📝 メタデータ形式

全ドキュメントは以下の形式でメタデータを記載します：

```markdown
# [アイコン] [タイトル]

**最終更新**: YYYY-MM-DD
**対象**: [読者層]
**タグ**: `category/値`, `audience/値`, `environment/値`
```

### 必須項目

- **最終更新**: YYYY-MM-DD形式（ISO 8601）
- **対象**: 対象読者を日本語で明記（複数可）
- **タグ**: 最低1つのカテゴリタグと1つの対象者タグを含む

### アイコンガイド

- 📚 ドキュメント・ガイドライン
- 🎯 プロジェクト概要・目的
- 🚀 クイックスタート・セットアップ
- 📝 仕様・設計
- 🛠 開発・実装
- 🧪 テスト関連
- 📦 リリース・デプロイ
- 🔧 設定・カスタマイズ
- 🐛 トラブルシューティング
- 🤝 コントリビューション
- 📊 メトリクス・分析
- 🔐 セキュリティ

## 📁 ドキュメント構成

### ディレクトリ構造

```
pr-labeler/
├── README.md                # プロジェクト概要（英語）
├── README.ja.md             # プロジェクト概要（日本語）
├── docs/
│   ├── README.md            # 言語別インデックス
│   ├── assets/              # 共有画像
│   ├── en/                  # 英語ドキュメント
│   │   ├── configuration.md
│   │   ├── advanced-usage.md
│   │   ├── labeling-rules.md
│   │   ├── categories.md
│   │   ├── troubleshooting.md
│   │   ├── API.md           # 翻訳準備中のスタブ
│   │   └── release-process.md # 翻訳準備中のスタブ
│   └── ja/                  # 日本語ドキュメント
│       ├── advanced-usage.md
│       ├── labeling-rules.md
│       ├── API.md
│       ├── release-process.md
│       ├── marketplace-release.md
│       ├── i18n-error-migration-guide.md
│       └── documentation-guidelines.md
├── .claude/
│   └── commands/       # cc-sddコマンドドキュメント
└── .specify/
    ├── spec.md         # 機能仕様書
    ├── plan.md         # 実装計画書
    └── tasks.md        # タスクリスト
```

### ファイル命名規則

- **小文字とハイフン**: `kebab-case.md` 形式を使用
- **説明的な名前**: 内容が明確に分かる名前を付ける
- **言語**: 英語ファイル名、日本語コンテンツ

## 📊 現在のドキュメント一覧

| ファイル名 | 言語 | タグ | 概要 | ステータス |
| ----------------------------------------------- | ---- | ------------------------------------------------------------------------- | ------------------------------------------ | ----------- |
| README.md | EN | `category/documentation`, `audience/user` | プロジェクト概要・使用方法 | ✅ 作成済 |
| README.ja.md | JA | `category/documentation`, `audience/user` | プロジェクト概要・使用方法（日本語） | ✅ 作成済 |
| docs/README.md | EN/JA | `category/documentation`, `audience/user`, `audience/developer` | 言語別インデックス | ✅ 作成済 |
| CLAUDE.md | EN | `category/documentation`, `audience/developer`, `environment/development` | Claude Code協働ガイド | ✅ 作成済 |
| docs/en/configuration.md | EN | `category/action`, `audience/user`, `audience/developer` | Action設定ガイド | ✅ 作成済 |
| docs/en/advanced-usage.md | EN | `category/action`, `audience/developer` | 高度な使用例（英語） | ✅ 作成済 |
| docs/en/labeling-rules.md | EN | `category/documentation`, `audience/developer`, `audience/contributor` | ラベル判定サマリ（英語） | ✅ 作成済 |
| docs/en/categories.md | EN | `category/documentation`, `audience/developer`, `audience/maintainer` | カテゴリラベル詳細 | ✅ 作成済 |
| docs/en/troubleshooting.md | EN | `category/operations`, `audience/user`, `audience/developer` | トラブルシューティング（英語） | ✅ 作成済 |
| docs/en/API.md | EN | `category/api`, `audience/developer`, `environment/development` | API参照（翻訳準備中スタブ） | 📝 翻訳準備中 |
| docs/en/release-process.md | EN | `category/deployment`, `audience/maintainer` | リリース手順（翻訳準備中スタブ） | 📝 翻訳準備中 |
| docs/ja/advanced-usage.md | JA | `category/action`, `audience/developer` | 高度な使用例（日本語） | ✅ 作成済 |
| docs/ja/labeling-rules.md | JA | `category/documentation`, `audience/developer`, `audience/contributor` | ラベル判定サマリ（日本語） | ✅ 作成済 |
| docs/ja/API.md | JA | `category/api`, `audience/developer`, `environment/development` | API仕様書 | ✅ 作成済 |
| docs/ja/release-process.md | JA | `category/deployment`, `audience/maintainer` | リリース手順 | ✅ 作成済 |
| docs/ja/marketplace-release.md | JA | `category/deployment`, `audience/maintainer`, `environment/production` | Marketplace公開手順 | ✅ 作成済 |
| docs/ja/i18n-error-migration-guide.md | JA | `category/development`, `audience/developer` | i18n移行ガイド | ✅ 作成済 |
| docs/ja/documentation-guidelines.md | JA | `category/documentation`, `audience/developer` | ドキュメント管理体系 | ✅ 作成済 |
| .specify/spec.md | EN | `category/cc-sdd`, `audience/developer` | 機能仕様書 | ⏳ 随時更新 |
| .specify/plan.md | EN | `category/cc-sdd`, `audience/developer` | 実装計画書 | ⏳ 随時更新 |
| .specify/tasks.md | EN | `category/cc-sdd`, `audience/developer` | タスク管理 | ⏳ 随時更新 |

### ステータス凡例

- ✅ 作成済 - 完成・運用中
- 📝 計画中 - 作成予定
- ⏳ 随時更新 - cc-sddワークフローで自動更新

## 🔄 更新ルール

### 1. ドキュメント更新時

- `最終更新`日付を必ず更新
- 重要な変更は更新履歴セクションに記録
- 関連ドキュメントがある場合は相互参照を確認

### 2. 新規ドキュメント作成時

- 本ガイドラインのメタデータ形式に従う
- ドキュメント一覧表に追加
- CLAUDE.mdの関連ドキュメントセクションを更新（必要な場合）

### 3. タグの新規追加

- 既存のタグで表現できない場合のみ追加
- 本文書のタグ体系セクションを更新
- 既存ドキュメントへの影響を確認

## 🌐 多言語ドキュメント管理

### README同期手順

**README.md（英語）を更新した場合**:

1. README.ja.md（日本語）を同じ構造で更新する
2. セクション順序を完全に一致させる
3. アンカーIDを同期させる：
   - 日本語: `<a id="使用方法"></a>`
   - ハイフン付き: `<a id="-使用方法"></a>` （GitHubの絵文字付き見出し自動スラッグ対応）
   - 英語: `<a id="usage"></a>`
4. 言語選択リンクを確認する
5. 両ファイルの行数が大きく乖離していないことを確認する（±10%以内推奨）

**README.ja.md（日本語）を更新した場合**:

- 上記の逆順で README.md（英語）を更新する

### action.yml同期手順

**action.yml の inputs セクションを更新した場合**:

1. `docs/en/configuration.md` の Input Parameters セクションを更新する
2. 以下の内容を同期させる：
   - パラメータ名
   - 必須/任意の区分
   - デフォルト値
   - 説明文
3. 新規パラメータの場合：
   - 適切なカテゴリ（Basic Limits, Label Settings, etc.）に追加
   - 使用例を記載
   - Advanced Usage に詳細な使用例を追加（必要な場合）

**action.yml の outputs セクションを更新した場合**:

1. `docs/en/configuration.md` の Output Variables セクションを更新する
2. 変数名、型、説明、例を同期させる

### 新機能追加時のドキュメント更新要件

新機能を追加する際は、以下のドキュメントを更新する必要があります：

**必須**:

1. **README.md / README.ja.md**: 新機能の概要を Key Features に追加
2. **docs/en/configuration.md**: 新規入力パラメータ/出力変数を追加
3. **CHANGELOG.md**: 変更内容を記録

**推奨**:

1. **docs/en/advanced-usage.md**: 実践的な使用例を追加
2. **docs/en/troubleshooting.md**: 想定される問題と解決策を追加
3. **action.yml**: description を更新（機能変更の場合）

**チェックリスト**:

- [ ] README.md と README.ja.md を同期更新
- [ ] action.yml と docs/en/configuration.md を同期更新
- [ ] 新機能の使用例を docs/en/advanced-usage.md に追加
- [ ] トラブルシューティング情報を追加（該当する場合）
- [ ] CHANGELOG.md に変更を記録
- [ ] 全ドキュメント内のリンクが正しく動作することを確認

### docs/ の多言語構成

- 英語ドキュメントは `docs/en/`、日本語ドキュメントは `docs/ja/` に配置する
- 各ドキュメント冒頭に言語リンクを配置する  
  - 例（英語版）: `**Languages**: English | [日本語](../ja/advanced-usage.md)`  
  - 例（日本語版）: `**言語**: [English](../en/advanced-usage.md) | 日本語`
- 新規ドキュメント追加フロー:
  1. 英語版を `docs/en/` に作成し、メタデータとタグを付与
  2. 日本語版がある場合は `docs/ja/` に作成し、相互に言語リンクを追加
  3. 翻訳未完の場合はスタブ（翻訳準備中の旨を明記）を反対言語に配置し、docs/README.md と本一覧を更新
  4. 共有画像は `docs/assets/` に配置して両言語から参照する
- README.md / README.ja.md から各言語の主要ドキュメントへリンクする
- 既存パスからの参照がある場合は、新パスへのリンク更新またはリダイレクト用スタブを置く

## 📏 ドキュメントサイズ管理

### 推奨サイズ

- **理想**: 300行以内
  - 素早く全体を把握可能
  - Claude Codeが効率的に処理可能

- **許容**: 500行以内
  - 詳細な技術文書として適切
  - 読みやすさを維持

- **上限**: 1000行
  - これを超える場合は分割を検討
  - セクション単位でファイル分離

### 分割基準

ドキュメントが大きくなりすぎた場合：

1. **機能別分割**: 異なる機能は別ファイルへ
2. **対象者別分割**: ユーザー向けと開発者向けを分離
3. **詳細度別分割**: 概要と詳細リファレンスを分離

## 🔍 品質チェック項目

### 作成時チェック

- [ ] メタデータ（更新日、対象、タグ）が記載されている
- [ ] 適切なアイコンが使用されている
- [ ] 目次が必要な場合は含まれている
- [ ] コード例が動作することを確認済み
- [ ] 関連ドキュメントへのリンクが正しい

### 定期レビュー

- **月次**: アクティブなドキュメントの内容確認
- **四半期**: 全ドキュメントのメタデータ更新
- **リリース時**: バージョン依存の内容を更新

## 📝 Markdown記法ガイド

### 推奨する記法

```markdown
# 見出しレベル1（ファイルに1つ）
## 見出しレベル2（主要セクション）
### 見出しレベル3（サブセクション）

**重要な情報**は太字
*強調*は斜体
`コード`はバッククォート

- 箇条書き
  - ネストは2スペース

1. 番号付きリスト
2. 自動採番を活用

> 引用や注意事項

\`\`\`typescript
// コードブロックは言語を指定
const example = "code";
\`\`\`
```

### 避けるべき記法

- HTML タグの直接使用（必要最小限に）
- 過度なネスト（3階層まで）
- 画像の多用（必要な図表のみ）
- 外部リンクの過多（公式ドキュメントのみ）

## 🤖 AI協働の考慮事項

### Claude Code最適化

- 明確な構造化でAIの理解を支援
- タグシステムでコンテキスト把握を容易に
- 一貫したフォーマットで処理効率向上

### プロンプトフレンドリー

- セクション見出しは検索しやすい名前に
- コード例は完全で実行可能な形で記載
- エラーメッセージは正確にコピー

## 🔄 更新履歴

- **2025-11-30**: 英語/日本語ディレクトリ構成に再編し、全ドキュメントにメタデータと言語リンクを追加
  - docs/README.md を追加してインデックス化
  - docs/en/, docs/ja/ へのファイル移動とスタブ作成を完了
  - ドキュメント一覧表を言語別に更新
- **2025-10-22**: README簡素化に伴う多言語ドキュメント管理セクション追加
  - README同期手順追加
  - action.yml同期手順追加
  - 新機能追加時のドキュメント更新要件追加
  - docs/の多言語化計画追加
- **2025-10-15**: 初版作成、基本的なガイドライン策定

---

**メンテナー**: jey3dayo | **ライセンス**: MIT | **リポジトリ**: [jey3dayo/pr-insights-labeler](https://github.com/jey3dayo/pr-insights-labeler)
