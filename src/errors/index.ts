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

// Export BaseError and ErrorLevel
export { BaseError, type ErrorLevel } from './base-error.js';

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
  createUnexpectedError,
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
export { ensureError, extractAggregateError } from './helpers.js';

// Export AppError utilities
export { formatAppError, toAppError } from './app-error-utils.js';
