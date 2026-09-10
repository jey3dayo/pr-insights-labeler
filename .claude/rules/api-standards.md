---
paths:
  - "src/api/**"
  - "src/**/*.api.ts"
  - "docs/ja/API.md"
---

# API Standards

## 目的と範囲

- PR Insights Labelerに関わるAPI層の入力検証・レスポンス形式・i18n運用を統一する。

## 入力検証

- すべての入力は型定義とバリデーションをセットで実装する（型だけで満足しない）。フォーマット/範囲/単調性をチェックする。
- 閾値系パラメータ（size/complexity/riskなど）は負値禁止、単調性を強制。エラー文言はdocs/ja/API.mdを正典として同期。
- JSON文字列入力（例: `size_thresholds`）はparseエラーを明示的に返す。

## レスポンス/エラー設計

- エラーはコード＋説明＋修正ヒントを含める。GitHub Actionとして扱いやすい短文を優先。
- 例外は握りつぶさず、失敗理由をログに残しつつ安全なメッセージを返す。

## i18n方針

- language優先度チェーン（入力 > 環境 > デフォルト）をdocsと合わせる。未指定時はデフォルト言語を使用。
- ランタイムメッセージ（`src/locales/`）は英日を同期し、ja版を正典として英訳する。`docs/ja/API.md` はメンテナ向けのためjaのみで可。

## ドキュメント同期

- API変更時は `docs/ja/API.md` を更新する（英訳は不要）。利用者向けの挙動が変わる場合は `docs/en/configuration.md` も同期する。更新箇所をrulesにも箇条書きで反映する。
