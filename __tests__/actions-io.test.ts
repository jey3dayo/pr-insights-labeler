import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ActionOutputs,
  getActionInputs,
  getGitHubToken,
  logDebug,
  logDebugI18n,
  logError,
  logErrorI18n,
  logInfo,
  logInfoI18n,
  logWarning,
  logWarningI18n,
  setActionOutputs,
  setFailed,
} from '../src/actions-io';
import type { AnalysisResult } from '../src/file-metrics';
import { resetI18n } from '../src/i18n';
import { writeSummaryWithAnalysis } from '../src/summary/summary-writer';
import { clearGitHubTokens, setupI18nTestEnglish, setupI18nTestJapanese } from './__fixtures__/index.js';

// Mock @actions/core
vi.mock('@actions/core');

describe('GitHub Actions I/O', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    clearGitHubTokens();

    // Initialize i18n with English for consistent test results
    setupI18nTestEnglish();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGitHubToken', () => {
    it('should get token from input parameter', () => {
      vi.mocked(core.getInput).mockReturnValue('input-token-123');

      const result = getGitHubToken();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('input-token-123');
      }
      expect(core.getInput).toHaveBeenCalledWith('github_token');
    });

    it('should fallback to GITHUB_TOKEN env variable', () => {
      vi.mocked(core.getInput).mockReturnValue('');
      process.env['GITHUB_TOKEN'] = 'env-github-token-456';

      const result = getGitHubToken();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('env-github-token-456');
      }
    });

    it('should fallback to GH_TOKEN env variable', () => {
      vi.mocked(core.getInput).mockReturnValue('');
      process.env['GH_TOKEN'] = 'env-gh-token-789';

      const result = getGitHubToken();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('env-gh-token-789');
      }
    });

    it('should prioritize input over env variables', () => {
      vi.mocked(core.getInput).mockReturnValue('input-token');
      process.env['GITHUB_TOKEN'] = 'env-token';
      process.env['GH_TOKEN'] = 'gh-token';

      const result = getGitHubToken();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('input-token');
      }
    });

    it('should return error when no token is available', () => {
      vi.mocked(core.getInput).mockReturnValue('');

      const result = getGitHubToken();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.field).toBe('github_token');
        expect(result.error.message).toContain('GitHub token is required');
      }
    });
  });

  describe('getActionInputs', () => {
    it('should get all action inputs with defaults', () => {
      const mockGetInput = vi.mocked(core.getInput);
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'test-token',
          file_size_limit: '',
          file_lines_limit: '',
          pr_additions_limit: '',
          pr_files_limit: '',
          auto_remove_labels: '',
          apply_size_labels: '',
          size_label_thresholds: '',
          large_files_label: '',
          too_many_files_label: '',
          skip_draft_pr: '',
          comment_on_pr: '',
          additional_exclude_patterns: '',
        };
        return inputs[name] || '';
      });

      const inputs = getActionInputs();

      expect(inputs.github_token).toBe('test-token');
      expect(inputs.file_size_limit).toBe('100KB');
      expect(inputs.file_lines_limit).toBe('500');
      expect(inputs.pr_additions_limit).toBe('5000');
      expect(inputs.pr_files_limit).toBe('50');
      expect(inputs.auto_remove_labels).toBe('true');
      // PR Insights Labeler - Selective Label Enabling
      expect(inputs.size_enabled).toBe('true');
      expect(inputs.size_thresholds).toBe('{"small": 100, "medium": 500, "large": 1000}');
      expect(inputs.complexity_enabled).toBe('false');
      expect(inputs.complexity_thresholds).toBe('{"medium": 15, "high": 30}');
      expect(inputs.category_enabled).toBe('true');
      expect(inputs.risk_enabled).toBe('true');
      expect(inputs.large_files_label).toBe('auto/large-files');
      expect(inputs.too_many_files_label).toBe('auto/too-many-files');
      expect(inputs.skip_draft_pr).toBe('true');
      expect(inputs.comment_on_pr).toBe('auto');
      expect(inputs.additional_exclude_patterns).toBe('');
    });

    it('should use provided values over defaults', () => {
      const mockGetInput = vi.mocked(core.getInput);
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'custom-token',
          file_size_limit: '1MB',
          file_lines_limit: '1000',
          pr_additions_limit: '10000',
          pr_files_limit: '100',
          auto_remove_labels: 'false',
          apply_size_labels: 'false',
          large_files_label: 'custom:large',
          too_many_files_label: 'custom:many-files',
          skip_draft_pr: 'false',
          comment_on_pr: 'never',
          additional_exclude_patterns: '*.test.ts,*.spec.ts',
        };
        return inputs[name] || '';
      });

      const inputs = getActionInputs();

      expect(inputs.file_size_limit).toBe('1MB');
      expect(inputs.file_lines_limit).toBe('1000');
      expect(inputs.pr_additions_limit).toBe('10000');
      expect(inputs.pr_files_limit).toBe('100');
      expect(inputs.auto_remove_labels).toBe('false');
      // PR Insights Labeler - Selective Label Enabling (expect defaults)
      expect(inputs.size_enabled).toBe('true');
      expect(inputs.complexity_enabled).toBe('false');
      expect(inputs.category_enabled).toBe('true');
      expect(inputs.risk_enabled).toBe('true');
      expect(inputs.large_files_label).toBe('custom:large');
      expect(inputs.too_many_files_label).toBe('custom:many-files');
      expect(inputs.skip_draft_pr).toBe('false');
      expect(inputs.comment_on_pr).toBe('never');
      expect(inputs.additional_exclude_patterns).toBe('*.test.ts,*.spec.ts');
    });
  });

  describe('setActionOutputs', () => {
    it('should set all output values', () => {
      const mockSetOutput = vi.mocked(core.setOutput);
      const outputs: ActionOutputs = {
        large_files: JSON.stringify([
          {
            file: 'src/large.ts',
            actualValue: 150000,
            limit: 102400,
            violationType: 'size',
            severity: 'critical',
          },
        ]),
        pr_additions: '6234',
        pr_files: '75',
        exceeds_file_size: 'true',
        exceeds_file_lines: 'false',
        exceeds_additions: 'true',
        exceeds_file_count: 'true',
        has_violations: 'true',
      };

      setActionOutputs(outputs);

      expect(mockSetOutput).toHaveBeenCalledWith('large_files', outputs.large_files);
      expect(mockSetOutput).toHaveBeenCalledWith('pr_additions', '6234');
      expect(mockSetOutput).toHaveBeenCalledWith('pr_files', '75');
      expect(mockSetOutput).toHaveBeenCalledWith('exceeds_file_size', 'true');
      expect(mockSetOutput).toHaveBeenCalledWith('exceeds_file_lines', 'false');
      expect(mockSetOutput).toHaveBeenCalledWith('exceeds_additions', 'true');
      expect(mockSetOutput).toHaveBeenCalledWith('exceeds_file_count', 'true');
      expect(mockSetOutput).toHaveBeenCalledWith('has_violations', 'true');
      expect(mockSetOutput).toHaveBeenCalledTimes(8);
    });
  });

  describe('Logging functions', () => {
    it('should call core.info for logInfo', () => {
      const mockInfo = vi.mocked(core.info);
      logInfo('Test info message');
      expect(mockInfo).toHaveBeenCalledWith('Test info message');
    });

    it('should call core.debug for logDebug', () => {
      const mockDebug = vi.mocked(core.debug);
      logDebug('Test debug message');
      expect(mockDebug).toHaveBeenCalledWith('Test debug message');
    });

    it('should call core.warning for logWarning', () => {
      const mockWarning = vi.mocked(core.warning);
      logWarning('Test warning message');
      expect(mockWarning).toHaveBeenCalledWith('Test warning message');
    });

    it('should call core.error for logError', () => {
      const mockError = vi.mocked(core.error);
      logError('Test error message');
      expect(mockError).toHaveBeenCalledWith('Test error message');
    });

    it('should call core.setFailed for setFailed', () => {
      const mockSetFailed = vi.mocked(core.setFailed);
      setFailed('Test failure message');
      expect(mockSetFailed).toHaveBeenCalledWith('Test failure message');
    });
  });

  describe('setSecret', () => {
    it('should mask sensitive values', () => {
      const mockSetSecret = vi.mocked(core.setSecret);
      vi.mocked(core.getInput).mockReturnValue('secret-token-123');

      const result = getGitHubToken();

      expect(result.isOk()).toBe(true);
      expect(mockSetSecret).toHaveBeenCalledWith('secret-token-123');
    });
  });

  describe('writeSummaryWithAnalysis', () => {
    let mockSummary: any;

    beforeEach(() => {
      mockSummary = {
        addRaw: vi.fn().mockReturnThis(),
        write: vi.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(core, 'summary', {
        get: () => mockSummary,
        configurable: true,
      });
    });

    it('should skip summary when enableSummary is false', async () => {
      const analysis: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 100,
          excludedAdditions: 0,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      const result = await writeSummaryWithAnalysis(analysis, { enableSummary: false });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.action).toBe('skipped');
      }
      expect(mockSummary.addRaw).not.toHaveBeenCalled();
      expect(mockSummary.write).not.toHaveBeenCalled();
    });

    it('should write summary when enableSummary is true', async () => {
      const analysis: AnalysisResult = {
        metrics: {
          totalFiles: 3,
          totalAdditions: 200,
          excludedAdditions: 0,
          filesAnalyzed: [
            {
              path: 'src/test.ts',
              size: 5000,
              lines: 100,
              additions: 50,
              deletions: 10,
            },
          ],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      const result = await writeSummaryWithAnalysis(analysis, { enableSummary: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.action).toBe('written');
        expect(result.value.bytesWritten).toBeGreaterThan(0);
      }
      expect(mockSummary.addRaw).toHaveBeenCalled();
      expect(mockSummary.write).toHaveBeenCalled();

      // Verify markdown content includes expected sections
      const markdown = mockSummary.addRaw.mock.calls[0][0];
      expect(markdown).toContain('# 📊 PR Metrics Overview');
      expect(markdown).toContain('### 📈 Basic Metrics');
      expect(markdown).toContain('Total Additions:');
    });

    it('should handle summary write errors gracefully', async () => {
      mockSummary.write.mockRejectedValue(new Error('Write failed'));

      const analysis: AnalysisResult = {
        metrics: {
          totalFiles: 1,
          totalAdditions: 10,
          excludedAdditions: 0,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      const result = await writeSummaryWithAnalysis(analysis, { enableSummary: true });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Failed to write GitHub Actions Summary');
      }
    });

    it('should respect custom summary title when provided', async () => {
      const analysis: AnalysisResult = {
        metrics: {
          totalFiles: 1,
          totalAdditions: 42,
          excludedAdditions: 0,
          filesAnalyzed: [
            {
              path: 'src/custom.ts',
              size: 1024,
              lines: 80,
              additions: 40,
              deletions: 5,
            },
          ],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      mockSummary.addRaw.mockClear();

      const result = await writeSummaryWithAnalysis(analysis, { enableSummary: true }, undefined, {
        title: 'Custom Summary Title',
      });

      expect(result.isOk()).toBe(true);
      const markdown = mockSummary.addRaw.mock.calls[0][0];
      expect(markdown).toContain('# 📊 Custom Summary Title');
    });

    it('should include violations in summary', async () => {
      const analysis: AnalysisResult = {
        metrics: {
          totalFiles: 2,
          totalAdditions: 1000,
          excludedAdditions: 0,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [
            {
              file: 'src/large.ts',
              actualValue: 2000000,
              limit: 1000000,
              violationType: 'size',
              severity: 'critical',
            },
          ],
          exceedsFileLines: [],
          exceedsAdditions: true,
          exceedsFileCount: false,
        },
      };

      const result = await writeSummaryWithAnalysis(analysis, { enableSummary: true });

      expect(result.isOk()).toBe(true);
      const markdown = mockSummary.addRaw.mock.calls[0][0];
      expect(markdown).toContain('### 📊 Violations');
      // Detailed tables removed - now in formatFileAnalysis
      expect(markdown).not.toContain('### 🚫 Large Files Detected');
    });
  });

  describe('i18n Log Helpers', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('logInfoI18n', () => {
      it('should translate log message in English', () => {
        setupI18nTestEnglish();
        const spy = vi.mocked(core.info);

        logInfoI18n('initialization.starting');

        expect(spy).toHaveBeenCalledWith('Starting PR Insights Labeler');
      });

      it('should translate log message in Japanese', () => {
        setupI18nTestJapanese();
        const spy = vi.mocked(core.info);

        logInfoI18n('initialization.starting');

        expect(spy).toHaveBeenCalledWith('PR Insights Labelerを開始します');
      });

      it('should interpolate variables in English', () => {
        setupI18nTestEnglish();
        const spy = vi.mocked(core.info);

        logInfoI18n('initialization.analyzingPr', { prNumber: 123, owner: 'user', repo: 'test-repo' });

        expect(spy).toHaveBeenCalledWith('Analyzing PR #123 in user/test-repo');
      });

      it('should interpolate variables in Japanese', () => {
        setupI18nTestJapanese();
        const spy = vi.mocked(core.info);

        logInfoI18n('initialization.analyzingPr', { prNumber: 123, owner: 'user', repo: 'test-repo' });

        expect(spy).toHaveBeenCalledWith('PR #123 を分析中（user/test-repo）');
      });

      it('should fallback to key when i18n not initialized', () => {
        // i18n未初期化のまま呼び出し
        resetI18n();
        const spy = vi.mocked(core.info);

        logInfoI18n('initialization.starting');

        expect(spy).toHaveBeenCalledWith('initialization.starting');
      });
    });

    describe('logWarningI18n', () => {
      it('should translate warning message in English', () => {
        setupI18nTestEnglish();
        const spy = vi.mocked(core.warning);

        logWarningI18n('initialization.i18nFailed', { message: 'Invalid JSON' });

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize i18n'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
      });

      it('should translate warning message in Japanese', () => {
        setupI18nTestJapanese();
        const spy = vi.mocked(core.warning);

        logWarningI18n('initialization.i18nFailed', { message: 'Invalid JSON' });

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('i18nの初期化に失敗しました'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
      });

      it('should fallback when i18n not initialized', () => {
        resetI18n();
        const spy = vi.mocked(core.warning);

        logWarningI18n('initialization.i18nFailed');

        expect(spy).toHaveBeenCalledWith('initialization.i18nFailed');
      });
    });

    describe('logErrorI18n', () => {
      it('should translate error message in English', () => {
        setupI18nTestEnglish();
        const spy = vi.mocked(core.error);

        logErrorI18n('completion.failed', { message: 'Network error' });

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Action failed'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Network error'));
      });

      it('should translate error message in Japanese', () => {
        setupI18nTestJapanese();
        const spy = vi.mocked(core.error);

        logErrorI18n('completion.failed', { message: 'Network error' });

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('アクションが失敗しました'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Network error'));
      });

      it('should fallback when i18n not initialized', () => {
        resetI18n();
        const spy = vi.mocked(core.error);

        logErrorI18n('completion.failed');

        expect(spy).toHaveBeenCalledWith('completion.failed');
      });
    });

    describe('logDebugI18n', () => {
      it('should translate debug message in English', () => {
        setupI18nTestEnglish();
        const spy = vi.mocked(core.debug);

        logDebugI18n('analysis.gettingDiff');

        expect(spy).toHaveBeenCalledWith('Getting PR diff files...');
      });

      it('should translate debug message in Japanese', () => {
        setupI18nTestJapanese();
        const spy = vi.mocked(core.debug);

        logDebugI18n('analysis.gettingDiff');

        expect(spy).toHaveBeenCalledWith('PR差分ファイルを取得中...');
      });

      it('should fallback when i18n not initialized', () => {
        resetI18n();
        const spy = vi.mocked(core.debug);

        logDebugI18n('analysis.gettingDiff');

        expect(spy).toHaveBeenCalledWith('analysis.gettingDiff');
      });
    });

    describe('Technical Details Preservation', () => {
      it('should preserve filename in translated messages', () => {
        setupI18nTestJapanese();

        // i18n初期化ログをクリア
        vi.clearAllMocks();
        const spy = vi.mocked(core.info);

        logInfoI18n('analysis.retrievedFiles', { count: 5, strategy: 'api' });

        const message = spy.mock.calls[0][0] as string;
        expect(message).toContain('5');
        expect(message).toContain('api');
      });

      it('should preserve error messages in original form', () => {
        setupI18nTestJapanese();

        // i18n初期化ログをクリア
        vi.clearAllMocks();
        const spy = vi.mocked(core.warning);

        const errorMessage = 'File not found: /path/to/file.ts';
        logWarningI18n('initialization.i18nFailed', { message: errorMessage });

        const message = spy.mock.calls[0][0] as string;
        expect(message).toContain(errorMessage); // エラーメッセージはそのまま保持
      });
    });
  });
});
