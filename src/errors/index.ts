/**
 * Error handling module
 * Re-exports all error types, factories, guards, and helpers for convenience
 */

// Export all types
export type {
  AppError,
  CacheError,
  ComplexityAnalysisError,
  ConfigurationError,
  DiffError,
  FileAnalysisError,
  FileSystemError,
  GitHubAPIError,
  ParseError,
  PatternError,
  PermissionError,
  RateLimitError,
  UnexpectedError,
  ViolationDetail,
  ViolationError,
  Violations,
} from './types.js';

// Export ErrorLevel (BaseError is imported directly from base-error.js by consumers)
export { type ErrorLevel } from './base-error.js';

// Export all factory functions
export {
  createCacheError,
  createComplexityAnalysisError,
  createConfigurationError,
  createDiffError,
  createFileAnalysisError,
  createFileSystemError,
  createGitHubAPIError,
  createParseError,
  createPatternError,
  createPermissionError,
  createRateLimitError,
  createViolationError,
} from './factories.js';

// Export all type guard functions
export {
  extractErrorStatus,
  isComplexityAnalysisError,
  isError,
  isErrorWithMessage,
  isErrorWithTypeAndMessage,
  isObject,
  isString,
} from './guards.js';

// Export error helper functions
export { ensureError } from './helpers.js';

// Export AppError utilities
export { formatAppError, toAppError } from './app-error-utils.js';
