# 🛒 GitHub Actions Marketplace リリースガイド

**対象**: メンテナー・リリース担当
**タグ**: `category/deployment`, `audience/maintainer`, `environment/production`

**言語**: English（準備中） | 日本語

## 📋 前提条件

Marketplace へ公開する前に、以下の準備が整っていることを確認します。

- ✅ `action.yml` が適切に設定されています
- ✅ `README.md` に必要な利用方法が記載されています
- ✅ ブランディング設定（アイコン・カラー）が完了しています
- ✅ MIT ライセンスが設定されています

## 🚀 推奨: 自動リリース

通常は自動リリーススクリプトを使用します。

```bash
# インタラクティブリリース
mise release

# または
bash scripts/release.sh
```

スクリプトは次の処理を自動で実行します。

1. バージョン種別（patch / minor / major）を選択します
2. 品質チェック（lint / test / build）を実行します
3. Changelog を生成します
4. タグ（`v1.9.0` および `v1`）を作成・更新します
5. GitHub Release を作成します

## 📝 手動リリース手順（スクリプトを使わない場合）

### 1. ローカル品質チェック

リリース前に、すべての品質チェックが通ることを確認します。

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

### 2. バージョン番号の決定

セマンティックバージョニングに従って、次のバージョン番号を決めます。

- **Patch**（`v1.8.1` → `v1.8.2`）: バグ修正
- **Minor**（`v1.8.1` → `v1.9.0`）: 後方互換性のある新機能追加
- **Major**（`v1.8.1` → `v2.0.0`）: 破壊的変更

### 3. タグの作成とプッシュ

具体的なバージョンタグと、メジャーバージョンタグを作成してプッシュします。

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

### 4. GitHub Release の作成

#### Web UI で作成する場合

1. [リリース作成ページ](https://github.com/jey3dayo/pr-insights-labeler/releases/new)を開きます
2. **Tag** に `v1.9.0` を選択します
3. **Target** に `main` を選択します
4. **Title** に `v1.9.0` を入力します
5. **Primary Category** に `Continuous integration` を選択します
6. **Another Category** に `Code quality` を選択します
7. **Release notes** に変更内容を記載して公開します

#### CLI で作成する場合

前の手順で設定した `NEXT_VERSION` に加え、差分比較リンク用に直前の安定版タグを `PREV_VERSION` として指定します。

```bash
PREV_VERSION="1.8.1"  # 直前の安定版タグ

gh release create "v${NEXT_VERSION}" \
  --title "v${NEXT_VERSION}" \
  --notes "$(cat <<EOF
## ⚠️ Breaking Changes (if applicable)

- 破壊的変更の説明 (#PR)
  - **Migration Guide**: 既存ユーザー向け移行手順
  - **Affected**: 影響範囲
  - **Action Required**: 必要なアクション

## 🚀 What's New

### ✨ Added
- 新機能の説明 (#PR)

### 🔄 Changed
- 仕様変更・リファクタの説明 (#PR)

### 🐛 Fixed
- バグ修正の説明 (#PR)

## 📊 Quality Metrics

- ✅ [テスト数] tests passing (Vitest)
- ✅ 0 ESLint errors/warnings
- ✅ 0 TypeScript type errors
- ✅ Build successful

## 👥 Contributors

This release was made possible by:
- @contributor1
- @contributor2

## 🔗 Full Changelog

**Full Changelog**: https://github.com/jey3dayo/pr-insights-labeler/compare/v${PREV_VERSION}...v${NEXT_VERSION}
EOF
)"
```

## 🏷️ Marketplace カテゴリの選択

### 推奨カテゴリ

- **Primary Category**: `Continuous integration`
  - CI/CD ワークフロー内で利用されるアクションのためです
- **Another Category**: `Code quality`
  - PR の品質評価とレビュー支援が主な目的のためです

### その他の候補カテゴリ

- `Code review` - PR レビューの効率化を支援します
- `Monitoring` - PR メトリクスの監視に利用できます

## ✅ Marketplace 公開後の確認

リリースを作成したら、以下の3点を確認します。

1. **Marketplace での表示確認**
   - [PR Insights Labeler - GitHub Marketplace](https://github.com/marketplace/actions/pr-insights-labeler) を開き、説明やバージョンが正しく反映されているか確認します

2. **バッジの更新（任意）**

   ```markdown
   [![GitHub Marketplace](https://img.shields.io/badge/Marketplace-PR%20Insights%20Labeler-blue.svg)](https://github.com/marketplace/actions/pr-insights-labeler)
   ```

3. **動作確認**

   ```yaml
   # 他のリポジトリでテスト
   - uses: jey3dayo/pr-insights-labeler@v1
   ```

## 🔄 メジャーバージョンタグの管理

**重要**: GitHub Actions では、`@v1` のようにメジャーバージョンでアクションを参照する使い方が一般的です。

### `v1` タグが必要な理由

利用者は次のようにバージョンを指定してアクションを呼び出します。

```yaml
- uses: jey3dayo/pr-insights-labeler@v1      # メジャーバージョン
- uses: jey3dayo/pr-insights-labeler@v1.9.0  # 具体的なバージョン
```

### `v1` タグの更新方法

マイナーリリースやパッチリリースのたびに、`v1` タグが最新リリースを指すよう更新します。

```bash
# v1.9.0 リリース時
git tag -f v1 v1.9.0^{}
git push origin v1 --force

# v1.10.0 リリース時
git tag -f v1 v1.10.0^{}
git push origin v1 --force
```

### 破壊的変更を含むリリース時

メジャーバージョンを上げる場合は、新しいメジャーバージョンタグを作成します。

```bash
# v2.0.0 リリース時
git tag -a v2.0.0 -m "v2.0.0"
git tag -f v2 v2.0.0^{}
git push origin v2.0.0 v2
```

## 📚 参考資料

- [GitHub Actions - Publishing actions in GitHub Marketplace](https://docs.github.com/en/actions/creating-actions/publishing-actions-in-github-marketplace)
- [Semantic Versioning](https://semver.org/)
- [リリース手順](release-process.md)
