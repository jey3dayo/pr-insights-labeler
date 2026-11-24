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

export interface FileAnalysisError {
  type: 'FileAnalysisError';
  file: string;
  message: string;
}

export interface GitHubAPIError {
  type: 'GitHubAPIError';
  status?: number;
  message: string;
}

export interface ConfigurationError {
  type: 'ConfigurationError';
  field: string;
  value: unknown;
  message: string;
}

export interface ParseError {
  type: 'ParseError';
  input: string;
  message: string;
}

export interface FileSystemError {
  type: 'FileSystemError';
  path?: string;
  message: string;
}

export interface ViolationError {
  type: 'ViolationError';
  violations: Violations;
  message: string;
}

export interface DiffError {
  type: 'DiffError';
  source: 'local-git' | 'github-api' | 'both';
  message: string;
}

export interface PatternError {
  type: 'PatternError';
  pattern: string;
  message: string;
}

export interface CacheError {
  type: 'CacheError';
  key?: string;
  message: string;
}

export interface ComplexityAnalysisError {
  type: 'ComplexityAnalysisError';
  reason: 'too_large' | 'analysis_failed' | 'timeout' | 'encoding_error' | 'binary' | 'syntax_error' | 'general';
  filename?: string;
  message: string;
  details?: string;
  fileSize?: number;
  maxSize?: number;
  timeoutSeconds?: number;
}

export interface PermissionError {
  type: 'PermissionError';
  required: string;
  message: string;
}

export interface RateLimitError {
  type: 'RateLimitError';
  retryAfter?: number;
  message: string;
}

export interface UnexpectedError {
  type: 'UnexpectedError';
  originalError?: unknown;
  message: string;
}

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
