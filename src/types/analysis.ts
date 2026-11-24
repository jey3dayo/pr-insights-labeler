import type { Violations } from '../errors/types.js';

export interface FileMetrics {
  path: string;
  size: number;
  lines: number;
  isLineCountCapped?: boolean;
  additions: number;
  deletions: number;
}

export interface Metrics {
  totalFiles: number;
  totalAdditions: number;
  excludedAdditions: number;
  filesAnalyzed: FileMetrics[];
  filesExcluded: string[];
  filesSkippedBinary: string[];
  filesWithErrors: string[];
  filesSkippedByLimit: string[];
  filesForClassification: string[];
}

export interface AnalysisResult {
  metrics: Metrics;
  violations: Violations;
}
