import type { AnalysisResult, FileMetrics, Metrics } from '../types/analysis.js';

export type { AnalysisResult, FileMetrics, Metrics };

export interface RepoContext {
  owner: string;
  repo: string;
  headSha?: string;
  workspaceRoot?: string;
}

export interface AnalysisConfig {
  fileSizeLimit: number;
  fileSizeLimitEnabled: boolean;
  fileLineLimit: number;
  fileLineLimitEnabled: boolean;
  prAdditionsLimitEnabled: boolean;
  fileCountLimitEnabled: boolean;
  maxAddedLines: number;
  maxFileCount: number;
  excludePatterns: string[];
  useDefaultExcludes?: boolean;
}
