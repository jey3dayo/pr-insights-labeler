# PR Insights Labeler

GitHub Action で PR にサイズ・複雑度・カテゴリ・リスクのラベルを自動付与するプロジェクト。

## Project Context

- ソース: `src/`
- テスト: `__tests__/`
- ドキュメント: 利用者向けは `docs/en/`（正典）、メンテナ向けは `docs/ja/`（英語追従不要）、索引は `docs/README.md`
- Claude Code 設定: `.claude/`（`commands/`, `rules/`, `skills/`）

## Development Guidelines

- Think in English, but generate responses in Japanese（思考は英語、回答の生成は日本語で行う）
- 利用者向けドキュメント（`docs/en/`）は英語が正典、日本語版は追従。メンテナ向けドキュメント（`docs/ja/`）は日本語のみで可

## Workflow

### 1. ローカル品質保証

実装完了後、必ず以下を実行してすべて成功することを確認：

```bash
pnpm lint        # コードスタイルチェック
pnpm type-check  # TypeScript型チェック
pnpm test        # 自動テスト実行
pnpm build       # ビルド成功確認
```

すべてのチェックが成功してから次へ進む。

### 2. プッシュとCI確認

1. フィーチャーブランチにプッシュ
2. PRを作成

   ```bash
   gh pr create \
     --base main \
     --head "$(git branch --show-current)" \
     --template ".github/pull_request_template.md" \
     --title "docs: <変更内容>" \
     --fill
   ```

3. GitHub Actions ワークフローの完了を待機
4. すべてのCIチェックが成功するまで待つ
   - ✅ Code Quality
   - ✅ Integration Tests (Node 22 / Node 24)
   - ✅ Documentation Quality（Markdown変更時）
   - ✅ PR Insights Labeler Self-Check
   - ✅ Quality Gate

CIチェックが失敗した場合は修正してから再度プッシュする。

### 3. レビューとマージ

1. レビュアーを指定し、フィードバックに対応する
2. 承認（Approval）を取得する
3. マージ戦略を選ぶ
   - **`squash`**（推奨）: 小さな機能追加やバグフィックス
   - **`merge`**: 開発履歴を残したい場合
   - **`rebase`**: 線形な履歴を維持したい場合
4. マージ後、フィーチャーブランチを削除し、main の CI 成功を確認する

### 4. リリース（バージョンアップ時）

セマンティックバージョニングに従う。

- **Patch** (v1.0.0 → v1.0.1): バグフィックス
- **Minor** (v1.0.0 → v1.1.0): 後方互換性のある新機能
- **Major** (v1.0.0 → v2.0.0): 破壊的変更

推奨は `/release` コマンド（自動化）。

```bash
/release patch            # バグフィックス
/release minor            # 新機能
/release major            # 破壊的変更
/release patch --dry-run  # 確認のみ
```

手動手順とメジャータグ（`v1`）の更新を含む詳細: [docs/ja/release-process.md](docs/ja/release-process.md)

## Development Rules

1. Local validation first: push 前に `pnpm lint && pnpm type-check && pnpm test && pnpm build` を通す
2. CI success required: すべての CI チェックが成功するまでマージしない
3. Review before merge: main へのマージ前にレビュー承認を得る
4. `dist/` などの生成物を更新する場合は、CI・リリース手順との整合を取る
