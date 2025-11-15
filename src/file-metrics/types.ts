import type { AnalysisResult, FileMetrics, Metrics } from '../types/analysis.js';

// Re-export analysis types for convenience
export type { AnalysisResult, FileMetrics, Metrics };

/**
 * Repository context for operations that need Git metadata
 */
export interface RepoContext {
  owner: string;
  repo: string;
  headSha?: string;
}

/**
 * Runtime configuration for file analysis
 */
export interface AnalysisConfig {
  fileSizeLimit: number;
  fileLineLimit: number;
  maxAddedLines: number;
  maxFileCount: number;
  excludePatterns: string[];
}
