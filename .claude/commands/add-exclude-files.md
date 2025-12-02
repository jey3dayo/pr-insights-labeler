# Add Exclude Files Command

`DEFAULT_EXCLUDES`にファイルパターンを追加し、PR分析から除外するコマンドです。

## 🎯 機能

- **自動パターン正規化**: `**/`プレフィックスの自動追加
- **重複チェック**: 既存の除外パターンとの重複を検出
- **グループ管理**: 論理的なグループに自動分類して挿入
- **検証機能**: TypeScript型チェックの自動実行
- **ドライラン**: 変更内容の事前確認

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

## 実装手順

### Phase 1: 引数解析と初期化

1. コマンド引数をパース:
   - ファイルパス: 通常の引数
   - オプション: `--pattern`, `--dry-run`, `--test`
2. オプションフラグを設定

### Phase 2: ファイル読み込みと分析

1. `src/configs/directory-labeler-defaults.ts`を読み込み
2. 現在の`DEFAULT_EXCLUDES`配列を抽出
3. 既存パターンをリスト化

### Phase 3: パターン正規化と検証

各入力ファイルに対して:

1. **パターン正規化**:
   ```typescript
   // 例: .eslintrc.js → **/.eslintrc.js
   if (!file.startsWith('**/') && !file.includes('*')) {
     pattern = `**/${file}`;
   } else {
     pattern = file;
   }
   ```

2. **重複チェック**:
   - 既存パターンに含まれるか確認
   - 重複の場合はスキップしてメッセージ表示

3. **パターン追加リスト作成**:
   - 新規パターンのみを配列に追加

### Phase 4: ファイル更新

1. **挿入位置を決定**:
   - "Configuration files"コメントを探す
   - 存在しない場合: `'**/Thumbs.db',`の後に新規グループ作成
   - 存在する場合: 最後のエントリの後に追加

2. **新しい配列エントリを生成**:
   ```typescript
   // 新規グループの場合
   `  '**/Thumbs.db',
     // Configuration files
     '**/.eslintrc.js',
     '**/.prettierrc',
   ] as const;`

   // 既存グループへの追加の場合
   `  '**/.github/actionlint.yaml',
     '**/.eslintrc.js',  // 新規追加
   ] as const;`
   ```

3. **Edit toolで更新**:
   - `--dry-run`の場合: 変更内容を表示して終了
   - 通常モード: ファイルを更新

### Phase 5: 検証

1. **型チェック実行**:
   ```bash
   pnpm type-check
   ```
   - エラーがある場合: エラーメッセージを表示して停止

2. **テスト実行（オプション）**:
   ```bash
   # --testフラグが指定されている場合のみ
   pnpm test
   ```
   - テスト失敗時: 結果を表示して確認を求める

### Phase 6: 結果報告

成功時のメッセージ例:
```
✅ 除外パターンを追加しました:
  - **/.eslintrc.js
  - **/.prettierrc

📝 更新されたファイル:
  - src/configs/directory-labeler-defaults.ts

✅ 型チェック: 成功
⏭️  テスト: スキップ (--test で実行可能)
```

## エラーハンドリング

### 引数エラー
```
❌ エラー: ファイルパスが指定されていません

使用方法:
  /add-exclude-files <file1> [file2] ...
  /add-exclude-files --pattern "<glob-pattern>"
```

### 重複パターン
```
⚠️  スキップ: 以下のパターンは既に除外リストに含まれています
  - **/.eslintrc.js (既存パターン: **/.eslintrc.js)

✅ 追加されたパターン:
  - **/.prettierrc
```

### 型チェックエラー
```
❌ 型チェックに失敗しました:

src/configs/directory-labeler-defaults.ts:52:3 - error TS1005: ',' expected.

変更をロールバックしますか? [Y/n]
```

### テスト失敗
```
❌ テストに失敗しました:

FAIL __tests__/directory-labeler/pattern-matcher.test.ts
  ✕ should exclude default patterns (10 ms)

変更を維持しますか? テストの修正が必要です。[y/N]
```

## 実装例

### 例1: 単一ファイル追加
```
入力: /add-exclude-files .eslintrc.js

処理:
1. .eslintrc.js → **/.eslintrc.js に正規化
2. 重複チェック: なし
3. Configuration filesグループに追加
4. 型チェック実行: 成功

出力:
✅ 除外パターンを追加しました:
  - **/.eslintrc.js

📝 更新されたファイル:
  - src/configs/directory-labeler-defaults.ts (1 pattern added)
```

### 例2: 複数ファイル＋重複あり
```
入力: /add-exclude-files .dockerignore .prettierrc

処理:
1. .dockerignore → **/.dockerignore (既に存在)
2. .prettierrc → **/.prettierrc (新規)
3. 新規パターンのみ追加
4. 型チェック実行: 成功

出力:
⚠️  スキップ: **/.dockerignore (既に存在)

✅ 除外パターンを追加しました:
  - **/.prettierrc
```

### 例3: ドライラン
```
入力: /add-exclude-files --dry-run .editorconfig

処理:
1. 全ての処理をシミュレート
2. ファイルは更新しない
3. 変更内容のみ表示

出力:
🔍 ドライランモード: 実際の変更は行いません

追加予定のパターン:
  - **/.editorconfig

挿入位置:
src/configs/directory-labeler-defaults.ts:52
  '**/.github/actionlint.yaml',
+ '**/.editorconfig',  // 追加
] as const;

実行するには --dry-run を外してください。
```

## 注意事項

1. **パターン形式**: minimatch形式のglobパターンを使用
2. **コメント保持**: 既存のコメントは維持される
3. **グループ順序**: Configuration filesグループは最後に配置
4. **バックアップ不要**: Gitでバージョン管理されているため、必要に応じて`git checkout`で復元可能

## 関連ファイル

- `src/configs/directory-labeler-defaults.ts` - 除外パターン定義
- `__tests__/directory-labeler/pattern-matcher.test.ts` - 除外パターンのテスト
