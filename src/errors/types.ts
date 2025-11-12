/**
 * Error type definitions for PR Insights Labeler
 * Following Railway-Oriented Programming pattern with neverthrow
 */

export interface Violations {
  largeFiles: ViolationDetail[];
  exceedsFileLines: ViolationDetail[];
  exceedsAdditions: boolean;
  exceedsFileCount: boolean;
}

export interface ViolationDetail {
  file: string;
  actualValue: number;
  limit: number;
  violationType: 'size' | 'lines';
  severity: 'critical' | 'warning';
}

// Error Type 1: File Analysis Error
export interface FileAnalysisError {
  type: 'FileAnalysisError';
  file: string;
  message: string;
}

// Error Type 2: GitHub API Error
export interface GitHubAPIError {
  type: 'GitHubAPIError';
  status?: number;
  message: string;
}

// Error Type 3: Configuration Error
export interface ConfigurationError {
  type: 'ConfigurationError';
  field: string;
  value: unknown;
  message: string;
}

// Error Type 4: Parse Error
export interface ParseError {
  type: 'ParseError';
  input: string;
  message: string;
}

// Error Type 5: File System Error
export interface FileSystemError {
  type: 'FileSystemError';
  path?: string;
  message: string;
}

// Error Type 6: Violation Error
export interface ViolationError {
  type: 'ViolationError';
  violations: Violations;
  message: string;
}

// Error Type 7: Diff Error
export interface DiffError {
  type: 'DiffError';
  source: 'local-git' | 'github-api' | 'both';
  message: string;
}

// Error Type 8: Pattern Error
export interface PatternError {
  type: 'PatternError';
  pattern: string;
  message: string;
}

// Error Type 9: Cache Error
export interface CacheError {
  type: 'CacheError';
  key?: string;
  message: string;
}

// Error Type 10: Complexity Analysis Error
export interface ComplexityAnalysisError {
  type: 'ComplexityAnalysisError';
  reason: 'too_large' | 'analysis_failed' | 'timeout' | 'encoding_error' | 'binary' | 'syntax_error' | 'general';
  filename?: string; // エラーが発生したファイル（全ファイル失敗時はundefined）
  message: string;
  details?: string; // 追加の詳細情報
  fileSize?: number; // too_largeの場合のファイルサイズ
  maxSize?: number; // too_largeの場合の制限サイズ
  timeoutSeconds?: number; // timeoutの場合のタイムアウト時間
}

// Error Type 11: Directory-Based Labeler - Permission Error
export interface PermissionError {
  type: 'PermissionError';
  required: string;
  message: string;
}

// Error Type 12: Directory-Based Labeler - Rate Limit Error
export interface RateLimitError {
  type: 'RateLimitError';
  retryAfter?: number;
  message: string;
}

// Error Type 13: Directory-Based Labeler - Unexpected Error
export interface UnexpectedError {
  type: 'UnexpectedError';
  originalError?: unknown;
  message: string;
}

// Union type for all application errors
export type AppError =
  | FileAnalysisError
  | GitHubAPIError
  | ConfigurationError
  | ParseError
  | FileSystemError
  | ViolationError
  | DiffError
  | PatternError
  | CacheError
  | ComplexityAnalysisError
  | PermissionError
  | RateLimitError
  | UnexpectedError;
