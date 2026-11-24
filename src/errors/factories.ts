import { t } from '../i18n.js';
import { createConfigurationErrorObject } from './configuration-error.js';
import { ensureError } from './helpers.js';
import type {
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
  ViolationError,
  Violations,
} from './types.js';

function withOptionalField<T extends object, K extends keyof T>(base: T, key: K, value: T[K] | undefined): T {
  if (value !== undefined) {
    base[key] = value;
  }
  return base;
}

export const createFileAnalysisError = (file: string, customMessage?: string): FileAnalysisError => ({
  type: 'FileAnalysisError',
  file,
  message: customMessage || t('errors', 'analysis.fileAnalysisError', { file }),
});

export const createGitHubAPIError = (message: string, status?: number): GitHubAPIError => {
  const translatedMessage = t('errors', 'github.apiError', { message });
  const error: GitHubAPIError = { type: 'GitHubAPIError', message: translatedMessage };
  return withOptionalField(error, 'status', status);
};

export const createConfigurationError = (field: string, value: unknown, customMessage?: string): ConfigurationError =>
  createConfigurationErrorObject(field, value, customMessage || t('errors', 'configuration.invalidField', { field }));

export const createParseError = (input: string, customMessage?: string): ParseError => ({
  type: 'ParseError',
  input,
  message: customMessage || t('errors', 'parsing.invalidFormat', { input }),
});

export const createFileSystemError = (
  path: string,
  operation?: 'read' | 'write' | 'notFound' | 'permission',
  customMessage?: string,
): FileSystemError => {
  let message: string;
  if (customMessage) {
    message = customMessage;
  } else if (operation) {
    const keyMap = {
      read: 'fileSystem.readError',
      write: 'fileSystem.writeError',
      notFound: 'fileSystem.fileNotFound',
      permission: 'fileSystem.permissionDenied',
    } as const;
    message = t('errors', keyMap[operation], { path });
  } else {
    message = t('errors', 'fileSystem.readError', { path });
  }

  return { type: 'FileSystemError', message, path };
};

export const createViolationError = (violations: Violations, customMessage?: string): ViolationError => ({
  type: 'ViolationError',
  violations,
  message: customMessage || t('errors', 'violation.prSizeExceeded'),
});

export const createDiffError = (
  source: 'local-git' | 'github-api' | 'both',
  details?: string,
  customMessage?: string,
): DiffError => ({
  type: 'DiffError',
  source,
  message: customMessage || t('errors', 'analysis.diffError', { message: details || 'unknown error' }),
});

export const createPatternError = (pattern: string, customMessage?: string): PatternError => ({
  type: 'PatternError',
  pattern,
  message: customMessage || t('errors', 'pattern.invalidPattern', { pattern }),
});

export const createCacheError = (key?: string, details?: string, customMessage?: string): CacheError => {
  const message = customMessage || t('errors', 'analysis.cacheError', { message: details || 'cache operation failed' });
  const error: CacheError = { type: 'CacheError', message };
  return withOptionalField(error, 'key', key);
};

export const createComplexityAnalysisError = (
  reason: ComplexityAnalysisError['reason'],
  options?: Partial<Pick<ComplexityAnalysisError, 'filename' | 'details' | 'fileSize' | 'maxSize' | 'timeoutSeconds'>>,
  customMessage?: string,
): ComplexityAnalysisError => {
  const message =
    customMessage || t('errors', 'analysis.complexityAnalysisError', { message: options?.details || reason });

  const error: ComplexityAnalysisError = {
    type: 'ComplexityAnalysisError',
    reason,
    message,
  };
  if (options?.filename !== undefined) {
    error.filename = options.filename;
  }
  if (options?.details !== undefined) {
    error.details = options.details;
  }
  if (options?.fileSize !== undefined) {
    error.fileSize = options.fileSize;
  }
  if (options?.maxSize !== undefined) {
    error.maxSize = options.maxSize;
  }
  if (options?.timeoutSeconds !== undefined) {
    error.timeoutSeconds = options.timeoutSeconds;
  }
  return error;
};

export const createPermissionError = (required: string, customMessage?: string): PermissionError => ({
  type: 'PermissionError',
  required,
  message: customMessage || t('errors', 'github.permissionDenied', { operation: required }),
});

export const createRateLimitError = (retryAfter?: number, customMessage?: string): RateLimitError => {
  const resetTime = retryAfter ? new Date(Date.now() + retryAfter * 1000).toISOString() : 'unknown';
  const message = customMessage || t('errors', 'github.rateLimitExceeded', { resetTime });
  const error: RateLimitError = { type: 'RateLimitError', message };
  return withOptionalField(error, 'retryAfter', retryAfter);
};

export const createUnexpectedError = (originalError?: unknown, customMessage?: string): UnexpectedError => {
  const details = ensureError(originalError, 'unknown error').message;
  const message = customMessage || `Unexpected error occurred: ${details}`;
  const error: UnexpectedError = { type: 'UnexpectedError', message };
  return withOptionalField(error, 'originalError', originalError);
};
