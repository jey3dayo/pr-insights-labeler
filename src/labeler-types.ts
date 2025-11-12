/* c8 ignore start */

/**
 * Type definitions for PR Insights Labeler functionality
 * These types support intelligent label assignment based on PR metrics
 */

import type { FileMetrics } from './types/analysis.js';

// Re-export configuration types from types/config.ts for backward compatibility
export type {
  CategoryConfig,
  CategoryLabelingConfig,
  ComplexityConfig,
  ExcludeConfig,
  LabelerConfig,
  LabelPolicyConfig,
  RuntimeConfig,
  SizeConfig,
} from './types/config.js';

// Re-export analysis types from types/analysis.ts for backward compatibility
export type { FileMetrics };

// ============================================================================
// Configuration Types
// ============================================================================

// ============================================================================
// Metrics Types
// ============================================================================

/**
 * Complexity metrics for PR
 */
export interface ComplexityMetrics {
  maxComplexity: number; // PR全体の最大複雑度
  avgComplexity: number; // PR全体の平均複雑度（小数第1位）
  analyzedFiles: number; // 複雑度計算対象ファイル数
  files: FileComplexity[]; // ファイル単位の複雑度
  skippedFiles: SkippedFile[]; // スキップされたファイル（大容量、解析失敗等）
  syntaxErrorFiles: string[]; // 構文エラーファイル（複雑度0として扱われた）
  truncated: boolean; // PRファイル数がGitHub API上限により切り詰められた場合true
  totalPRFiles?: number; // PR全体のファイル数（truncated時のみ設定）
  hasTsconfig: boolean; // tsconfig.jsonが見つかったかどうか（Summary注記用）
}

/**
 * Skipped file information
 */
export interface SkippedFile {
  path: string;
  reason: 'too_large' | 'analysis_failed' | 'timeout' | 'binary' | 'encoding_error' | 'syntax_error' | 'general';
  details?: string; // エラー詳細（オプショナル）
}

/**
 * Complexity metrics for a single file
 */
export interface FileComplexity {
  path: string; // ファイルパス（リポジトリルートからの相対パス）
  complexity: number; // ファイル全体の複雑度（関数複雑度の合計）
  functions: FunctionComplexity[]; // 関数単位の複雑度
  isSyntaxError?: boolean; // 構文エラーの場合true（複雑度0として扱われる）
}

/**
 * Complexity metrics for a single function
 */
export interface FunctionComplexity {
  name: string; // 関数/メソッド名
  complexity: number; // 関数の循環的複雑度
  loc: {
    // 関数の行番号範囲
    start: number; // 開始行番号（1始まり）
    end: number; // 終了行番号（1始まり）
  };
}

/**
 * PR metrics including file metrics and complexity
 */
export interface PRMetrics {
  totalAdditions: number;
  excludedAdditions: number;
  files: FileMetrics[];
  allFiles: string[]; // カテゴリラベル判定用の全ファイルパス（除外前）
  complexity?: ComplexityMetrics; // 複雑度分析が無効の場合はundefined
}

// ============================================================================
// Label Decision Types
// ============================================================================

/**
 * Label decisions for a PR
 */
export interface LabelDecisions {
  labelsToAdd: string[]; // 付与すべきラベル
  labelsToRemove: string[]; // 削除すべきラベル（置換ポリシー適用時）
  reasoning: LabelReasoning[]; // デバッグ用の判定理由
}

/**
 * Reasoning for a label decision
 */
export interface LabelReasoning {
  label: string;
  reason: string; // 例: "additions (1234) exceeds large threshold (1000)"
  category: 'size' | 'complexity' | 'category' | 'risk';
  matchedFiles?: string[]; // ラベルに対応するファイルリスト
}

/**
 * Result of label update operation
 */
export interface LabelUpdate {
  added: string[]; // 追加されたラベル
  removed: string[]; // 削除されたラベル
  skipped: string[]; // スキップされたラベル（権限不足等）
  apiCalls: number; // 実行されたAPI呼び出し数
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default labeler configuration
 * Exported from configs/ for better maintainability
 */
export { DEFAULT_LABELER_CONFIG } from './configs/index.js';

/* c8 ignore end */
