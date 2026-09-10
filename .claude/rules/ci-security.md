---
paths:
  - ".github/workflows/**"
  - ".env*"
  - "secrets/**"
  - "action.yml"
---

# CI Security Rules

## 目的と範囲

- CI権限と秘密情報の取り扱いを定義する。

## 権限とイベント

- `pull_request_target`を使う場合はPRのhead SHAでcheckoutし、権限は最小限（pull-requests/issues: write, contents: read）。秘密情報へ書き込まない。
- `GITHUB_TOKEN`は必要最小限のスコープを設定し、外部コールは避ける。

## シークレット管理

- `.env*`やsecret値をリポジトリに含めない。ログにも出さない。
- ラベル自動作成やコメントには書き込み権限が要るが、不要な管理者権限は付与しない。

## CI変更レビュー

- `.github/workflows/**` と `action.yml` の変更はセキュリティ観点レビューを必須とし、リスクラベルが付与された場合は内容を確認してからマージする。
- 署名/検証ステップを削除・緩和する変更は理由をPRに明記する。
