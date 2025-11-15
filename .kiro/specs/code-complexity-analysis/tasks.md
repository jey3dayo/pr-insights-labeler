# 実装計画: コード複雑度分析

## 実装タスク

- [x] 1. 依存関係の追加と型定義の拡張
- [x] 1.1 新規ライブラリのインストールと設定
  - p-limitとESLint標準API（^6.0.0）をpackage.jsonに追加
  - @typescript-eslint/parserのバージョン互換性を確認
  - pnpm installを実行して依存関係を解決
  - _Requirements: 1.8_

- [x] 1.2 複雑度メトリクス用の型定義を確認・拡張
  - labeler-types.tsの既存型を確認（ComplexityMetrics、FileComplexity、FunctionComplexity、PRMetrics.complexity）
  - ComplexityMetricsに不足フィールドを追加（avgComplexity、analyzedFiles、syntaxErrorFiles、truncated、hasTsconfig）
  - SkippedFile型を新規追加
  - AnalysisOptions、ComplexityError、ParserOptionsの型定義を追加
  - 既存型のfilenameとpathの違いなど、design.mdとの差分を最小限で調整
  - _Requirements: 2.7_

- [x] 2. 複雑度計算の基盤機能を実装
- [x] 2.1 ComplexityAnalyzerクラスの基本構造を作成
  - complexity-analyzer.tsファイルを作成
  - analyzeFile、analyzeFilesメソッドのスケルトンを実装
  - Result型を使用したエラーハンドリングの骨組みを構築
  - Linterインスタンス生成のヘルパー関数を実装
  - _Requirements: 1.1, 1.5, 1.6_

- [x] 2.2 ESLintの設定生成機能を実装
  - tsconfig.jsonの存在チェック機能を実装
  - parserOptionsの生成ロジックを実装（ecmaVersion、sourceType、jsx対応）
  - tsconfig.json未検出時のフォールバック処理を実装
  - 警告ログ出力とhasTsconfigフラグの設定を実装
  - _Requirements: 1.6, 1.7_

- [x] 2.3 ファイルの事前検証機能を実装
  - バイナリファイル判定機能を実装（拡張子ベース）
  - ファイルサイズチェック機能を実装（fs.statによる事前チェック、デフォルト1MB=1048576バイト）
  - 注: 1MB閾値は既存file-metricsのサイズ制限との一貫性を確認（TypeScript/JavaScriptファイルの99.9%をカバー）
  - エンコーディングエラー検出機能を実装
  - 除外パターンマッチング機能を既存のpattern-matcherと統合
  - _Requirements: 1.10, 6.1_

- [x] 3. 単一ファイルの複雑度計算を実装
- [x] 3.1 analyzeFileメソッドの実装
  - ファイル存在確認とサイズチェックを実装
  - linter.lintTextの呼び出しとエラーハンドリングを実装
  - 構文エラー時の複雑度0返却処理を実装
  - FileComplexity型への変換ロジックを実装
  - _Requirements: 1.5, 1.9, 1.11, 6.2_

- [x] 3.2 タイムアウト機能の実装
  - Promise.raceによる個別ファイルタイムアウトを実装（デフォルト5秒）
  - タイムアウト発生時のTimeoutErrorを実装
  - タイムアウトファイルをskippedFilesに分類する処理を実装
  - _Requirements: 6.3, 6.4_

- [x] 4. 複数ファイルの並列処理と集計を実装
- [x] 4.1 並列処理機能の実装
  - p-limitライブラリを使用した並列度制御を実装（デフォルト8並列）
  - analyzeFilesメソッドで各ファイルの解析結果を収集
  - Promise.allSettledで全ファイルの解析完了を待機
  - 全体タイムアウト機能を実装（デフォルト60秒）
  - _Requirements: 6.5, 6.7_

- [x] 4.2 集計機能の実装
  - aggregateMetrics関数で最大複雑度を計算
  - 平均複雑度を計算（小数第1位で四捨五入）
  - 構文エラーファイルは集計から除外し、syntaxErrorFiles配列に分類（平均値の歪み防止）
  - validFilesのフィルタリング: complexity >= 0 かつ 構文エラーでないファイルのみ
  - 0件時のundefined返却処理を実装
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

- [x] 4.3 エラー分類とskippedFilesの管理
  - 各種エラーをskippedFiles配列に分類（too_large、analysis_failed、timeout、binary、encoding_error）
  - syntaxErrorFiles配列への構文エラーファイルの記録
  - スキップファイルの詳細情報（reason、details）を保存
  - _Requirements: 6.1, 6.2_

- [x] 5. 設定管理とデフォルト値の実装
- [x] 5.1 config-loaderへの複雑度設定の追加
  - complexity設定セクションの読み込み機能を実装（enabled、metric、thresholds、extensions、exclude）
  - デフォルト値の定義（既存デフォルトに合わせる: medium=10、high=20、extensions=['.ts', '.tsx']）
  - 注: .js/.jsxは初期リリースでは対象外（負荷と解析安定性の観点）、将来オプトイン可能
  - デフォルト除外パターンの定義（dist、build、node_modules、test、generated）
  - 設定のバリデーション機能を実装（閾値の妥当性チェック）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8_

- [x] 5.2 フィルタリング優先順位の実装
  - 拡張子フィルタの実装
  - 除外パターンの適用順序の実装（additionalExcludePatterns → pattern-matcher → complexity.extensions）
  - パス正規化処理の実装（Windows対応）
  - _Requirements: 3.7_

- [x] 5.3 後方互換性の実装
  - pr-labeler.ymlのcomplexity.enabledフラグで機能の有効/無効を制御
  - 注: action.yml入力の追加は当面不要（設定面の分散を回避）、将来検討課題として記録
  - complexityがundefinedの場合の処理スキップロジックを実装
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. メインフローへの統合
- [x] 6.1 index.tsへの複雑度計算の統合
  - PR変更ファイルリスト取得後のComplexityAnalyzer呼び出しを実装
  - AnalysisOptionsの構築処理を実装
  - PRMetrics.complexityフィールドへの結果設定を実装
  - 複雑度計算の開始/終了ログ出力を実装
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6.2 パフォーマンス計測機能の実装
  - 複雑度計算の実行時間測定を実装
  - 10秒超過時のGitHub Actions annotationsによる警告表示を実装
  - 注: actions-io.tsの既存パターンに従う、@actions/coreのwarning()とannotation機能を使用
  - 実行時間のログ出力を実装
  - _Requirements: 6.8_

- [x] 7. ラベル判定エンジンとの統合
- [x] 7.1 label-decision-engineの拡張
  - decideComplexityLabel関数の実装（既存のものを活用）
  - maxComplexityとthresholdsの比較ロジックを確認
  - complexity/medium、complexity/highラベルの判定処理を確認
  - 閾値未満の場合のラベル未付与処理を確認
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7.2 label-applicatorとの統合
  - complexity名前空間のラベル置換ポリシーの確認
  - 既存complexity/\*ラベルの削除処理を確認
  - 新しいラベルの追加処理を確認
  - GitHub APIエラー時のリトライ処理を確認（指数バックオフ）
  - _Requirements: 4.5, 4.6, 4.7, 4.8_

- [x] 8. GitHub Actions Summaryの実装
- [x] 8.1 複雑度サマリーの生成機能を実装
  - generateComplexitySummary関数の実装
  - 基本メトリクスのMarkdownテーブル生成（最大複雑度、平均複雑度、分析ファイル数）
  - 数値フォーマット処理（3桁カンマ区切り、小数第1位）
  - _Requirements: 5.1, 5.2, 5.7_

- [x] 8.2 高複雑度ファイルリストの生成
  - medium閾値を超えるファイルの抽出とソート（複雑度降順）
  - 上位10件の表示処理を実装
  - ファイル名のGitHub URLリンク生成を実装
  - 閾値超過レベル（medium/high）の表示を実装
  - _Requirements: 5.3, 5.4_

- [x] 8.3 関数別複雑度の詳細表示を実装
  - <details>タグによる折りたたみ表示を実装
  - 各ファイルの関数上位5件の表示処理を実装
  - 関数名と行番号のGitHub URLリンク生成を実装
  - _Requirements: 5.5, 5.6_

- [x] 8.4 警告セクションの実装
  - スキップファイルの警告表示（理由付き）を実装
  - 構文エラーファイルの警告表示（集計対象であることを強調）を実装
  - tsconfig.json未検出の警告表示を実装
  - PRファイル数トランケーションの警告表示を実装
  - _Requirements: 5.8, 5.9_

- [x] 8.5 Summary出力の統合
  - actions-io.tsのwriteSummaryWithAnalysis関数に複雑度セクションを統合
  - complexity.enabledがfalseの場合のセクション非表示処理を実装
  - 0件時のメッセージ表示処理を実装
  - _Requirements: 5.10_

- [x] 9. エラーハンドリングとロギング
- [x] 9.1 エラー型の定義
  - ComplexityError基底クラスの実装
  - FileTooLargeError、AnalysisFailedError、TimeoutError、EncodingErrorの実装
  - 各エラー型のcode、recoverable、messageフィールドを実装
  - _Requirements: 6.9_

- [x] 9.2 エラーログの実装
  - @actions/coreのwarning、errorを使用したログ出力を実装
  - エラーコード、ファイルパス、スタックトレースを含む構造化ログを実装
  - recoverableフラグによるログレベルの分岐を実装
  - _Requirements: 6.1_

- [x] 10. テストの実装
- [x] 10.1 ComplexityAnalyzerのユニットテスト
  - analyzeFileの正常系テスト（TypeScript、TSX、JavaScript、JSXファイル）
  - 構文エラーファイルのテスト（複雑度0返却）
  - 1MB超ファイルのテスト（FileTooLargeError）
  - aggregateMetricsのテスト（max、avgの正確性、構文エラー含む集計）
  - 0件時のundefined返却テスト
  - _Requirements: 8.1, 8.3_

- [x] 10.2 設定管理のテスト
  - デフォルト設定の読み込みテスト
  - カスタム設定の読み込みテスト（閾値、拡張子、除外パターン）
  - 設定バリデーションのテスト（不正な閾値、無効な拡張子）
  - 後方互換性のテスト（enable_complexity_analysisフラグ）
  - _Requirements: 3.8, 7.1, 7.2_

- [x] 10.3 ラベル判定のテスト
  - 閾値境界のテスト（medium-1、medium、high-1、high）
  - complexity/medium、complexity/highラベルの正確な付与テスト
  - 閾値未満の場合のラベル未付与テスト
  - ラベル置換ポリシーのテスト（既存ラベル削除後に新ラベル追加）
  - _Requirements: 8.2_

- [x] 10.4 並列処理とパフォーマンスのテスト
  - p-limitによる並列度制御のテスト（8並列）
  - タイムアウト機能のテスト（個別5秒、全体60秒）
  - 100ファイルの模擬PRで実行時間測定（目標5秒以内）
  - _Requirements: 8.4_

- [x] 10.5 Summary出力のテスト
  - 複雑度セクションのMarkdown生成テスト
  - 高複雑度ファイルリストのテスト（上位10件、ソート順）
  - 関数別複雑度の詳細表示テスト（上位5件）
  - 警告セクションのテスト（スキップ、構文エラー、tsconfig未検出）
  - 0件時のメッセージ表示テスト
  - _Requirements: 5.8, 5.9_

- [x] 10.6 統合テストとスナップショットテスト
  - E2Eフロー（PR作成 → 複雑度計算 → ラベル付与 → Summary出力）のテスト
  - ComplexityMetrics JSONのスナップショットテスト
  - Actions Summary Markdownのスナップショットテスト
  - _Requirements: 8.5_

- [x] 10.7 テストカバレッジの確認
  - 複雑度計算関連モジュールで90%以上のカバレッジを達成
  - 未カバー箇所の特定と追加テストの実装
  - _Requirements: 8.6_

- [x] 11. ドキュメントとリリース準備
- [x] 11.1 ビルドとdist更新
  - pnpm buildを実行してdist/index.jsを更新
  - ライセンス情報の更新（ESLint、p-limitのライセンス）
  - dist/をコミット
  - _Requirements: すべて_

- [x] 11.2 品質保証の最終確認
  - pnpm lint、pnpm type-check、pnpm test、pnpm buildをすべて実行
  - すべてのチェックが成功することを確認
  - テストカバレッジレポートの確認
  - _Requirements: すべて_

## 実装の注意事項

### 優先順位

1. **Phase 1**: タスク1-3（基盤機能と単一ファイル解析）
2. **Phase 2**: タスク4-5（並列処理と設定管理）
3. **Phase 3**: タスク6-8（メインフロー統合とSummary出力）
4. **Phase 4**: タスク9-10（エラーハンドリングとテスト）
5. **Phase 5**: タスク11（ドキュメントとリリース）

### 品質保証チェックリスト

各タスク完了後に以下を確認：

- [x] TypeScript型チェックが通る（pnpm type-check）
- [x] ESLintが通る（pnpm lint）
- [x] 関連するテストが通る（pnpm test）
- [x] 新規追加機能のテストを実装済み
- [x] エラーハンドリングがResult型を使用している
- [x] ログ出力が適切に実装されている

### 実装上の重要ポイント

1. **Railway-Oriented Programming**: すべてのエラーをResult<T, E>型で表現
2. **並列度制御**: p-limitライブラリで正確に8並列を維持
3. **構文エラーの扱い**: 集計から除外し、syntaxErrorFiles配列で別枠可視化（平均値の歪み防止）
4. **フィルタリング順序**: additionalExcludePatterns → pattern-matcher → complexity.extensions
5. **tsconfig.jsonフォールバック**: 見つからない場合は既定設定を使用し、警告ログを出力
6. **Summary上限**: ファイル上位10件、関数上位5件まで表示
7. **後方互換性**: pr-labeler.ymlのcomplexity.enabledで制御（action.yml入力は当面不要）
8. **既存型の活用**: labeler-types.tsの既存型を確認し、差分のみ拡張
9. **デフォルト設定**: 閾値は既存の10/20、対象拡張子は['.ts', '.tsx']のみ
10. **ファイルサイズガード**: デフォルト1MB（既存file-metricsとの一貫性確認）

## 要件カバレッジマトリクス

| 要件カテゴリ | 対応タスク | ステータス |
| ------------------------- | ------------------ | ---------- |
| 要件1: 循環的複雑度計算 | 1.1, 2.1-3.2, 10.1 | 未着手 |
| 要件2: PR全体の複雑度集計 | 4.1-4.3, 10.1 | 未着手 |
| 要件3: 設定ベース制御 | 5.1-5.3, 10.2 | 未着手 |
| 要件4: PR Insights Labeler統合 | 7.1-7.2, 10.3 | 未着手 |
| 要件5: Summary出力 | 8.1-8.5, 10.5 | 未着手 |
| 要件6: エラーハンドリング | 3.2, 4.3, 9.1-9.2 | 未着手 |
| 要件7: 後方互換性 | 5.3, 10.2 | 未着手 |
| 要件8: テスト方針 | 10.1-10.7 | 未着手 |
