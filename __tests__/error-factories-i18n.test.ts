import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
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
} from '../src/errors/factories.js';
import { changeLanguage, initializeI18n, resetI18n } from '../src/i18n.js';

describe('Error Factories - i18n Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env['LANGUAGE'];
    delete process.env['LANG'];
    resetI18n();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('English Error Messages', () => {
    beforeEach(() => {
      initializeI18n('en');
    });

    it('createConfigurationError - should return English message', () => {
      const error = createConfigurationError('language', 'invalid');

      expect(error.type).toBe('ConfigurationError');
      expect(error.field).toBe('language');
      expect(error.value).toBe('invalid');
      expect(error.message).toContain('Invalid configuration field');
      expect(error.message).toContain('language');
    });

    it('createGitHubAPIError - should return English message', () => {
      const error = createGitHubAPIError('API request failed', 404);

      expect(error.type).toBe('GitHubAPIError');
      expect(error.message).toContain('GitHub API error');
      expect(error.message).toContain('API request failed');
      expect(error.status).toBe(404);
    });

    it('createFileSystemError - should return English message', () => {
      const error = createFileSystemError('/path/to/file', 'read');

      expect(error.type).toBe('FileSystemError');
      expect(error.message).toContain('Failed to read file');
      expect(error.message).toContain('/path/to/file');
      expect(error.path).toBe('/path/to/file');
    });

    it('createParseError - should return English message', () => {
      const error = createParseError('100XYZ');

      expect(error.type).toBe('ParseError');
      expect(error.message).toContain('Invalid format');
      expect(error.message).toContain('100XYZ');
      expect(error.input).toBe('100XYZ');
    });

    it('createFileAnalysisError - should return English message', () => {
      const error = createFileAnalysisError('src/test.ts');

      expect(error.type).toBe('FileAnalysisError');
      expect(error.message).toContain('Failed to analyze file');
      expect(error.message).toContain('src/test.ts');
      expect(error.file).toBe('src/test.ts');
    });
  });

  describe('Japanese Error Messages', () => {
    beforeEach(() => {
      initializeI18n('ja');
    });

    it('createConfigurationError - should return Japanese message', () => {
      const error = createConfigurationError('language', 'invalid');

      expect(error.type).toBe('ConfigurationError');
      expect(error.field).toBe('language');
      expect(error.value).toBe('invalid');
      expect(error.message).toContain('設定フィールドが無効です');
      expect(error.message).toContain('language');
    });

    it('createGitHubAPIError - should return Japanese message', () => {
      const error = createGitHubAPIError('APIリクエストが失敗しました', 404);

      expect(error.type).toBe('GitHubAPIError');
      expect(error.message).toContain('GitHub APIエラー');
      expect(error.message).toContain('APIリクエストが失敗しました');
      expect(error.status).toBe(404);
    });

    it('createFileSystemError - should return Japanese message', () => {
      const error = createFileSystemError('/path/to/file', 'read');

      expect(error.type).toBe('FileSystemError');
      expect(error.message).toContain('ファイルの読み込みに失敗しました');
      expect(error.message).toContain('/path/to/file');
      expect(error.path).toBe('/path/to/file');
    });

    it('createParseError - should return Japanese message', () => {
      const error = createParseError('100XYZ');

      expect(error.type).toBe('ParseError');
      expect(error.message).toContain('無効な形式');
      expect(error.message).toContain('100XYZ');
      expect(error.input).toBe('100XYZ');
    });

    it('createFileAnalysisError - should return Japanese message', () => {
      const error = createFileAnalysisError('src/test.ts');

      expect(error.type).toBe('FileAnalysisError');
      expect(error.message).toContain('ファイルの分析に失敗しました');
      expect(error.message).toContain('src/test.ts');
      expect(error.file).toBe('src/test.ts');
    });
  });

  describe('Language Switching', () => {
    it('should use correct language when language is switched', () => {
      initializeI18n('en');
      const errorEn = createConfigurationError('field1', 'value1');
      expect(errorEn.message).toContain('Invalid configuration field');

      changeLanguage('ja');
      const errorJa = createConfigurationError('field2', 'value2');
      expect(errorJa.message).toContain('設定フィールドが無効です');
    });
  });

  describe('Technical Details Preservation', () => {
    it('should preserve file paths in error messages', () => {
      initializeI18n('ja');
      const error = createFileSystemError('/path/to/missing.ts', 'notFound');

      expect(error.path).toBe('/path/to/missing.ts');
      expect(error.message).toContain('/path/to/missing.ts');
    });

    it('should preserve error codes and technical identifiers', () => {
      initializeI18n('ja');
      const error = createGitHubAPIError('認証に失敗しました', 401);

      expect(error.status).toBe(401);
    });

    it('should preserve pattern strings in error messages', () => {
      initializeI18n('ja');
      const error = createPatternError('**/*.test.ts');

      expect(error.pattern).toBe('**/*.test.ts');
      expect(error.message).toContain('**/*.test.ts');
    });
  });

  describe('All Error Factory Functions', () => {
    beforeEach(() => {
      initializeI18n('en');
    });

    it('createDiffError - should work with translation', () => {
      const error = createDiffError('local-git', 'git command failed');
      expect(error.type).toBe('DiffError');
      expect(error.source).toBe('local-git');
      expect(error.message).toContain('Failed to get diff');
    });

    it('createPatternError - should work with translation', () => {
      const error = createPatternError('*.invalid');
      expect(error.type).toBe('PatternError');
      expect(error.pattern).toBe('*.invalid');
      expect(error.message).toContain('Invalid pattern');
    });

    it('createCacheError - should work with translation', () => {
      const error = createCacheError('test-key');
      expect(error.type).toBe('CacheError');
      expect(error.key).toBe('test-key');
      expect(error.message).toContain('Cache error');
    });

    it('createComplexityAnalysisError - should work with translation', () => {
      const error = createComplexityAnalysisError('syntax-error', {
        filename: 'test.ts',
        details: 'Unexpected token',
      });
      expect(error.type).toBe('ComplexityAnalysisError');
      expect(error.reason).toBe('syntax-error');
      expect(error.filename).toBe('test.ts');
      expect(error.message).toContain('complexity');
    });

    it('createPermissionError - should work with translation', () => {
      const error = createPermissionError('write');
      expect(error.type).toBe('PermissionError');
      expect(error.required).toBe('write');
      expect(error.message).toContain('Permission denied');
    });

    it('createRateLimitError - should work with translation', () => {
      const error = createRateLimitError(3600);
      expect(error.type).toBe('RateLimitError');
      expect(error.retryAfter).toBe(3600);
      expect(error.message).toContain('Rate limit exceeded');
    });

    it('createUnexpectedError - should work with translation', () => {
      const originalError = new Error('Original error');
      const error = createUnexpectedError(originalError);
      expect(error.type).toBe('UnexpectedError');
      expect(error.originalError).toBe(originalError);
      expect(error.message).toContain('Unexpected');
    });

    it('createViolationError - should work with translation', () => {
      const violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };
      const error = createViolationError(violations);
      expect(error.type).toBe('ViolationError');
      expect(error.violations).toBe(violations);
      expect(error.message).toContain('exceeded');
    });
  });
});
