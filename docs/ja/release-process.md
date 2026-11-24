# 🚢 リリース手順

**対象**: メンテナー
**タグ**: `category/deployment`, `audience/maintainer`

**言語**: 日本語（英語版は未整備）

PR Insights Labeler の新バージョンをリリースするための手順書です。

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

`/release` コマンドを使うと、リリース作業を一括で自動化できます。

### 基本的な使い方

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

### 自動で実行される処理

1. ✅ **リリース前チェック**: lint / test / build を自動で実行します
2. ✅ **バージョン計算**: 現在のバージョンから次のバージョン番号を算出します
3. ✅ **ファイル更新**: `package.json` と `CHANGELOG.md` を自動で更新します
4. ✅ **コミット作成**: `chore: release vX.Y.Z` でコミットを作成します
5. ✅ **タグ作成**: `vX.Y.Z` とメジャーバージョンタグ（`vX`）を作成・更新します
6. ✅ **プッシュ**: `main` ブランチとタグをリモートへプッシュします
7. ✅ **GitHub Release 作成**: リリースノートを自動生成して公開します

### 詳細

詳しい使い方とオプションは [.claude/skills/release/SKILL.md](../../.claude/skills/release/SKILL.md) を参照してください。

---

## バージョニング戦略

このプロジェクトは [Semantic Versioning 2.0.0](https://semver.org/) に準拠しています。

### バージョン番号の形式: `MAJOR.MINOR.PATCH`

- **MAJOR**: 後方互換性のない変更
- **MINOR**: 後方互換性のある機能追加
- **PATCH**: 後方互換性のあるバグ修正

### バージョン更新の例

- `1.0.0` → `1.0.1`: バグ修正のみ（PATCH）
- `1.0.0` → `1.1.0`: 新機能の追加（MINOR）
- `1.0.0` → `2.0.0`: 破壊的変更を含む更新（MAJOR）

---

## リリース前チェックリスト

リリース作業を始める前に、以下の項目を確認してください。

### 1. コード品質

- [ ] すべてのテストが成功しています（`pnpm test`）

  ```bash
  pnpm test
  # 期待: All tests passed
  ```

- [ ] 型チェックにエラーがありません（`pnpm type-check`）

  ```bash
  pnpm type-check
  # 期待: No errors
  ```

- [ ] Lint エラーや警告がありません（`pnpm lint`）

  ```bash
  pnpm lint
  # 期待: No errors or warnings
  ```

- [ ] フォーマットが適用されています（`pnpm format:check`）

  ```bash
  pnpm format:check
  # 期待: All files formatted correctly
  ```

### 2. ビルド

- [ ] ビルドが正常に完了しています（`pnpm build`）

  ```bash
  pnpm build
  # 期待: dist/index.js が生成される
  ```

- [ ] `dist/` ディレクトリがコミットされています

  ```bash
  git status dist/
  # 期待: dist/index.js が追跡されている
  ```

### 3. ドキュメント

- [ ] `CHANGELOG.md` が更新されています
- [ ] `README.md` の使用例が最新の内容になっています
- [ ] 新機能の説明がドキュメントに追加されています（該当する場合）

### 4. 動作確認

- [ ] 実際の GitHub Actions ワークフロー上で動作を確認済みです
- [ ] 主要な機能シナリオをテスト済みです
  - ラベル付与
  - コメント投稿
  - Summary 出力
  - 違反検出

---

## 手動リリース手順

手動でリリースを行う際の手順です。自動リリースを使う場合は、[自動化リリース（推奨）](#自動化リリース推奨)を参照してください。

### Step 1: バージョン番号を決定する

変更内容に合わせて、次のバージョン番号を決めます。

```bash
# 現在のバージョンを確認
cat package.json | grep version
```

### Step 2: CHANGELOG.md を更新する

新しいバージョンのエントリを追記します。

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

### Step 3: package.json のバージョンを更新する

`package.json` を直接編集するか、`npm version` コマンドで更新します。

```bash
# 手動で編集
vim package.json

# または npm version コマンドを使用
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

### Step 4: ビルドを実行する

```bash
# 依存関係のインストール（必要に応じて）
pnpm install

# ビルド
pnpm build

# dist/ の変更を確認
git status dist/
```

### Step 5: 変更をコミットする

```bash
# 変更をステージング
git add package.json CHANGELOG.md dist/

# コミット（コミットメッセージ例）
git commit -m "chore: release v1.0.0"
```

### Step 6: タグを作成する

```bash
# 具体的なバージョンタグを作成（vプレフィックスを付ける）
git tag -a v1.0.0 -m "Release v1.0.0"

# メジャーバージョンタグを作成・更新（重要！）
git tag -f v1 v1.0.0^{}

# タグを確認
git tag -l "v1*"
```

**重要**: GitHub Actions で `@v1` のように参照できるようにするため、メジャーバージョンタグ（`v1`、`v2` など）も必ず更新してください。

### Step 7: リモートへプッシュする

```bash
# コミットとタグをプッシュ
git push origin main
git push origin v1.0.0

# メジャーバージョンタグを強制プッシュ
git push origin v1 --force
```

### Step 8: actions.lock を更新する（`v1` を進めた場合）

`released-action-check.yml` は、公開済みの `@v1` を対象にスモークテストを実行します。リリースで `v1` タグを進めたあとに `actions.lock` が古いコミットのまま残っていると、CI は旧バンドルを検証し続けてしまいます。`@v1` のような部分参照（partial ref）は通常の `mise run actions-lock:generate` ではロック先コミットが更新されないため、`actions-lock:relock` を実行してコミットしてください。

```bash
mise run actions-lock:relock
git add .github/workflows/actions.lock
git commit -m "chore: relock actions after v1 release"
git push origin main
```

---

## GitHub Releaseの作成

### リリースノートのテンプレート

リリースノートは統一されたフォーマットで記載してください。詳細は [.github/RELEASE_TEMPLATE.md](../../.github/RELEASE_TEMPLATE.md) を参照してください。

### 標準フォーマット

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

### 自動化スクリプトを使う場合

`scripts/release.sh` を使用すると、テンプレートに沿ったリリースノートが自動で生成されます。

```bash
# インタラクティブリリース（推奨）
./scripts/release.sh

# または /release コマンド
/release patch
```

### Web UI で手動作成する場合

1. GitHub のリポジトリページを開きます
2. 「Releases」タブをクリックします
3. 「Draft a new release」ボタンをクリックします
4. 次の項目を入力します
   - **Tag version**: `v1.0.0`（作成済みのタグを選択します）
   - **Release title**: `v1.0.0`
   - **Description**: [.github/RELEASE_TEMPLATE.md](../../.github/RELEASE_TEMPLATE.md) のフォーマットに沿って記載します
5. 「Publish release」をクリックします

### GitHub CLI で作成する場合

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

リリース後に問題が見つかった場合は、以下の手順でロールバックします。

### 1. GitHub Release を取り下げる

```bash
# Web UIで削除するか、CLIを使用
gh release delete v1.0.0 --yes
```

### 2. Git タグを削除する

```bash
# ローカルのタグを削除
git tag -d v1.0.0

# リモートのタグを削除
git push origin :refs/tags/v1.0.0
```

### 3. コミットを取り消す（必要な場合）

```bash
# 最新コミットを取り消す（ローカルのみ）
git reset --hard HEAD~1

# 強制プッシュ（注意！）
git push origin main --force
```

### 4. ホットフィックスをリリースする

問題を修正したあと、新しいパッチバージョンをリリースします。

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

**症状**: `pnpm build` が失敗します。

#### 解決策

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

**症状**: テストが失敗します。

#### 解決策

```bash
# テストを詳細モードで実行
pnpm test -- --reporter=verbose

# 特定のテストのみ実行
pnpm test -- path/to/test.test.ts

# カバレッジレポートを確認
pnpm test:coverage
```

### タグが既に存在する

**症状**: `git tag` 実行時に "already exists" エラーが発生します。

#### 解決策

```bash
# 既存のタグを削除
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# 新しいタグを作成
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### GitHub Release を作成できない

**症状**: `gh release create` が失敗します。

#### 解決策

```bash
# GitHub CLIの認証状態を確認
gh auth status

# 再認証
gh auth login

# リリース作成を再試行
gh release create v1.0.0 --title "v1.0.0" --notes "..."
```

### `dist/` が更新されていない

**症状**: `dist/index.js` が古い内容のままになっています。

#### 解決策

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

## メンテナー向けメモ

### 定期的なメンテナンス

- **依存関係の更新**: 月に1回、`pnpm update` で依存パッケージを見直します
- **セキュリティ監査**: `pnpm audit` で脆弱性がないか確認します
- **TypeScript / Node.js のバージョンアップ**: 年に1回を目安に、最新の LTS バージョンへの移行を検討します

### リリース頻度の目安

- **PATCH**: バグ修正は準備でき次第すぐにリリースします
- **MINOR**: 新機能は 1〜2 週間ごとにまとめてリリースします
- **MAJOR**: 破壊的変更は事前に十分な告知期間を設け、慎重にリリースします
