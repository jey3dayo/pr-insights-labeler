# Add Exclude Files Command

`DEFAULT_EXCLUDES`にファイルパターンを追加し、PR分析から除外するコマンドです。
対象は `src/configs/directory-labeler-defaults.ts` の`DEFAULT_EXCLUDES`配列です。

## 使用方法

```bash
# 単一ファイル追加
/add-exclude-files .eslintrc.js

# 複数ファイル追加
/add-exclude-files .prettierrc .editorconfig

# カスタムパターン指定（高度な使用法）
/add-exclude-files --pattern "**/.github/**/*.yaml"

# ドライラン（変更を適用せず確認のみ）
/add-exclude-files --dry-run .eslintrc.js

# テスト実行を含める
/add-exclude-files --test .eslintrc.js
```

## オプション

- `--pattern <glob>`: カスタムglobパターンを指定（正規化をスキップ）
- `--dry-run`: 変更内容を表示するが適用しない
- `--test`: 型チェックに加えてテストも実行（デフォルト: スキップ）

## 契約

- **正規化ルール**: glob文字を含まないパスには`**/`を前置する（例: `.eslintrc.js` → `**/.eslintrc.js`）。`--pattern`指定時は正規化しない
- **重複チェック**: 既存パターンと重複するものはスキップし、スキップした旨を報告する
- **検証**: `pnpm type-check`を実行する。`--test`指定時は`pnpm test`も実行する。型チェックが失敗したら変更を戻すか確認を取る
- `--dry-run`指定時はファイルを更新せず、変更予定の内容のみ表示する

## 注意事項

1. パターン形式: minimatch形式のglobパターンを使用
2. コメント保持: 既存のコメントは維持される
3. グループ順序: Configuration filesグループは最後に配置

## 関連ファイル

- `src/configs/directory-labeler-defaults.ts` - 除外パターン定義
- `__tests__/directory-labeler/pattern-matcher.test.ts` - 除外パターンのテスト
