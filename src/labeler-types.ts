/* c8 ignore start */

import type { FileMetrics } from './types/analysis.js';

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

export type { FileMetrics };

export interface ComplexityMetrics {
  maxComplexity: number;
  avgComplexity: number;
  analyzedFiles: number;
  files: FileComplexity[];
  skippedFiles: SkippedFile[];
  syntaxErrorFiles: string[];
  truncated: boolean;
  totalPRFiles?: number;
  hasTsconfig: boolean;
}

export interface SkippedFile {
  path: string;
  reason: 'too_large' | 'analysis_failed' | 'timeout' | 'binary' | 'encoding_error' | 'syntax_error' | 'general';
  details?: string;
}

export interface FileComplexity {
  path: string;
  complexity: number;
  functions: FunctionComplexity[];
  isSyntaxError?: boolean;
}

export interface FunctionComplexity {
  name: string;
  complexity: number;
  loc: {
    start: number;
    end: number;
  };
}

export interface PRMetrics {
  totalAdditions: number;
  excludedAdditions: number;
  files: FileMetrics[];
  allFiles: string[];
  complexity?: ComplexityMetrics;
}

export interface LabelDecisions {
  labelsToAdd: string[];
  labelsToRemove: string[];
  reasoning: LabelReasoning[];
}

export interface LabelReasoning {
  label: string;
  reason: string;
  category: 'size' | 'complexity' | 'category' | 'risk' | 'violation';
  matchedFiles?: string[];
}

export interface LabelUpdate {
  added: string[];
  removed: string[];
  skipped: string[];
  apiCalls: number;
}

export { DEFAULT_LABELER_CONFIG } from './configs/index.js';

/* c8 ignore end */
