export { formatAppError, toAppError } from './app-error-utils.js';
export { type ErrorLevel } from './base-error.js';
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
export {
  extractErrorStatus,
  isComplexityAnalysisError,
  isError,
  isErrorWithMessage,
  isErrorWithTypeAndMessage,
  isObject,
  isString,
} from './guards.js';
export { ensureError } from './helpers.js';
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
