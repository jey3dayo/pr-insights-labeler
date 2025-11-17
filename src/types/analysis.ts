/**
 * Analysis types for file metrics
 */

import type { Violations } from '../errors/types.js';

/**
 * File metrics for a single file
 */
export interface FileMetrics {
  path: string;
  size: number;
  lines: number;
  isLineCountCapped?: boolean;
  additions: number;
  deletions: number;
}

/**
 * Analysis result with metrics and violations
 */
export interface Metrics {
  totalFiles: number;
  totalAdditions: number;
  excludedAdditions: number;
  filesAnalyzed: FileMetrics[];
  filesExcluded: string[];
  filesSkippedBinary: string[];
  filesWithErrors: string[];
  allFiles: string[]; // カテゴリラベル判定用の全ファイルパス（除外前）
}

/**
 * Analysis result with metrics and violations
 */
export interface AnalysisResult {
  metrics: Metrics;
  violations: Violations;
}
