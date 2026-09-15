---
model: sonnet
---

# Release Command - 自動リリース管理システム

GitHub Actionプロジェクトの新バージョンリリースを自動化するコマンドです。

## 🎯 機能

実行フローから読み取りにくい自動処理:

- **Breaking Changes自動検出**: `BREAKING CHANGE:` フッターや `feat!:` 記法から自動検出
- **PR番号自動抽出**: コミットメッセージから `(#123)` 形式のPR番号を自動抽出
- **Contributors自動生成**: git shortlogからコントリビューター一覧を自動生成

## 使用方法

```bash
# パッチリリース (v1.0.1 → v1.0.2)
/release patch

# マイナーリリース (v1.0.1 → v1.1.0)
/release minor

# メジャーリリース (v1.0.1 → v2.0.0)
/release major

# ドライラン（実行せず確認のみ）
/release patch --dry-run

# 自動コミット・プッシュなし（手動制御）
/release minor --no-push
```

## 実行方法について

このコマンドが正本のリリース手順です。`scripts/release.sh` は同じ処理を対話式メニューで行う代替手段で、引数やフラグは受け付けません（対話端末で `./scripts/release.sh` を直接実行し、バージョン種別はメニューから選択する）。非対話環境で `scripts/release.sh` を実行すると、push 前の確認プロンプトで入力が取れず、コミットとタグがローカルに残ったまま終了します。

## 📋 実行フロー

### Phase 1: 現状確認とバージョン計算

1. 現在のバージョンを取得 (`package.json`, `git tag`)
2. 新しいバージョンを計算
3. ワーキングディレクトリの状態確認（未コミット変更のチェック）

### Phase 2: リリース前チェック

自動的に以下を実行：

```bash
pnpm lint        # コードスタイルチェック
pnpm type-check  # TypeScript型チェック
pnpm test        # テスト実行
pnpm build       # ビルド実行
```

### いずれか1つでも失敗した場合、リリースを中止します

### Phase 3: ドキュメント更新

1. package.json の更新
   - `version` フィールドを新バージョンに更新

2. CHANGELOG.md の更新
   - 新バージョンのエントリを先頭に追加
   - リリース日を自動設定
   - 最近のコミットから変更内容を自動抽出

### CHANGELOG.md 生成ロジック

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- feat: で始まるコミット

### Changed
- refactor: で始まるコミット

### Fixed
- fix: で始まるコミット

### Other
- その他のコミット

[X.Y.Z]: https://github.com/USER/REPO/releases/tag/vX.Y.Z
```

### Phase 4: Git操作

1. 変更をコミット

   ```bash
   git add package.json CHANGELOG.md dist/
   git commit -m "chore: release vX.Y.Z"
   ```

2. タグ作成

   ```bash
   # 具体的なバージョンタグ
   git tag -a vX.Y.Z -m "Release vX.Y.Z"

   # メジャーバージョンタグの更新
   git tag -f vX vX.Y.Z^{}
   ```

3. プッシュ（実装時は「実装コマンド」手順 7 の承認ゲートを経てから実行する）

   ```bash
   git push origin main
   git push origin vX.Y.Z
   git push origin vX --force
   ```

### Phase 5: GitHub Release作成

GitHub CLI (`gh`) を使用してリリースを作成する。リリースノートの**レイアウト**は `.github/RELEASE_TEMPLATE.md` を正本とし、ここには再掲しない。テスト数は `pnpm vitest run` の結果から、Contributors は `git shortlog -s -n vPREV..HEAD` から取得する。

コミットの分類（prefix → セクションの対応表）も `.github/RELEASE_TEMPLATE.md` の `### 🚀 What's New` 節を正本とし、ここには再掲しない。`git log vPREV..HEAD --pretty=format:"%s"` で取得したコミットを、その対応表に従って分類する。`scripts/release.sh` の `generate_changelog` も同じ対応表で実装している。

- `## 🚀 What's New` は変更種別に関わらず常に置き、該当のない小見出しは省略する

### Phase 6: メジャーバージョンRelease更新

メジャーバージョンタグ（v1, v2など）のGitHub Releaseも更新する。

```bash
gh release edit vX \
  --title "vX (Latest vX.x)" \
  --notes "最新のvX.Y.Zを指すフローティングタグの説明"
```

### vX Release の内容

- 現在のバージョン番号（vX.Y.Z）
- 最新リリースの変更内容概要
- 使用方法（`@vX` タグの推奨）
- 最近のバージョン履歴

### なぜ必要か

- ユーザーが `@v1` タグを使用している場合、最新のv1.xが自動適用される。v1 Releaseページが古いバージョンを指していると混乱を招くため、メジャーバージョンタグの更新は省略できない手順とする
- メジャーバージョンの最新情報を一箇所で確認できる利便性がある

## 🛡️ エラーハンドリング

- リリース前チェック（lint/type-check/test/build）が失敗した場合、何も変更せずに終了する
- タグ作成に失敗した場合（既存タグと重複等）、コミットをロールバックし package.json・CHANGELOG.md を元に戻す。既存タグを消して撮り直す場合は `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`（リモートのタグ削除は戻しにくいので、対象タグ名を確認してから実行する）
- プッシュに失敗した場合、コミットとタグはローカルに残るため、手動プッシュ（`git push origin main && git push origin vX.Y.Z && git push origin vX --force`）かロールバック（`git reset --hard HEAD~1 && git tag -d vX.Y.Z vX`）を案内する

## 🔧 オプション

### `--dry-run`

実際には変更せず、実行内容のみを表示：

```bash
/release patch --dry-run
```

バージョン更新・ドキュメント更新・コミット・タグ作成・プッシュ・GitHub Release作成の各操作の実行予定内容を表示するのみで、実際には変更しない。

### `--no-push`

コミット・タグ作成まで実行し、プッシュは手動で行う：

```bash
/release minor --no-push
```

### 実行内容

- ✅ リリース前チェック
- ✅ ドキュメント更新
- ✅ コミット作成
- ✅ タグ作成
- ⏸️ プッシュはスキップ

### 手動プッシュ

```bash
git push origin main
git push origin vX.Y.Z vX --force
gh release create vX.Y.Z
gh release edit vX --title "vX (Latest vX.x)" --notes "..."
```

最後の `gh release edit vX` を忘れない（Phase 6 と同じ理由で省略できない手順）。

### `--skip-checks`

リリース前チェックをスキップ（非推奨）：

```bash
/release patch --skip-checks
```

品質保証が行われていないため、本番環境での使用は推奨されません。

### `--force`

既存タグを強制的に上書き：

```bash
/release patch --force
```

### 動作

- 既存の vX.Y.Z タグを削除
- 新しいタグを作成
- リモートに強制プッシュ

## 📝 関連ドキュメント

- [docs/ja/release-process.md](../../docs/ja/release-process.md) - 手動リリース手順
- [CHANGELOG.md](../../CHANGELOG.md) - リリース履歴
- [Semantic Versioning](https://semver.org/) - バージョニング規約

---

## 実装コマンド

あなたは `/release` コマンドを実行しています。

### 手順

1. 現状確認
   - 現在のバージョンを確認
   - ワーキングディレクトリの状態確認
   - ブランチ確認（mainブランチであることを確認）
   - `git pull origin main` で remote と同期する。`scripts/release.sh` も fetch/pull を行わないため、
     古い main の上でタグを打つ経路がどちらの系統でも塞がっていない

2. バージョンタイプ確認
   - 引数から bump_type を取得 (patch/minor/major)
   - 新しいバージョンを計算

3. リリース前チェック（--skip-checks でスキップ可能）

   ```bash
   pnpm lint && pnpm type-check && pnpm test && pnpm build
   ```

4. ドキュメント更新
   - package.json の version フィールド更新
   - CHANGELOG.md に新エントリ追加（前回タグからのコミット履歴を分析）

5. コミット作成

   ```bash
   git add package.json CHANGELOG.md dist/
   git commit -m "chore: release vX.Y.Z"
   ```

6. タグ作成

   ```bash
   # 具体的なバージョンタグ
   git tag -a vX.Y.Z -m "Release vX.Y.Z"

   # メジャーバージョンタグを更新
   git tag -f vX vX.Y.Z^{}
   ```

7. プッシュ前確認とプッシュ（--no-push でスキップ可能）

   push 前に、作成したバージョン・タグ・変更内容を提示してユーザーの承認を得る。`--no-push` 指定時はここで終了する（`scripts/release.sh` も同じ位置で確認を取っており、実行経路によって安全性が変わらないようにするため）。

   ```bash
   git push origin main
   git push origin vX.Y.Z
   git push origin vX --force
   ```

8. GitHub Release作成

   リリースノートの書式は `.github/RELEASE_TEMPLATE.md` を正本とする。`git log vPREV..HEAD --pretty=format:"%s"` でコミットを分類し、テンプレートに従ってリリースノートを生成すること。

   テスト数の取得:

   ```bash
   pnpm vitest run 2>&1 | grep "Tests " | grep -oP '\d+ passed'
   ```

   Contributorsの取得:

   ```bash
   git shortlog -s -n vPREV..HEAD | awk '{$1=""; name=substr($0,2); print "- " name " (@jey3dayo)"}'
   ```

9. メジャーバージョンRelease更新

   ```bash
   # v1, v2などのメジャーバージョンタグのGitHub Releaseを更新
   gh release edit vX \
     --title "vX (Latest vX.x)" \
     --notes "..."
   ```

   ### 生成する内容（標準フォーマット）

   ```
   # Latest v1.x Release

   This is a floating tag that always points to the latest v1.x release.

   ## Current Version: vX.Y.Z

   For detailed release notes, see: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/vX.Y.Z

   ## Usage

   ```yaml
   # Recommended: Use floating tag for automatic updates
   - uses: jey3dayo/pr-insights-labeler@v1

   # Or use specific version for stability
   - uses: jey3dayo/pr-insights-labeler@vX.Y.Z
   ```

   ## What's New in vX.Y.Z

   （最新バージョンの変更内容を簡潔に）

   ## Recent Versions

   - [vX.Y.Z](URL) - YYYY-MM-DD
   - [vX.Y.Z-1](URL) - YYYY-MM-DD
   - [vX.Y.Z-2](URL) - YYYY-MM-DD

   **Full Changelog**: <https://github.com/jey3dayo/pr-insights-labeler/compare/vPREV...vCURRENT>

   ```

10. 完了報告

    完了したら、作成したタグ・GitHub Release の URL・次に確認すべき事項（CI確認、ユーザーへのアナウンス等）を報告する。

11. 事後検証

    ```bash
    gh release view vX.Y.Z      # Release が作成されているか
    gh release view vX          # メジャーバージョン Release が更新されているか
    git tag -l "v*" | sort -V | tail -5
    gh run list --branch main --limit 3
    ```

### エラーハンドリング

各ステップで失敗した場合、適切にロールバックし、ユーザーに対処方法を提示してください。
