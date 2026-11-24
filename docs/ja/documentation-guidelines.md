# 📚 ドキュメント管理ガイドライン

**対象**: 開発者・コントリビューター
**タグ**: `category/documentation`, `audience/developer`

## 📋 概要

このガイドラインでは、PR Insights Labeler におけるドキュメント構成、タグ分類、メタデータ形式、および更新ルールを定めています。

## 🏷️ タグ体系

タグは `category/値`、`audience/値`、`environment/値` の接頭辞付き形式で記載します。

### カテゴリタグ (`category/`)

- `category/documentation` - ドキュメント管理関連
- `category/action` - GitHub Action の定義・設定
- `category/api` - GitHub API・Octokit 関連
- `category/development` - 開発ガイド・設定
- `category/testing` - テスト戦略・実装
- `category/deployment` - リリース・デプロイメント
- `category/cicd` - CI/CD・GitHub Actions
- `category/security` - セキュリティ・認証
- `category/operations` - 運用・メンテナンス
- `category/cc-sdd` - cc-sdd 関連ドキュメント

### 対象者タグ (`audience/`)

- `audience/developer` - 開発者向け
- `audience/contributor` - コントリビューター向け
- `audience/user` - エンドユーザー向け
- `audience/maintainer` - メンテナー向け

### 環境タグ (`environment/`)

- `environment/development` - 開発環境
- `environment/testing` - テスト環境
- `environment/production` - 本番環境（GitHub Actions 実行時）

## 📝 メタデータ形式

すべてのドキュメントの冒頭に、次の形式でメタデータを記載します。

```markdown
# [アイコン] [タイトル]

**対象**: [読者層]
**タグ**: `category/値`, `audience/値`, `environment/値`
```

### 必須項目

- **対象**: 想定読者を日本語で明記します（複数指定できます）
- **タグ**: カテゴリタグと対象者タグをそれぞれ1つ以上含めます

最終更新日は記載しません。git 履歴が正確な情報源であり、手書きの日付は更新漏れによって古くなりやすいためです。

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
│   │   └── ...              # API/Releaseはメンテナ向けのためJAのみで可（翻訳不要）
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

- **小文字とハイフン**: `kebab-case.md` 形式を使用します
- **説明的な名前**: ファイル名から内容が分かるように命名します
- **言語**: ファイル名は英語にし、本文を対象言語で記述します

## 📊 現在のドキュメント一覧

| ファイル名                            | 言語  | タグ                                                                      | 概要                                 | ステータス  |
| ------------------------------------- | ----- | ------------------------------------------------------------------------- | ------------------------------------ | ----------- |
| README.md                             | EN    | `category/documentation`, `audience/user`                                 | プロジェクト概要・使用方法           | ✅ 作成済   |
| README.ja.md                          | JA    | `category/documentation`, `audience/user`                                 | プロジェクト概要・使用方法（日本語） | ✅ 作成済   |
| docs/README.md                        | EN/JA | `category/documentation`, `audience/user`, `audience/developer`           | 言語別インデックス                   | ✅ 作成済   |
| AGENTS.md                             | EN    | `category/documentation`, `audience/developer`, `environment/development` | Claude Code 協働ガイド               | ✅ 作成済   |
| docs/en/configuration.md              | EN    | `category/action`, `audience/user`, `audience/developer`                  | Action 設定ガイド                    | ✅ 作成済   |
| docs/en/advanced-usage.md             | EN    | `category/action`, `audience/developer`                                   | 高度な使用例（英語）                 | ✅ 作成済   |
| docs/en/labeling-rules.md             | EN    | `category/documentation`, `audience/developer`, `audience/contributor`    | ラベル判定サマリ（英語）             | ✅ 作成済   |
| docs/en/categories.md                 | EN    | `category/documentation`, `audience/developer`, `audience/maintainer`     | カテゴリラベル詳細                   | ✅ 作成済   |
| docs/en/troubleshooting.md            | EN    | `category/operations`, `audience/user`, `audience/developer`              | トラブルシューティング（英語）       | ✅ 作成済   |
| docs/ja/advanced-usage.md             | JA    | `category/action`, `audience/developer`                                   | 高度な使用例（日本語）               | ✅ 作成済   |
| docs/ja/labeling-rules.md             | JA    | `category/documentation`, `audience/developer`, `audience/contributor`    | ラベル判定サマリ（日本語）           | ✅ 作成済   |
| docs/ja/API.md                        | JA    | `category/api`, `audience/developer`, `environment/development`           | API 仕様書                           | ✅ 作成済   |
| docs/ja/release-process.md            | JA    | `category/deployment`, `audience/maintainer`                              | リリース手順                         | ✅ 作成済   |
| docs/ja/marketplace-release.md        | JA    | `category/deployment`, `audience/maintainer`, `environment/production`    | Marketplace 公開手順                 | ✅ 作成済   |
| docs/ja/i18n-error-migration-guide.md | JA    | `category/development`, `audience/developer`                              | i18n 移行ガイド                      | ✅ 作成済   |
| docs/ja/documentation-guidelines.md   | JA    | `category/documentation`, `audience/developer`                            | ドキュメント管理体系                 | ✅ 作成済   |
| .specify/spec.md                      | EN    | `category/cc-sdd`, `audience/developer`                                   | 機能仕様書                           | ⏳ 随時更新 |
| .specify/plan.md                      | EN    | `category/cc-sdd`, `audience/developer`                                   | 実装計画書                           | ⏳ 随時更新 |
| .specify/tasks.md                     | EN    | `category/cc-sdd`, `audience/developer`                                   | タスク管理                           | ⏳ 随時更新 |

### ステータス凡例

- ✅ 作成済 - 整備・運用中です
- 📝 計画中 - 今後作成予定です
- ⏳ 随時更新 - cc-sdd ワークフローで随時更新されます

## 🔄 更新ルール

### 1. ドキュメントを更新するとき

- 大きな方針変更や構成変更を行った場合は、更新履歴セクションに記録します
- 関連ドキュメントがある場合は、相互参照やリンク切れがないか確認します

### 2. 新しいドキュメントを作成するとき

- このガイドラインのメタデータ形式に従って記述します
- 上記のドキュメント一覧表に行を追加します
- 必要に応じて `AGENTS.md` の関連ドキュメント記載を更新します

### 3. タグを新しく追加するとき

- 既存のタグでは表現できない場合にのみ追加します
- このガイドラインの「タグ体系」セクションに説明を追記します
- 既存ドキュメントへの影響がないか確認します

## 🌐 多言語ドキュメント管理

### README の同期手順

#### `README.md`（英語）を更新した場合

1. `README.ja.md`（日本語）を同じ構成で更新します
2. セクションの順序を完全に一致させます
3. アンカー ID を同期させます
   - 日本語: `<a id="使用方法"></a>`
   - ハイフン付き: `<a id="-使用方法"></a>`（GitHub の絵文字付き見出しの自動スラッグ対応）
   - 英語: `<a id="usage"></a>`
4. 言語選択リンクが正しく機能するか確認します
5. 両ファイルの行数が大きく乖離していないか確認します（±10% 以内を推奨します）

#### `README.ja.md`（日本語）を更新した場合

- 上記と同じ観点で `README.md`（英語）との整合性を確認し、必要に応じて更新します

### `action.yml` との同期手順

#### `action.yml` の `inputs` セクションを更新した場合

1. `docs/en/configuration.md` の Input Parameters セクションを更新します
2. 次の項目を `action.yml` と一致させます
   - パラメータ名
   - 必須 / 任意の区分
   - デフォルト値
   - 説明文
3. 新規パラメータを追加した場合は、以下もあわせて対応します
   - 適切なカテゴリ（Basic Limits、Label Settings など）に追加します
   - 使用例を記載します
   - 必要に応じて `docs/en/advanced-usage.md` に応用例を追加します

#### `action.yml` の `outputs` セクションを更新した場合

1. `docs/en/configuration.md` の Output Variables セクションを更新します
2. 変数名、型、説明、使用例を一致させます

### 新機能追加時のドキュメント更新要件

新機能を追加する際は、次のドキュメントを更新します。

#### 必須

1. `README.md` / `README.ja.md`: 新機能の概要を主要機能一覧に追加します
2. `docs/en/configuration.md`: 新規の入力パラメータや出力変数を追記します
3. `CHANGELOG.md`: 変更内容を記録します

#### 推奨

1. `docs/en/advanced-usage.md`: 実践的な使用例を追加します
2. `docs/en/troubleshooting.md`: 想定される問題と解決策を追記します
3. `action.yml`: 仕様変更に合わせて `description` を更新します

#### チェックリスト

- [ ] `README.md` と `README.ja.md` を同期更新しています
- [ ] `action.yml` と `docs/en/configuration.md` を同期更新しています
- [ ] 新機能の使用例を `docs/en/advanced-usage.md` に追加しています
- [ ] トラブルシューティング情報を追加しています（該当する場合）
- [ ] `CHANGELOG.md` に変更を記録しています
- [ ] すべてのドキュメント内リンクが正しく動作することを確認しています

### `docs/` の多言語構成

- 英語ドキュメントは `docs/en/`、日本語ドキュメントは `docs/ja/` に配置します
- 各ドキュメントの冒頭に言語切り替えリンクを配置します
  - 例（英語版）: `**Languages**: English | [日本語](../ja/advanced-usage.md)`
  - 例（日本語版）: `**言語**: [English](../en/advanced-usage.md) | 日本語`
- 利用者向けドキュメントは英語（`docs/en/`）を正典とし、日本語版はそれに追従します。メンテナー向けドキュメントは日本語のみで問題ありません（翻訳は不要です）
- 新規ドキュメントは次の手順で追加します
  1. 利用者向け: 英語版を `docs/en/` に作成し、メタデータとタグを付与します。日本語版も用意する場合は `docs/ja/` に作成し、相互に言語リンクを追加します
  2. メンテナー向け: `docs/ja/` にのみ作成して問題ありません（英語版は不要です）
  3. 利用者向けで日本語版がない場合はスタブページを作らず、`docs/README.md` の Translation Gaps 表と追跡 Issue に記録します（翻訳は任意のため、中身のないページを置くと索引とリンクだけが増えて読者を迷わせてしまいます）
  4. 共有画像は `docs/assets/` に配置し、両言語から参照します
- `README.md` / `README.ja.md` から各言語の主要ドキュメントへリンクします
- 既存パスから参照されているファイルを移動した場合は、参照元のリンクを更新するか、移行用の案内を置きます

## 📏 ドキュメントサイズ管理

### 推奨サイズ

- **理想**: 300 行以内
  - 全体を素早く把握できます
  - AI アシスタントも効率よく読み込めます

- **許容**: 500 行以内
  - 詳細な技術文書として読みやすさを保てる範囲です

- **上限**: 1,000 行
  - これを超える場合は、セクション単位でのファイル分割を検討します

### 分割の基準

ドキュメントが長くなりすぎた場合は、次の観点で分割します。

1. 機能別分割: 独立した機能ごとに別ファイルへ分けます
2. 対象者別分割: 利用者向けと開発者向けを分離します
3. 詳細度別分割: 概要ガイドと詳細リファレンスを分離します

## 🔍 品質チェック項目

### 作成時のチェック

- [ ] メタデータ（対象、タグ）が記載されています
- [ ] 適切なアイコンが使用されています
- [ ] 長いドキュメントには目次が含まれています
- [ ] コード例が正しく動作することを確認済みです
- [ ] 関連ドキュメントへのリンクが正しく機能します

### 定期レビュー

- **月次**: アクティブなドキュメントの内容が実装と合っているか確認します
- **四半期**: すべてのドキュメントのメタデータや構成を見直します
- **リリース時**: バージョンに依存する記述を更新します

## 📝 Markdown 記法ガイド

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

- HTML タグの直接使用（必要最小限にとどめます）
- 過度なネスト（3階層までに抑えます）
- 画像の多用（理解を助ける図表のみに絞ります）
- 外部リンクの過多（公式ドキュメントなど信頼できる参照先に絞ります）

## 🤖 AI 協働における考慮事項

### AI ツール向けの最適化

- 見出しや階層を明確にして構造を把握しやすくします
- タグ体系を統一してコンテキスト検索を容易にします
- フォーマットを揃えて読み取り精度を高めます

### 検索しやすい記述の工夫

- セクション見出しには具体的で検索しやすい言葉を使います
- コード例は省略しすぎず、そのまま動かせる形で記載します
- エラーメッセージは実際の出力を正確に転記します

## 🔄 更新履歴

- **2025-11-30**: 英語/日本語ディレクトリ構成に再編し、全ドキュメントにメタデータと言語リンクを追加
  - `docs/README.md` を追加してインデックス化
  - `docs/en/`, `docs/ja/` へのファイル移動とスタブ作成を完了
  - ドキュメント一覧表を言語別に更新
- **2025-10-22**: README 簡素化に伴う多言語ドキュメント管理セクションを追加
  - README 同期手順を追加
  - `action.yml` 同期手順を追加
  - 新機能追加時のドキュメント更新要件を追加
  - `docs/` の多言語化計画を追加
- **2025-10-15**: 初版作成、基本的なガイドラインを策定

---

**メンテナー**: jey3dayo | **ライセンス**: MIT | **リポジトリ**: [jey3dayo/pr-insights-labeler](https://github.com/jey3dayo/pr-insights-labeler)
