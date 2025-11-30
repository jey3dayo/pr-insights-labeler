# 🚢 リリース手順

**最終更新**: 2025-11-30
**対象**: メンテナー
**タグ**: `category/deployment`, `audience/maintainer`

**言語**: [English](../en/release-process.md) | 日本語

このドキュメントは、PR Insights Labelerの新バージョンをリリースする手順を説明します。

## 📋 目次

- [自動化リリース（推奨）](#自動化リリース推奨)
- [バージョニング戦略](#バージョニング戦略)
- [リリース前チェックリスト](#リリース前チェックリスト)
- [手動リリース手順](#手動リリース手順)
- [GitHub Releaseの作成](#github-releaseの作成)
- [ロールバック手順](#ロールバック手順)
- [トラブルシューティング](#トラブルシューティング)

---

## 自動化リリース（推奨）

`/release` コマンドを使用すると、リリースプロセス全体を自動化できます。

### 基本使用方法

```bash
# パッチリリース (v1.0.1 → v1.0.2)
/release patch

# マイナーリリース (v1.0.1 → v1.1.0)
/release minor

# メジャーリリース (v1.0.1 → v2.0.0)
/release major

# ドライラン（実行せず確認のみ）
/release patch --dry-run
```

### 自動実行される内容

1. ✅ **リリース前チェック**: lint/test/build の自動実行
2. ✅ **バージョン計算**: 現在のバージョンから次のバージョンを自動計算
3. ✅ **ドキュメント更新**: package.json と CHANGELOG.md を自動更新
4. ✅ **コミット作成**: `chore: release vX.Y.Z` で自動コミット
5. ✅ **タグ作成**: vX.Y.Z と vX タグを自動作成・更新
6. ✅ **プッシュ**: main ブランチとタグを自動プッシュ
7. ✅ **GitHub Release**: リリースノートを自動生成・公開

### 詳細

詳細な使用方法とオプションは [.claude/commands/release.md](../.claude/commands/release.md) を参照してください。

---

## バージョニング戦略

このプロジェクトは[Semantic Versioning 2.0.0](https://semver.org/)に従います。

### バージョン番号の形式: `MAJOR.MINOR.PATCH`

- **MAJOR**: 互換性のないAPI変更
- **MINOR**: 後方互換性のある機能追加
- **PATCH**: 後方互換性のあるバグ修正

### 例

- `1.0.0` → `1.0.1`: バグ修正のみ（PATCH）
- `1.0.0` → `1.1.0`: 新機能追加（MINOR）
- `1.0.0` → `2.0.0`: 破壊的変更（MAJOR）

---

## リリース前チェックリスト

リリース前に以下の項目を確認してください：

### 1. コード品質

- [ ] すべてのテストが成功している（`pnpm test`）

  ```bash
  pnpm test
  # 期待: All tests passed
  ```

- [ ] 型チェックが通っている（`pnpm type-check`）

  ```bash
  pnpm type-check
  # 期待: No errors
  ```

- [ ] Lintエラーがない（`pnpm lint`）

  ```bash
  pnpm lint
  # 期待: No errors or warnings
  ```

- [ ] フォーマットが適用されている（`pnpm format:check`）

  ```bash
  pnpm format:check
  # 期待: All files formatted correctly
  ```

### 2. ビルド

- [ ] ビルドが成功している（`pnpm build`）

  ```bash
  pnpm build
  # 期待: dist/index.js が生成される
  ```

- [ ] `dist/`ディレクトリがコミットされている

  ```bash
  git status dist/
  # 期待: dist/index.js が追跡されている
  ```

### 3. ドキュメント

- [ ] `CHANGELOG.md`が更新されている
- [ ] `README.md`の使用例が最新である
- [ ] 新機能の説明が追加されている（該当する場合）

### 4. 動作確認

- [ ] 実際のGitHub Actionsワークフローで動作確認済み
- [ ] 主要な機能シナリオをテスト済み
  - ラベル付け
  - コメント投稿
  - Summary出力
  - 違反検出

---

## 手動リリース手順

以下は手動でリリースを行う場合の手順です。自動化リリースを使用する場合は、[自動化リリース（推奨）](#自動化リリース推奨)を参照してください。

### Step 1: バージョン番号の決定

変更内容に基づいて新しいバージョン番号を決定します：

```bash
# 現在のバージョンを確認
cat package.json | grep version
```

### Step 2: CHANGELOG.md の更新

新しいバージョンのエントリを追加：

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- 新機能の説明

### Changed
- 変更内容の説明

### Fixed
- バグ修正の説明

[X.Y.Z]: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/vX.Y.Z
```

### Step 3: package.json のバージョン更新

```bash
# 手動で編集
vim package.json

# または npm version コマンドを使用
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

### Step 4: ビルド実行

```bash
# 依存関係のインストール（必要に応じて）
pnpm install

# ビルド
pnpm build

# dist/の変更を確認
git status dist/
```

### Step 5: コミット

```bash
# 変更をステージング
git add package.json CHANGELOG.md dist/

# コミット（コミットメッセージ例）
git commit -m "chore: release v1.0.0"
```

### Step 6: タグの作成

```bash
# 具体的なバージョンタグを作成（vプレフィックスを付ける）
git tag -a v1.0.0 -m "Release v1.0.0"

# メジャーバージョンタグを作成・更新（重要！）
git tag -f v1 v1.0.0^{}

# タグを確認
git tag -l "v1*"
```

**重要**: GitHub Actionsで `@v1` を使用できるようにするため、メジャーバージョンタグ（例: v1, v2）を必ず更新してください。

### Step 7: プッシュ

```bash
# コミットとタグをプッシュ
git push origin main
git push origin v1.0.0

# メジャーバージョンタグを強制プッシュ
git push origin v1 --force
```

---

## GitHub Releaseの作成

### リリースノートのテンプレート

リリースノートは統一されたフォーマットに従ってください。詳細は [.github/RELEASE_TEMPLATE.md](../.github/RELEASE_TEMPLATE.md) を参照してください。

**標準フォーマット:**

```markdown
## 🚀 What's New

### ✨ Added
- 新機能の説明

### 🔄 Changed
- 変更内容の説明

### 🐛 Fixed
- バグ修正の説明

## 📊 Quality Metrics

- ✅ [N] tests passing
- ✅ 0 ESLint errors/warnings
- ✅ 0 TypeScript type errors
- ✅ Build successful

## 🔗 Full Changelog

**Full Changelog**: https://github.com/jey3dayo/pr-insights-labeler/compare/v[PREVIOUS]...v[CURRENT]
```

**参考例**: [v1.5.0 Release](https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.5.0)

### 自動化スクリプト使用時

`scripts/release.sh` を使用する場合、リリースノートは自動的にテンプレート形式で生成されます：

```bash
# インタラクティブリリース（推奨）
./scripts/release.sh

# または /release コマンド
/release patch
```

### Web UIでの作成（手動）

1. GitHubリポジトリページにアクセス
2. 「Releases」タブをクリック
3. 「Draft a new release」ボタンをクリック
4. 以下の情報を入力：
   - **Tag version**: `v1.0.0`（既存のタグを選択）
   - **Release title**: `v1.0.0`
   - **Description**: [.github/RELEASE_TEMPLATE.md](../.github/RELEASE_TEMPLATE.md) のフォーマットに従って記述
5. 「Publish release」をクリック

### CLIでの作成（GitHub CLI使用）

```bash
# GitHub CLIをインストール（未インストールの場合）
brew install gh

# 認証
gh auth login

# テンプレートに従ってリリースノートを作成
# 1. CHANGELOG.mdから内容を取得
# 2. .github/RELEASE_TEMPLATE.mdのフォーマットに変換
# 3. リリース作成
gh release create v1.0.0 \
  --title "v1.0.0" \
  --notes "$(cat release-notes.md)"  # テンプレートに従った内容
```

---

## ロールバック手順

リリース後に問題が発覚した場合のロールバック手順：

### 1. GitHub Releaseの取り下げ

```bash
# Web UIで削除するか、CLIを使用
gh release delete v1.0.0 --yes
```

### 2. Gitタグの削除

```bash
# ローカルのタグを削除
git tag -d v1.0.0

# リモートのタグを削除
git push origin :refs/tags/v1.0.0
```

### 3. コミットの取り消し（必要に応じて）

```bash
# 最新コミットを取り消す（ローカルのみ）
git reset --hard HEAD~1

# 強制プッシュ（注意！）
git push origin main --force
```

### 4. ホットフィックスのリリース

問題を修正した後、新しいパッチバージョンをリリース：

```bash
# 例: 1.0.0 に問題があった場合 → 1.0.1 をリリース
npm version patch
pnpm build
git commit -am "fix: critical bug in v1.0.0"
git tag -a v1.0.1 -m "Release v1.0.1 (hotfix)"
git push origin main --tags
```

---

## トラブルシューティング

### ビルドエラー

**症状**: `pnpm build` が失敗する

**解決策**:

```bash
# node_modulesを削除して再インストール
rm -rf node_modules
pnpm install

# キャッシュをクリア
pnpm store prune

# 再ビルド
pnpm build
```

### テスト失敗

**症状**: テストが失敗する

**解決策**:

```bash
# テストを詳細モードで実行
pnpm test -- --reporter=verbose

# 特定のテストのみ実行
pnpm test -- path/to/test.test.ts

# カバレッジレポートを確認
pnpm test:coverage
```

### タグが既に存在する

**症状**: `git tag` で "already exists" エラー

**解決策**:

```bash
# 既存のタグを削除
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# 新しいタグを作成
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### GitHub Releaseが作成できない

**症状**: `gh release create` が失敗する

**解決策**:

```bash
# GitHub CLIの認証状態を確認
gh auth status

# 再認証
gh auth login

# リリース作成を再試行
gh release create v1.0.0 --title "v1.0.0" --notes "..."
```

### dist/が更新されていない

**症状**: `dist/index.js` が古いまま

**解決策**:

```bash
# dist/を削除して再ビルド
rm -rf dist/
pnpm build

# 変更を確認
git diff dist/index.js

# コミット
git add dist/
git commit -m "chore: rebuild dist/"
```

---

## 参考リンク

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [GitHub CLI Manual](https://cli.github.com/manual/)

---

## メンテナ向けメモ

### 定期的なメンテナンス

- **依存関係の更新**: 月次で `pnpm update` を実行
- **セキュリティ監査**: `pnpm audit` で脆弱性をチェック
- **TypeScript/Node.jsバージョンアップ**: 年次で最新LTSへ移行検討

### リリース頻度の目安

- **PATCH**: バグ修正は即座にリリース
- **MINOR**: 新機能は1-2週間ごとにまとめてリリース
- **MAJOR**: 破壊的変更は慎重に、十分な告知期間を設ける
