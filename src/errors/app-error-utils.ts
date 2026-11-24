import { isNumber } from '../utils/type-guards.js';
import { createUnexpectedError } from './factories.js';
import { isErrorWithTypeAndMessage } from './guards.js';
import { ensureError } from './helpers.js';
import type {
  AppError,
  ConfigurationError,
  FileAnalysisError,
  FileSystemError,
  GitHubAPIError,
  ParseError,
} from './types.js';

function isAppError(value: unknown): value is AppError {
  return isErrorWithTypeAndMessage(value) && value.type.endsWith('Error');
}

function formatGitHubApiError(error: GitHubAPIError): string {
  const statusInfo = error.status !== undefined ? ` (status ${error.status})` : '';
  return `[GitHubAPIError${statusInfo}] ${error.message}`;
}

function formatConfigurationError(error: ConfigurationError): string {
  return `[ConfigurationError:${error.field}] ${error.message}`;
}

function formatParseError(error: ParseError): string {
  return `[ParseError:${error.input}] ${error.message}`;
}

function formatFileAnalysisError(error: FileAnalysisError): string {
  return `[FileAnalysisError:${error.file}] ${error.message}`;
}

function formatFileSystemError(error: FileSystemError): string {
  const pathInfo = error.path ? ` (${error.path})` : '';
  return `[FileSystemError${pathInfo}] ${error.message}`;
}

function formatRateLimitError(error: AppError & { type: 'RateLimitError'; retryAfter?: number }): string {
  const waitInfo = isNumber(error.retryAfter) ? ` (retry after ${error.retryAfter}s)` : '';
  return `[RateLimitError${waitInfo}] ${error.message}`;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  const ensured = ensureError(error);
  return createUnexpectedError(ensured, ensured.message);
}

export function formatAppError(error: AppError): string {
  const errorType = error.type;
  const errorMessage = error.message;

  if (error.type === 'GitHubAPIError') {
    return formatGitHubApiError(error);
  }
  if (error.type === 'ConfigurationError') {
    return formatConfigurationError(error);
  }
  if (error.type === 'ParseError') {
    return formatParseError(error);
  }
  if (error.type === 'FileAnalysisError') {
    return formatFileAnalysisError(error);
  }
  if (error.type === 'FileSystemError') {
    return formatFileSystemError(error);
  }
  if (error.type === 'RateLimitError') {
    return formatRateLimitError(error);
  }

  return `[${errorType}] ${errorMessage}`;
}
