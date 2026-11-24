import * as core from '@actions/core';
import * as github from '@actions/github';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@actions/github');
vi.mock('@actions/core');

import type { Violations } from '../src/errors';
import type { AnalysisResult } from '../src/file-metrics';
import { initializeI18n, resetI18n } from '../src/i18n.js';
import {
  addLabels,
  getCurrentLabels,
  getCurrentPRLabels,
  getDetailLabels,
  LabelConfig,
  removeLabels,
  updateLabels,
} from '../src/label-manager';

describe('LabelManager', () => {
  let mockOctokit: any;
  let mockListLabels: ReturnType<typeof vi.fn>;
  let mockAddLabels: ReturnType<typeof vi.fn>;
  let mockRemoveLabel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

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

    mockListLabels = vi.fn();
    mockAddLabels = vi.fn();
    mockRemoveLabel = vi.fn();

    mockOctokit = {
      rest: {
        issues: {
          listLabelsOnIssue: mockListLabels,
          addLabels: mockAddLabels,
          removeLabel: mockRemoveLabel,
        },
      },
    };

    vi.mocked(github.getOctokit).mockReturnValue(mockOctokit);
    vi.mocked(core.info).mockImplementation(() => {});
    vi.mocked(core.warning).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getDetailLabels', () => {
    it('should return empty array for no violations', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      expect(getDetailLabels(violations)).toEqual([]);
    });

    it('should return auto/large-files for large file violations', () => {
      const violations: Violations = {
        largeFiles: [
          {
            file: 'test.ts',
            actualValue: 2000000,
            limit: 1000000,
            violationType: 'size',
            severity: 'critical',
          },
        ],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      expect(getDetailLabels(violations)).toContain('auto/large-files');
    });

    it('should return auto/too-many-lines for line count violations', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [
          {
            file: 'test.ts',
            actualValue: 2000,
            limit: 1000,
            violationType: 'lines',
            severity: 'warning',
          },
        ],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      expect(getDetailLabels(violations)).toContain('auto/too-many-lines');
    });

    it('should return auto/excessive-changes for addition violations', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: true,
        exceedsFileCount: false,
      };

      expect(getDetailLabels(violations)).toContain('auto/excessive-changes');
    });

    it('should return auto/too-many-files for file count violations', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: true,
      };

      expect(getDetailLabels(violations)).toContain('auto/too-many-files');
    });

    it('should return multiple labels for multiple violations', () => {
      const violations: Violations = {
        largeFiles: [
          {
            file: 'test1.ts',
            actualValue: 2000000,
            limit: 1000000,
            violationType: 'size',
            severity: 'critical',
          },
        ],
        exceedsFileLines: [
          {
            file: 'test2.ts',
            actualValue: 2000,
            limit: 1000,
            violationType: 'lines',
            severity: 'warning',
          },
        ],
        exceedsAdditions: true,
        exceedsFileCount: true,
      };

      const labels = getDetailLabels(violations);
      expect(labels).toContain('auto/large-files');
      expect(labels).toContain('auto/too-many-lines');
      expect(labels).toContain('auto/excessive-changes');
      expect(labels).toContain('auto/too-many-files');
      expect(labels).toHaveLength(4);
    });

    it('should not duplicate labels for multiple files with same violation type', () => {
      const violations: Violations = {
        largeFiles: [
          {
            file: 'test1.ts',
            actualValue: 2000000,
            limit: 1000000,
            violationType: 'size',
            severity: 'critical',
          },
          {
            file: 'test2.ts',
            actualValue: 3000000,
            limit: 1000000,
            violationType: 'size',
            severity: 'critical',
          },
        ],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      const labels = getDetailLabels(violations);
      expect(labels).toContain('auto/large-files');
      expect(labels).toHaveLength(1);
    });

    it('should use custom tooManyLines label when provided', () => {
      const violations: Violations = {
        largeFiles: [],
        exceedsFileLines: [
          {
            file: 'test.ts',
            actualValue: 2000,
            limit: 1000,
            violationType: 'lines',
            severity: 'high',
          },
        ],
        exceedsAdditions: false,
        exceedsFileCount: false,
      };

      const customLabels = { tooManyLines: 'custom:long-files' };
      const labels = getDetailLabels(violations, customLabels);
      expect(labels).toContain('custom:long-files');
      expect(labels).not.toContain('auto/too-many-lines');
    });
  });

  describe('getCurrentLabels', () => {
    it('should get current labels from PR', async () => {
      mockListLabels.mockResolvedValue({
        data: [{ name: 'bug' }, { name: 'feature' }, { name: 'size/medium' }],
      });

      const result = await getCurrentLabels('token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(['bug', 'feature', 'size/medium']);
      }
      expect(mockListLabels).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
      });
    });

    it('should handle empty label list', async () => {
      mockListLabels.mockResolvedValue({
        data: [],
      });

      const result = await getCurrentLabels('token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('should return GitHubAPIError on failure', async () => {
      mockListLabels.mockRejectedValue(new Error('API error'));

      const result = await getCurrentLabels('token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('GitHubAPIError');
      }
    });
  });

  describe('getCurrentPRLabels', () => {
    it('returns an empty array when the PR genuinely has no labels', async () => {
      mockListLabels.mockResolvedValue({ data: [] });

      const result = await getCurrentPRLabels('token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result).toEqual([]);
      expect(core.warning).not.toHaveBeenCalled();
    });

    it('returns undefined and warns when label retrieval fails', async () => {
      mockListLabels.mockRejectedValue(new Error('API error'));

      const result = await getCurrentPRLabels('token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result).toBeUndefined();
      expect(core.warning).toHaveBeenCalled();
    });
  });

  describe('addLabels', () => {
    it('should add new labels to PR', async () => {
      mockAddLabels.mockResolvedValue({
        data: [{ name: 'size/large' }, { name: 'auto/large-files' }],
      });

      const result = await addLabels(['size/large', 'auto/large-files'], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockAddLabels).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        labels: ['size/large', 'auto/large-files'],
      });
    });

    it('should handle empty label list (no-op)', async () => {
      const result = await addLabels([], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockAddLabels).not.toHaveBeenCalled();
    });

    it('should return GitHubAPIError on failure', async () => {
      mockAddLabels.mockRejectedValue(new Error('Permission denied'));

      const result = await addLabels(['size/large'], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('GitHubAPIError');
        expect(result.error.message).toContain('GitHub API error');
      }
    });
  });

  describe('removeLabels', () => {
    it('should remove labels from PR', async () => {
      mockRemoveLabel.mockResolvedValue({});

      const result = await removeLabels(['size/small', 'auto/old'], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockRemoveLabel).toHaveBeenCalledTimes(2);
      expect(mockRemoveLabel).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        name: 'size/small',
      });
      expect(mockRemoveLabel).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        name: 'auto/old',
      });
    });

    it('should handle empty label list (no-op)', async () => {
      const result = await removeLabels([], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockRemoveLabel).not.toHaveBeenCalled();
    });

    it('should continue removing even if one fails', async () => {
      mockRemoveLabel.mockRejectedValueOnce(new Error('Label not found')).mockResolvedValueOnce({});

      const result = await removeLabels(['nonexistent', 'size/medium'], 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      expect(mockRemoveLabel).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateLabels', () => {
    it('should update labels with size and violations', async () => {
      const config: LabelConfig = {
        sizeLabelThresholds: {
          small: 10,
          medium: 100,
          large: 500,
          xlarge: 1000,
        },
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 150,
          excludedAdditions: 0,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesSkippedByLimit: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      mockListLabels.mockResolvedValue({
        data: [{ name: 'bug' }, { name: 'size/small' }, { name: 'auto/old-violation' }],
      });

      mockAddLabels.mockResolvedValue({
        data: [],
      });

      mockRemoveLabel.mockResolvedValue({});

      const result = await updateLabels(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.added).toContain('size/large');
        expect(result.value.removed).toContain('size/small');
        expect(result.value.removed).toContain('auto/old-violation');
        expect(result.value.current).toContain('bug');
        expect(result.value.current).toContain('size/large');
      }
    });

    it('should add violation labels', async () => {
      const config: LabelConfig = {
        sizeLabelThresholds: {
          small: 10,
          medium: 100,
          large: 500,
          xlarge: 1000,
        },
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 50,
          excludedAdditions: 0,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesSkippedByLimit: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [
            {
              file: 'test.ts',
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

      mockListLabels.mockResolvedValue({
        data: [],
      });

      mockAddLabels.mockResolvedValue({
        data: [],
      });

      const result = await updateLabels(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.added).toContain('size/medium');
        expect(result.value.added).toContain('auto/large-files');
        expect(result.value.added).toContain('auto/excessive-changes');
      }
    });

    it('should handle no changes needed', async () => {
      const config: LabelConfig = {
        sizeLabelThresholds: {
          small: 10,
          medium: 100,
          large: 500,
          xlarge: 1000,
        },
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 50,
          excludedAdditions: 0,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesSkippedByLimit: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      mockListLabels.mockResolvedValue({
        data: [{ name: 'size/medium' }],
      });

      const result = await updateLabels(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.added).toHaveLength(0);
        expect(result.value.removed).toHaveLength(0);
        expect(result.value.current).toEqual(['size/medium']);
      }
      expect(mockAddLabels).not.toHaveBeenCalled();
      expect(mockRemoveLabel).not.toHaveBeenCalled();
    });

    it('should remove all auto labels when no violations', async () => {
      const config: LabelConfig = {
        sizeLabelThresholds: {
          small: 10,
          medium: 100,
          large: 500,
          xlarge: 1000,
        },
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 2,
          totalAdditions: 5,
          excludedAdditions: 0,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesSkippedByLimit: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      mockListLabels.mockResolvedValue({
        data: [
          { name: 'size/large' },
          { name: 'auto/large-files' },
          { name: 'auto/excessive-changes' },
          { name: 'feature' },
        ],
      });

      mockAddLabels.mockResolvedValue({ data: [] });
      mockRemoveLabel.mockResolvedValue({});

      const result = await updateLabels(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.added).toContain('size/small');
        expect(result.value.removed).toContain('size/large');
        expect(result.value.removed).toContain('auto/large-files');
        expect(result.value.removed).toContain('auto/excessive-changes');
        expect(result.value.current).toContain('feature');
        expect(result.value.current).not.toContain('auto/large-files');
      }
    });

    it('should return ConfigurationError for negative thresholds', async () => {
      const config: LabelConfig = {
        sizeLabelThresholds: {
          small: -10,
          medium: 100,
          large: 500,
          xlarge: 1000,
        },
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 50,
          excludedAdditions: 0,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesSkippedByLimit: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      const result = await updateLabels(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.message).toContain('non-negative');
      }
    });

    it('should return ConfigurationError for non-monotonic thresholds', async () => {
      const config: LabelConfig = {
        sizeLabelThresholds: {
          small: 100,
          medium: 50,
          large: 500,
          xlarge: 1000,
        },
      };

      const analysisResult: AnalysisResult = {
        metrics: {
          totalFiles: 5,
          totalAdditions: 50,
          excludedAdditions: 0,
          filesAnalyzed: [],
          filesExcluded: [],
          filesSkippedBinary: [],
          filesSkippedByLimit: [],
          filesWithErrors: [],
        },
        violations: {
          largeFiles: [],
          exceedsFileLines: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
        },
      };

      const result = await updateLabels(analysisResult, config, 'token', {
        owner: 'owner',
        repo: 'repo',
        pullNumber: 123,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.message).toContain('monotonic');
      }
    });
  });
});
