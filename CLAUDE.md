# Claude Code Spec-Driven Development

Kiro-style Spec Driven Development implementation using claude code slash commands, hooks and agents.

## Project Context

### Paths

- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`
- Commands: `.claude/commands/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications

- `actions-summary-output`: GitHub Actions Summary出力機能 - PR分析結果をActions Summaryに表示
- `pr-insights-labeler`: PRに対する自動ラベル付与機能（PR Insights Labeler）
- `code-complexity-analysis`: コード複雑度分析機能 - ESLint標準complexityルールによるPR内のコード複雑度評価
- `expand-default-category-labels`: デフォルトカテゴリラベル拡張機能 - config/spec/dependencies等の新カテゴリ追加
- `selective-label-enabling`: ラベル種別の選択的有効化機能 - size/complexity/category/riskを個別にON/OFF可能にし、input設計を統一
- `i18n-support`: 多言語対応機能 - 出力メッセージ、エラーメッセージ、設定ファイルの英語・日本語対応
- `label-based-workflow-failure`: ラベルベースワークフロー失敗制御機能 - 適用されたラベルに基づいて個別にワークフロー失敗を制御
- `simplify-label-inputs`: ラベル入力簡素化 - `apply_labels`削除、複雑度デフォルトOFF、閾値緩和
- `always-auto-create-labels`: ラベル自動作成の常時有効化 - `auto_create_labels`/`label_color`/`label_description` inputs削除、常にラベル自動作成
- `config-layer-pattern`: Configuration Layerパターン - Config/LabelerConfigの統合、優先順位の明確化、疎結合な設計への移行
- `category-docs-and-new-categories`: カテゴリドキュメント＋新カテゴリ追加 - docs/categories.md作成、category/feature・category/infrastructure追加
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines

- Think in English, but generate responses in Japanese (思考は英語、回答の生成は日本語で行うように)

## Workflow

### Phase 0: Steering (Optional)

`/kiro:steering` - Create/update steering documents
`/kiro:steering-custom` - Create custom steering for specialized contexts

Note: Optional for new features or small additions. You can proceed directly to spec-init.

### Phase 1: Specification Creation

1. `/kiro:spec-init [detailed description]` - Initialize spec with detailed project description
2. `/kiro:spec-requirements [feature]` - Generate requirements document
3. `/kiro:spec-design [feature]` - Interactive: "Have you reviewed requirements.md? [y/N]"
4. `/kiro:spec-tasks [feature]` - Interactive: Confirms both requirements and design review

### Phase 2: Progress Tracking

`/kiro:spec-status [feature]` - Check current progress and phases

### Phase 3: Pull Request & Merge

#### 1. ローカル品質保証

実装完了後、必ず以下を実行してすべて成功することを確認：

```bash
pnpm lint        # コードスタイルチェック
pnpm type-check  # TypeScript型チェック
pnpm test        # 自動テスト実行
pnpm build       # ビルド成功確認
```

**すべてのチェックが成功してから次へ進む**

#### 2. プッシュとCI確認

1. フィーチャーブランチにプッシュ
2. PRを作成（`/create-pr` または `gh pr create --base main --head <branch> --template ".github/pull_request_template.md" --fill` を推奨。`--template` で PR テンプレートを適用し、`--fill` で直近コミットからタイトル/本文を下書き）

   ```bash
   gh pr create \\
     --base main \\
     --head "$(git branch --show-current)" \\
     --template ".github/pull_request_template.md" \\
     --title "docs: <変更内容>" \\
     --fill
   ```

3. **GitHub Actions ワークフローの完了を待機**
4. **重要: すべてのCIチェックが成功するまで待つ**
   - ✅ Code Quality
   - ✅ Integration Tests (Node 20, 22)
   - ✅ Documentation Quality（Markdown変更時）
   - ✅ PR Metrics Self-Check
   - ✅ Quality Gate

**CIチェックが失敗した場合は修正してから再度プッシュ**

#### 3. レビュープロセス

1. レビュアーを指定
2. フィードバックを受ける
3. 必要に応じて修正（Step 1 に戻る）
4. 承認（Approval）を取得

#### 4. マージ実行

**マージ戦略の選択:**

- **`squash`** (推奨): 複数コミットを1つにまとめる
  - 小さな機能追加やバグフィックス
  - コミット履歴を簡潔に保ちたい場合
- **`merge`**: コミット履歴をそのまま保持
  - 重要な開発履歴を残したい場合
  - 複数人での共同作業
- **`rebase`**: 線形な履歴を維持
  - クリーンな履歴を維持したい場合

**マージ後:**

1. フィーチャーブランチを削除
2. mainブランチのCIが成功することを確認

#### 5. リリース（バージョンアップ時）

**セマンティックバージョニングに従う:**

- **Patch** (v1.0.0 → v1.0.1): バグフィックス
- **Minor** (v1.0.0 → v1.1.0): 後方互換性のある新機能
- **Major** (v1.0.0 → v2.0.0): 破壊的変更

**推奨: `/release` コマンド使用（自動化）:**

```bash
# パッチリリース（バグフィックス）
/release patch

# マイナーリリース（新機能）
/release minor

# メジャーリリース（破壊的変更）
/release major

# ドライラン（確認のみ）
/release patch --dry-run
```

**または、手動リリース手順:**

```bash
# mainブランチを最新化
git checkout main
git pull origin main

# バージョンタグを作成
git tag -a v1.0.1 -m "v1.0.1

Bug Fixes:
- 修正内容の説明
"

# メジャーバージョンタグを更新（重要！）
git tag -f v1 v1.0.1^{}

# タグをプッシュ
git push origin v1.0.1
git push origin v1 --force

# GitHub Releaseを作成
gh release create v1.0.1 \
  --title "v1.0.1" \
  --notes "リリースノート"
```

詳細: [docs/release-process.md](docs/release-process.md)

## Development Rules

1. **Consider steering**: Run `/kiro:steering` before major development (optional for new features)
2. **Follow 3-phase approval workflow**: Requirements → Design → Tasks → Implementation
3. **Approval required**: Each phase requires human review (interactive prompt or manual)
4. **No skipping phases**: Design requires approved requirements; Tasks require approved design
5. **Update task status**: Mark tasks as completed when working on them
6. **Keep steering current**: Run `/kiro:steering` after significant changes
7. **Check spec compliance**: Use `/kiro:spec-status` to verify alignment
8. **Local validation first**: Always run `pnpm lint && pnpm type-check && pnpm test && pnpm build` locally before pushing
9. **CI success required**: Never merge PRs until all CI checks pass successfully
10. **Review before merge**: Obtain approval from reviewers before merging to main/develop branches

## Steering Configuration

### Current Steering Files

Managed by `/kiro:steering` command. Updates here reflect command changes.

### Active Steering Files

- `product.md`: Always included - Product context and business objectives
- `tech.md`: Always included - Technology stack and architectural decisions
- `structure.md`: Always included - File organization and code patterns

### Custom Steering Files

<!-- Added by /kiro:steering-custom command -->
<!-- Format:
- `filename.md`: Mode - Pattern(s) - Description
  Mode: Always|Conditional|Manual
  Pattern: File patterns for Conditional mode
-->

### Inclusion Modes

- **Always**: Loaded in every interaction (default)
- **Conditional**: Loaded for specific file patterns (e.g., "\*.test.js")
- **Manual**: Reference with `@filename.md` syntax
