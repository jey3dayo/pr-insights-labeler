import { err, ok, Result } from 'neverthrow';
import { beforeEach, describe, expect, it } from 'vitest';

import type {
  AppError,
  CacheError,
  ConfigurationError,
  DiffError,
  FileAnalysisError,
  FileSystemError,
  GitHubAPIError,
  ParseError,
  PatternError,
  ViolationError,
} from '../src/errors';
import {
  createCacheError,
  createConfigurationError,
  createDiffError,
  createFileAnalysisError,
  createFileSystemError,
  createGitHubAPIError,
  createParseError,
  createPatternError,
  createViolationError,
  isError,
  isErrorWithMessage,
  isErrorWithTypeAndMessage,
  isObject,
  isString,
} from '../src/errors';
import { initializeI18n, resetI18n } from '../src/i18n.js';

describe('Error Types', () => {
  describe('FileAnalysisError', () => {
    it('should create FileAnalysisError with required fields', () => {
      const error: FileAnalysisError = {
        type: 'FileAnalysisError',
        file: 'src/large-file.ts',
        message: 'Failed to analyze file',
      };

      expect(error.type).toBe('FileAnalysisError');
      expect(error.file).toBe('src/large-file.ts');
      expect(error.message).toBe('Failed to analyze file');
    });
  });

  describe('GitHubAPIError', () => {
    it('should create GitHubAPIError with optional status', () => {
      const error: GitHubAPIError = {
        type: 'GitHubAPIError',
        status: 403,
        message: 'API rate limit exceeded',
      };

      expect(error.type).toBe('GitHubAPIError');
      expect(error.status).toBe(403);
      expect(error.message).toBe('API rate limit exceeded');
    });

    it('should create GitHubAPIError without status', () => {
      const error: GitHubAPIError = {
        type: 'GitHubAPIError',
        message: 'Network error',
      };

      expect(error.type).toBe('GitHubAPIError');
      expect(error.status).toBeUndefined();
      expect(error.message).toBe('Network error');
    });
  });

  describe('ConfigurationError', () => {
    it('should create ConfigurationError with field details', () => {
      const error: ConfigurationError = {
        type: 'ConfigurationError',
        field: 'github_token',
        value: undefined,
        message: 'GitHub token is required',
      };

      expect(error.type).toBe('ConfigurationError');
      expect(error.field).toBe('github_token');
      expect(error.value).toBeUndefined();
      expect(error.message).toBe('GitHub token is required');
    });
  });

  describe('ParseError', () => {
    it('should create ParseError with input details', () => {
      const error: ParseError = {
        type: 'ParseError',
        input: '100GB',
        message: 'Invalid size format',
      };

      expect(error.type).toBe('ParseError');
      expect(error.input).toBe('100GB');
      expect(error.message).toBe('Invalid size format');
    });
  });

  describe('FileSystemError', () => {
    it('should create FileSystemError with optional path', () => {
      const error: FileSystemError = {
        type: 'FileSystemError',
        path: '/src/missing.ts',
        message: 'File not found',
      };

      expect(error.type).toBe('FileSystemError');
      expect(error.path).toBe('/src/missing.ts');
      expect(error.message).toBe('File not found');
    });
  });

  describe('ViolationError', () => {
    it('should create ViolationError with violations', () => {
      const error: ViolationError = {
        type: 'ViolationError',
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: true,
          exceedsFileCount: false,
        },
        message: 'PR exceeds limits',
      };

      expect(error.type).toBe('ViolationError');
      expect(error.violations.exceedsAdditions).toBe(true);
      expect(error.violations.exceedsFileCount).toBe(false);
      expect(error.message).toBe('PR exceeds limits');
    });
  });

  describe('DiffError', () => {
    it('should create DiffError with source', () => {
      const error: DiffError = {
        type: 'DiffError',
        source: 'local-git',
        message: 'Failed to get diff',
      };

      expect(error.type).toBe('DiffError');
      expect(error.source).toBe('local-git');
      expect(error.message).toBe('Failed to get diff');
    });
  });

  describe('PatternError', () => {
    it('should create PatternError with pattern details', () => {
      const error: PatternError = {
        type: 'PatternError',
        pattern: '**[invalid',
        message: 'Invalid glob pattern',
      };

      expect(error.type).toBe('PatternError');
      expect(error.pattern).toBe('**[invalid');
      expect(error.message).toBe('Invalid glob pattern');
    });
  });

  describe('CacheError', () => {
    it('should create CacheError with optional key', () => {
      const error: CacheError = {
        type: 'CacheError',
        key: 'file:size:src/index.ts',
        message: 'Cache retrieval failed',
      };

      expect(error.type).toBe('CacheError');
      expect(error.key).toBe('file:size:src/index.ts');
      expect(error.message).toBe('Cache retrieval failed');
    });
  });

  describe('AppError union type', () => {
    it('should accept all error types', () => {
      const errors: AppError[] = [
        { type: 'FileAnalysisError', file: 'test.ts', message: 'test' },
        { type: 'GitHubAPIError', message: 'test' },
        { type: 'ConfigurationError', field: 'test', value: null, message: 'test' },
        { type: 'ParseError', input: 'test', message: 'test' },
        { type: 'FileSystemError', message: 'test' },
        {
          type: 'ViolationError',
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          message: 'test',
        },
        { type: 'DiffError', source: 'github-api', message: 'test' },
        { type: 'PatternError', pattern: 'test', message: 'test' },
        { type: 'CacheError', message: 'test' },
      ];

      expect(errors).toHaveLength(9);
      errors.forEach(error => {
        expect(error.type).toBeDefined();
        expect(error.message).toBe('test');
      });
    });
  });
});

describe('Result Type Utilities', () => {
  describe('Result creation', () => {
    it('should create successful result with ok', () => {
      const result: Result<number, never> = ok(42);
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it('should create error result with err', () => {
      const error: AppError = {
        type: 'ConfigurationError',
        field: 'test',
        value: null,
        message: 'Test error',
      };
      const result: Result<never, AppError> = err(error);
      expect(result.isErr()).toBe(true);
      expect(result.isOk()).toBe(false);
      if (result.isErr()) {
        expect(result.error).toEqual(error);
      }
    });
  });

  describe('Result chaining', () => {
    it('should chain successful operations with map', () => {
      const result = ok(10)
        .map(x => x * 2)
        .map(x => x + 5);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(25);
      }
    });

    it('should short-circuit on error with map', () => {
      const error: ParseError = {
        type: 'ParseError',
        input: 'invalid',
        message: 'Parse failed',
      };

      const result = err<number, ParseError>(error)
        .map(x => x * 2)
        .map(x => x + 5);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(error);
      }
    });

    it('should chain with andThen for Result-returning functions', () => {
      const parseNumber = (s: string): Result<number, ParseError> => {
        const n = Number(s);
        if (isNaN(n)) {
          return err({
            type: 'ParseError',
            input: s,
            message: `Invalid number: ${s}`,
          });
        }
        return ok(n);
      };

      const result1 = ok('42').andThen(parseNumber);
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toBe(42);
      }

      const result2 = ok('invalid').andThen(parseNumber);
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.type).toBe('ParseError');
      }
    });
  });

  describe('Result error handling', () => {
    it('should handle errors with mapErr', () => {
      const parseError: ParseError = {
        type: 'ParseError',
        input: 'test',
        message: 'Parse failed',
      };

      const configError: ConfigurationError = {
        type: 'ConfigurationError',
        field: 'size',
        value: 'test',
        message: 'Invalid size configuration',
      };

      const result = err<number, ParseError>(parseError).mapErr((): ConfigurationError => configError);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(configError);
      }
    });

    it('should recover with orElse', () => {
      const error: AppError = {
        type: 'ParseError',
        input: 'invalid',
        message: 'Parse failed',
      };

      const result = err<number, AppError>(error).orElse(() => ok(100));

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(100);
      }
    });
  });

  describe('Result unwrapping', () => {
    it('should unwrap with unwrapOr', () => {
      const successResult = ok(42);
      const errorResult = err<number, AppError>({
        type: 'ParseError',
        input: 'test',
        message: 'error',
      });

      expect(successResult.unwrapOr(0)).toBe(42);
      expect(errorResult.unwrapOr(0)).toBe(0);
    });

    it('should match on Result', () => {
      const result: Result<number, AppError> = ok(42);

      const value = result.match(
        value => `Success: ${value}`,
        error => `Error: ${error.message}`,
      );

      expect(value).toBe('Success: 42');
    });
  });
});

describe('Error Factory Functions', () => {
  beforeEach(() => {
    const originalLang = process.env['LANG'];
    const originalLanguage = process.env['LANGUAGE'];
    delete process.env['LANG'];
    delete process.env['LANGUAGE'];

    resetI18n();
    initializeI18n('en');

    if (originalLang) {
      process.env['LANG'] = originalLang;
    }
    if (originalLanguage) {
      process.env['LANGUAGE'] = originalLanguage;
    }
  });

  describe('createFileAnalysisError', () => {
    it('should create FileAnalysisError with correct structure', () => {
      const error = createFileAnalysisError('src/test.ts', 'Analysis failed');

      expect(error.type).toBe('FileAnalysisError');
      expect(error.file).toBe('src/test.ts');
      expect(error.message).toBe('Analysis failed');
    });
  });

  describe('createGitHubAPIError', () => {
    it('should create GitHubAPIError with status', () => {
      const error = createGitHubAPIError('API rate limit exceeded', 403);

      expect(error.type).toBe('GitHubAPIError');
      expect(error.status).toBe(403);
      expect(error.message).toBe('GitHub API error: API rate limit exceeded');
    });

    it('should create GitHubAPIError without status', () => {
      const error = createGitHubAPIError('Network error');

      expect(error.type).toBe('GitHubAPIError');
      expect(error.status).toBeUndefined();
      expect(error.message).toBe('GitHub API error: Network error');
    });
  });

  describe('createConfigurationError', () => {
    it('should create ConfigurationError with all fields', () => {
      const error = createConfigurationError('github_token', undefined, 'Token is required');

      expect(error.type).toBe('ConfigurationError');
      expect(error.field).toBe('github_token');
      expect(error.value).toBeUndefined();
      expect(error.message).toBe('Token is required');
    });

    it('should create ConfigurationError with invalid value', () => {
      const error = createConfigurationError('file_size_limit', '999TB', 'Invalid size format');

      expect(error.type).toBe('ConfigurationError');
      expect(error.field).toBe('file_size_limit');
      expect(error.value).toBe('999TB');
      expect(error.message).toBe('Invalid size format');
    });
  });

  describe('createParseError', () => {
    it('should create ParseError with input and message', () => {
      const error = createParseError('100GB', 'Invalid size format');

      expect(error.type).toBe('ParseError');
      expect(error.input).toBe('100GB');
      expect(error.message).toBe('Invalid size format');
    });
  });

  describe('createFileSystemError', () => {
    it('should create FileSystemError with path and operation', () => {
      const error = createFileSystemError('/src/missing.ts', 'notFound');

      expect(error.type).toBe('FileSystemError');
      expect(error.path).toBe('/src/missing.ts');
      expect(error.message).toBe('File not found: /src/missing.ts');
    });

    it('should create FileSystemError with custom message', () => {
      const error = createFileSystemError('/src/file.ts', undefined, 'Permission denied');

      expect(error.type).toBe('FileSystemError');
      expect(error.path).toBe('/src/file.ts');
      expect(error.message).toBe('Permission denied');
    });
  });

  describe('createViolationError', () => {
    it('should create ViolationError with violations', () => {
      const violations = {
        largeFiles: [
          {
            file: 'src/large.ts',
            actualValue: 150000,
            limit: 102400,
            violationType: 'size' as const,
            severity: 'critical' as const,
          },
        ],
        exceedsFileLines: [],
        exceedsAdditions: true,
        exceedsFileCount: false,
      };
      const error = createViolationError(violations, 'PR exceeds limits');

      expect(error.type).toBe('ViolationError');
      expect(error.violations).toEqual(violations);
      expect(error.violations.largeFiles).toHaveLength(1);
      expect(error.violations.exceedsAdditions).toBe(true);
      expect(error.message).toBe('PR exceeds limits');
    });
  });

  describe('createDiffError', () => {
    it('should create DiffError with local-git source', () => {
      const error = createDiffError('local-git', 'git command failed');

      expect(error.type).toBe('DiffError');
      expect(error.source).toBe('local-git');
      expect(error.message).toBe('Failed to get diff: git command failed');
    });

    it('should create DiffError with github-api source', () => {
      const error = createDiffError('github-api', 'API request failed');

      expect(error.type).toBe('DiffError');
      expect(error.source).toBe('github-api');
      expect(error.message).toBe('Failed to get diff: API request failed');
    });

    it('should create DiffError with both source', () => {
      const error = createDiffError('both', 'All diff strategies failed');

      expect(error.type).toBe('DiffError');
      expect(error.source).toBe('both');
      expect(error.message).toBe('Failed to get diff: All diff strategies failed');
    });
  });

  describe('createPatternError', () => {
    it('should create PatternError with pattern details', () => {
      const error = createPatternError('**[invalid', 'Invalid glob pattern syntax');

      expect(error.type).toBe('PatternError');
      expect(error.pattern).toBe('**[invalid');
      expect(error.message).toBe('Invalid glob pattern syntax');
    });
  });

  describe('createCacheError', () => {
    it('should create CacheError with key and details', () => {
      const error = createCacheError('file:123:size', 'Cache miss');

      expect(error.type).toBe('CacheError');
      expect(error.key).toBe('file:123:size');
      expect(error.message).toBe('Cache error: Cache miss');
    });

    it('should create CacheError with custom message', () => {
      const error = createCacheError(undefined, undefined, 'Cache unavailable');

      expect(error.type).toBe('CacheError');
      expect(error.key).toBeUndefined();
      expect(error.message).toBe('Cache unavailable');
    });
  });
});

describe('Type Guards', () => {
  describe('isError', () => {
    it('should return true for Error instances', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError(new TypeError('test'))).toBe(true);
      expect(isError(new RangeError('test'))).toBe(true);
    });

    it('should return false for non-Error values', () => {
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError('error')).toBe(false);
      expect(isError(123)).toBe(false);
      expect(isError({})).toBe(false);
      expect(isError({ message: 'error' })).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
      expect(isObject([])).toBe(false);
      expect(isObject(new Date())).toBe(true);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isObject(undefined)).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
    });
  });

  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
      expect(isString('123')).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString(123)).toBe(false);
      expect(isString(true)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe('isErrorWithMessage', () => {
    it('should return true for objects with string message property', () => {
      expect(isErrorWithMessage({ message: 'error' })).toBe(true);
      expect(isErrorWithMessage({ message: 'error', other: 123 })).toBe(true);
      expect(isErrorWithMessage(new Error('test'))).toBe(true);
    });

    it('should return false for objects without message property', () => {
      expect(isErrorWithMessage({})).toBe(false);
      expect(isErrorWithMessage({ msg: 'error' })).toBe(false);
    });

    it('should return false for objects with non-string message', () => {
      expect(isErrorWithMessage({ message: 123 })).toBe(false);
      expect(isErrorWithMessage({ message: null })).toBe(false);
      expect(isErrorWithMessage({ message: undefined })).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isErrorWithMessage(null)).toBe(false);
      expect(isErrorWithMessage(undefined)).toBe(false);
      expect(isErrorWithMessage('error')).toBe(false);
      expect(isErrorWithMessage(123)).toBe(false);
    });
  });

  describe('isErrorWithTypeAndMessage', () => {
    it('should return true for objects with type and message properties', () => {
      expect(isErrorWithTypeAndMessage({ type: 'Error', message: 'error' })).toBe(true);
      expect(isErrorWithTypeAndMessage({ type: 'CustomError', message: 'error', other: 123 })).toBe(true);
    });

    it('should return false for objects missing type property', () => {
      expect(isErrorWithTypeAndMessage({ message: 'error' })).toBe(false);
    });

    it('should return false for objects missing message property', () => {
      expect(isErrorWithTypeAndMessage({ type: 'Error' })).toBe(false);
    });

    it('should return false for objects with non-string type', () => {
      expect(isErrorWithTypeAndMessage({ type: 123, message: 'error' })).toBe(false);
      expect(isErrorWithTypeAndMessage({ type: null, message: 'error' })).toBe(false);
    });

    it('should return false for objects with non-string message', () => {
      expect(isErrorWithTypeAndMessage({ type: 'Error', message: 123 })).toBe(false);
      expect(isErrorWithTypeAndMessage({ type: 'Error', message: null })).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isErrorWithTypeAndMessage(null)).toBe(false);
      expect(isErrorWithTypeAndMessage(undefined)).toBe(false);
      expect(isErrorWithTypeAndMessage('error')).toBe(false);
      expect(isErrorWithTypeAndMessage(123)).toBe(false);
    });

    it('should work with AppError types', () => {
      const fileError: FileAnalysisError = {
        type: 'FileAnalysisError',
        file: 'test.ts',
        message: 'Analysis failed',
      };
      expect(isErrorWithTypeAndMessage(fileError)).toBe(true);

      const gitHubError: GitHubAPIError = {
        type: 'GitHubAPIError',
        message: 'API error',
      };
      expect(isErrorWithTypeAndMessage(gitHubError)).toBe(true);
    });
  });
});
