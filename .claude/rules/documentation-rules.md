---
paths:
  - "docs/**"
  - "README.md"
  - "README.ja.md"
---

# Documentation Rules

## 目的と範囲

- ドキュメントのメタデータ形式、言語同期、配置ルールを定義し、docsとrulesの役割を分離する。

## メタデータ

- 冒頭にタイトル＋対象＋タグを記載（docs/ja/documentation-guidelines.mdに準拠）。`category/`と`audience/`タグを最低1つずつ含める。
- 最終更新日は手書きしない。git履歴が正確な情報源であり、手書きの日付は必ず腐るため。
- アイコンは内容に合わせて選択（📚, 🚀, 🧪, 📦など）。

## 配置と命名

- 言語別に `docs/en/`, `docs/ja/` へ配置。ファイル名はkebab-case、英語名を使用。
- 画像は `docs/assets/` に置き、相対リンクで参照する。

## 同期ルール

- 英日でセクション構造を揃え、README/主要ガイドは両言語を更新する。差分がある場合はTODOか翻訳待ち注記を入れる。
- action.ymlの入力変更時は `docs/en/configuration.md` と関連ガイドを即座に同期し、該当ルール（labeling-and-config.md）も更新する。

## docsとrulesの線引き

- 規約・必須チェック項目・閾値など守るべきガイドラインは`.claude/rules/`に抜粋する。
- 手順詳細・長文解説・スクリーンショットは`docs/`に残し、rulesからリンクで参照する。
