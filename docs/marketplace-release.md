# GitHub Actions Marketplace Release Guide

## 📋 前提条件

- ✅ `action.yml` が適切に設定されている
- ✅ `README.md` が充実している
- ✅ ブランディング設定済み（アイコン・カラー）
- ✅ MITライセンス設定済み

## 🚀 推奨：自動リリース

```bash
# インタラクティブリリース
mise release

# または
bash scripts/release.sh
```

スクリプトが以下を自動実行：

1. バージョン選択（patch/minor/major）
2. 品質チェック（lint/test/build）
3. Changelog生成
4. タグ作成（v1.9.0 + v1）
5. GitHub Release作成

## 📝 手動リリース手順（スクリプト非使用）

### 1. ローカル品質チェック

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

### 2. バージョン決定

セマンティックバージョニング：

- **Patch** (v1.8.1 → v1.8.2): バグフィックス
- **Minor** (v1.8.1 → v1.9.0): 新機能
- **Major** (v1.8.1 → v2.0.0): 破壊的変更

### 3. タグ作成

```bash
# 次のバージョン（例: v1.9.0）
NEXT_VERSION="1.9.0"

# タグ作成
git tag -a "v${NEXT_VERSION}" -m "v${NEXT_VERSION}

## 変更内容
- 新機能の説明
- バグフィックスの説明
"

# メジャーバージョンタグ更新（重要！）
git tag -f v1 "v${NEXT_VERSION}^{}"

# プッシュ
git push origin "v${NEXT_VERSION}"
git push origin v1 --force
```

### 4. GitHub Release作成

#### Web UI

1. [リリース作成ページ](https://github.com/jey3dayo/pr-insights-labeler/releases/new)
2. **Tag**: `v1.9.0`
3. **Target**: `main`
4. **Title**: `v1.9.0`
5. **Primary Category**: `Continuous integration`
6. **Another Category**: `Code quality`
7. **Release notes**: 変更内容を記載

#### CLI

```bash
gh release create "v${NEXT_VERSION}" \
  --title "v${NEXT_VERSION}" \
  --notes "$(cat <<EOF
## 🚀 What's New

### ✨ Added
- 新機能の説明

### 🐛 Fixed
- バグフィックスの説明

## 📊 Quality Metrics
- ✅ All tests passing
- ✅ 0 ESLint errors/warnings
- ✅ 0 TypeScript type errors
- ✅ Build successful

## 🔗 Full Changelog
https://github.com/jey3dayo/pr-insights-labeler/compare/v1.8.1...v${NEXT_VERSION}
EOF
)"
```

## 🏷️ Marketplace カテゴリ選択

### 推奨カテゴリ

- **Primary Category**: `Continuous integration`
  - CI/CDワークフローで使用されるため
- **Another Category**: `Code quality`
  - PRの品質評価・レビュー支援が主目的

### その他の適切なカテゴリ

- `Code review` - PRレビュープロセスを支援
- `Monitoring` - PR メトリクスの監視

## ✅ Marketplace公開確認

リリース作成後：

1. **Marketplace表示確認**
   - [PR Insights Labeler - GitHub Marketplace](https://github.com/marketplace/actions/pr-insights-labeler)

2. **バッジ更新（任意）**

   ```markdown
   [![GitHub Marketplace](https://img.shields.io/badge/Marketplace-PR%20Insights%20Labeler-blue.svg)](https://github.com/marketplace/actions/pr-insights-labeler)
   ```

3. **動作確認**

   ```yaml
   # 他のリポジトリでテスト
   - uses: jey3dayo/pr-insights-labeler@v1
   ```

## 🔄 メジャーバージョンタグ管理

**重要**: GitHub Actionsは `@v1` のようなメジャーバージョンで参照されます。

### なぜv1タグが必要？

ユーザーは以下のように使用：

```yaml
- uses: jey3dayo/pr-insights-labeler@v1  # メジャーバージョン
- uses: jey3dayo/pr-insights-labeler@v1.9.0  # 具体的バージョン
```

### v1タグの更新方法

リリースごとに `v1` タグを最新バージョンに更新：

```bash
# v1.9.0 リリース時
git tag -f v1 v1.9.0^{}
git push origin v1 --force

# v1.10.0 リリース時
git tag -f v1 v1.10.0^{}
git push origin v1 --force
```

### 破壊的変更時

メジャーバージョンアップ時は新しいメジャータグを作成：

```bash
# v2.0.0 リリース時
git tag -a v2.0.0 -m "v2.0.0"
git tag -f v2 v2.0.0^{}
git push origin v2.0.0 v2
```

## 📚 参考資料

- [GitHub Actions - Publishing actions in GitHub Marketplace](https://docs.github.com/en/actions/creating-actions/publishing-actions-in-github-marketplace)
- [Semantic Versioning](https://semver.org/)
- [Release Process](release-process.md)
