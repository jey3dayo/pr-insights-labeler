import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseActionInputs } from '../src/input-parser.js';

vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
}));

describe('parseActionInputs', () => {
  const mockGetInput = vi.mocked(core.getInput);

  const defaultSizeThresholds = '{"small": 100, "medium": 500, "large": 1000, "xlarge": 2000}';
  const defaultComplexityThresholds = '{"medium": 10, "high": 20}';

  const buildInputs = (overrides: Partial<Record<string, string>> = {}): ((name: string) => string) => {
    const defaults: Record<string, string> = {
      language: '',
      github_token: 'test-token',
      file_size_limit: '100KB',
      file_size_limit_enabled: 'true',
      file_lines_limit: '1000',
      file_lines_limit_enabled: 'true',
      pr_additions_limit: '5000',
      pr_additions_limit_enabled: 'true',
      pr_files_limit: '100',
      pr_files_limit_enabled: 'true',
      size_enabled: 'true',
      size_thresholds: defaultSizeThresholds,
      complexity_enabled: 'false',
      complexity_thresholds: defaultComplexityThresholds,
      category_enabled: 'true',
      risk_enabled: 'true',
      large_files_label: 'auto/large-files',
      too_many_files_label: 'auto/too-many-files',
      too_many_lines_label: 'auto/too-many-lines',
      excessive_changes_label: 'auto/excessive-changes',
      skip_draft_pr: 'true',
      comment_on_pr: 'auto',
      fail_on_large_files: '',
      fail_on_too_many_files: '',
      fail_on_pr_size: '',
      enable_summary: 'true',
      additional_exclude_patterns: '',
      enable_directory_labeling: 'false',
      directory_labeler_config_path: '.github/directory-labeler.yml',
      max_labels: '0',
      use_default_excludes: 'true',
    };

    return (name: string) => {
      if (name in overrides) {
        return overrides[name] ?? '';
      }
      return defaults[name] ?? '';
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetInput.mockImplementation(buildInputs());
  });

  describe('successful parsing', () => {
    it('should parse all inputs successfully with default values', () => {
      const result = parseActionInputs();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        return;
      }

      const parsed = result.value;
      expect(parsed.language).toBeUndefined();
      expect(parsed.githubToken).toBe('test-token');
      expect(parsed.fileSizeLimit).toBe(102400);
      expect(parsed.fileSizeLimitEnabled).toBe(true);
      expect(parsed.fileLinesLimit).toBe(1000);
      expect(parsed.fileLinesLimitEnabled).toBe(true);
      expect(parsed.prAdditionsLimitEnabled).toBe(true);
      expect(parsed.prFilesLimitEnabled).toBe(true);
      expect(parsed.sizeEnabled).toBe(true);
      expect(parsed.complexityEnabled).toBe(false);
    });

    it('should convert empty string language to undefined', () => {
      mockGetInput.mockImplementation((name: string) => {
        const defaults: Record<string, string> = {
          language: '',
          github_token: 'test-token',
          file_size_limit: '100KB',
          file_size_limit_enabled: 'true',
          file_lines_limit: '1000',
          file_lines_limit_enabled: 'true',
          pr_additions_limit: '5000',
          pr_additions_limit_enabled: 'true',
          pr_files_limit: '100',
          pr_files_limit_enabled: 'true',
          size_enabled: 'true',
          size_thresholds: '{"small": 100, "medium": 500, "large": 1000, "xlarge": 2000}',
          complexity_enabled: 'false',
          complexity_thresholds: '{"medium": 10, "high": 20}',
          category_enabled: 'true',
          risk_enabled: 'true',
        };
        return defaults[name] ?? '';
      });

      const result = parseActionInputs();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        return;
      }
      expect(result.value.language).toBeUndefined();
    });

    it('should parse file_lines_limit_enabled as boolean', () => {
      mockGetInput.mockImplementation(buildInputs({ file_lines_limit_enabled: 'false' }));

      const result = parseActionInputs();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        return;
      }
      expect(result.value.fileLinesLimitEnabled).toBe(false);
    });

    it('should parse file_size_limit_enabled as boolean', () => {
      mockGetInput.mockImplementation(buildInputs({ file_size_limit_enabled: 'false' }));

      const result = parseActionInputs();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        return;
      }
      expect(result.value.fileSizeLimitEnabled).toBe(false);
    });

    it('should parse pr_additions_limit_enabled as boolean', () => {
      mockGetInput.mockImplementation(buildInputs({ pr_additions_limit_enabled: 'false' }));

      const result = parseActionInputs();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        return;
      }
      expect(result.value.prAdditionsLimitEnabled).toBe(false);
    });

    it('should parse pr_files_limit_enabled as boolean', () => {
      mockGetInput.mockImplementation(buildInputs({ pr_files_limit_enabled: 'false' }));

      const result = parseActionInputs();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        return;
      }
      expect(result.value.prFilesLimitEnabled).toBe(false);
    });

    it('should preserve non-empty language value', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'language') {
          return 'ja';
        }
        if (name === 'github_token') {
          return 'test-token';
        }
        if (name === 'file_size_limit') {
          return '100KB';
        }
        if (name === 'file_size_limit_enabled') {
          return 'true';
        }
        if (name === 'file_lines_limit') {
          return '1000';
        }
        if (name === 'file_lines_limit_enabled') {
          return 'true';
        }
        if (name === 'pr_additions_limit') {
          return '5000';
        }
        if (name === 'pr_additions_limit_enabled') {
          return 'true';
        }
        if (name === 'pr_files_limit') {
          return '100';
        }
        if (name === 'pr_files_limit_enabled') {
          return 'true';
        }
        if (name === 'size_enabled') {
          return 'true';
        }
        if (name === 'size_thresholds') {
          return '{"small": 100, "medium": 500, "large": 1000, "xlarge": 2000}';
        }
        if (name === 'complexity_enabled') {
          return 'false';
        }
        if (name === 'complexity_thresholds') {
          return '{"medium": 10, "high": 20}';
        }
        if (name === 'category_enabled') {
          return 'true';
        }
        if (name === 'risk_enabled') {
          return 'true';
        }
        return '';
      });

      const result = parseActionInputs();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        return;
      }
      expect(result.value.language).toBe('ja');
    });
  });

  describe('error handling', () => {
    it('should return error for missing github_token', () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === 'github_token') {
          return '';
        }
        return 'default';
      });

      const result = parseActionInputs();

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        return;
      }
      expect(result.error.message).toContain('GitHub token is required');
    });

    it('should return error for invalid size thresholds (not monotonic)', () => {
      mockGetInput.mockImplementation((name: string) => {
        const defaults: Record<string, string> = {
          github_token: 'test-token',
          file_size_limit: '100KB',
          file_size_limit_enabled: 'true',
          file_lines_limit: '1000',
          file_lines_limit_enabled: 'true',
          pr_additions_limit: '5000',
          pr_additions_limit_enabled: 'true',
          pr_files_limit: '100',
          pr_files_limit_enabled: 'true',
          size_enabled: 'true',
          size_thresholds: '{"small": 1000, "medium": 500, "large": 100, "xlarge": 2000}',
          complexity_enabled: 'false',
          complexity_thresholds: '{"medium": 10, "high": 20}',
          category_enabled: 'true',
          risk_enabled: 'true',
        };
        return defaults[name] ?? '';
      });

      const result = parseActionInputs();

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        return;
      }
      expect(result.error.message).toContain('must be less than');
    });

    it('should return error for invalid boolean value', () => {
      mockGetInput.mockImplementation((name: string) => {
        const defaults: Record<string, string> = {
          github_token: 'test-token',
          file_size_limit: '100KB',
          file_size_limit_enabled: 'true',
          file_lines_limit: '1000',
          file_lines_limit_enabled: 'true',
          pr_additions_limit: '5000',
          pr_additions_limit_enabled: 'true',
          pr_files_limit: '100',
          pr_files_limit_enabled: 'true',
          size_enabled: 'invalid',
          size_thresholds: '{"small": 100, "medium": 500, "large": 1000, "xlarge": 2000}',
          complexity_enabled: 'false',
          complexity_thresholds: '{"medium": 10, "high": 20}',
          category_enabled: 'true',
          risk_enabled: 'true',
        };
        return defaults[name] ?? '';
      });

      const result = parseActionInputs();

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        return;
      }
      expect(result.error.message).toContain('Invalid boolean value');
    });

    it('should return error for invalid JSON in size thresholds', () => {
      mockGetInput.mockImplementation((name: string) => {
        const defaults: Record<string, string> = {
          github_token: 'test-token',
          file_size_limit: '100KB',
          file_size_limit_enabled: 'true',
          file_lines_limit: '1000',
          file_lines_limit_enabled: 'true',
          pr_additions_limit: '5000',
          pr_additions_limit_enabled: 'true',
          pr_files_limit: '100',
          pr_files_limit_enabled: 'true',
          size_enabled: 'true',
          size_thresholds: '{invalid json}',
          complexity_enabled: 'false',
          complexity_thresholds: '{"medium": 10, "high": 20}',
          category_enabled: 'true',
          risk_enabled: 'true',
        };
        return defaults[name] ?? '';
      });

      const result = parseActionInputs();

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        return;
      }
      expect(result.error.message).toContain('Invalid JSON');
    });
  });

  describe('size parser integration', () => {
    it('should parse size strings correctly', () => {
      mockGetInput.mockImplementation((name: string) => {
        const defaults: Record<string, string> = {
          github_token: 'test-token',
          file_size_limit: '1MB',
          file_size_limit_enabled: 'true',
          file_lines_limit: '1000',
          file_lines_limit_enabled: 'true',
          pr_additions_limit: '5000',
          pr_additions_limit_enabled: 'true',
          pr_files_limit: '100',
          pr_files_limit_enabled: 'true',
          size_enabled: 'true',
          size_thresholds: '{"small": 100, "medium": 500, "large": 1000, "xlarge": 2000}',
          complexity_enabled: 'false',
          complexity_thresholds: '{"medium": 10, "high": 20}',
          category_enabled: 'true',
          risk_enabled: 'true',
        };
        return defaults[name] ?? '';
      });

      const result = parseActionInputs();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        return;
      }
      expect(result.value.fileSizeLimit).toBe(1048576);
    });
  });
});
