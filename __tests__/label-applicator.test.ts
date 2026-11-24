import * as github from '@actions/github';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@actions/github');

import { applyLabels, getCurrentLabels } from '../src/label-applicator';
import type { LabelDecisions } from '../src/labeler-types';
import { DEFAULT_LABELER_CONFIG } from '../src/labeler-types';
import type { PRContext } from '../src/types';

const mockContext: PRContext = {
  owner: 'test-owner',
  repo: 'test-repo',
  pullNumber: 1,
};

describe('Label Applicator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.clearAllMocks();
  });
  describe('getCurrentLabels', () => {
    it('should get current labels from PR', async () => {
      const mockListLabels = vi.fn().mockResolvedValue({
        data: [{ name: 'size/medium' }, { name: 'category/tests' }],
      });

      const mockOctokit = {
        rest: {
          issues: {
            listLabelsOnIssue: mockListLabels,
          },
        },
      };

      const result = await getCurrentLabels(mockOctokit as any, mockContext);
      expect(result.isOk()).toBe(true);
      const labels = result._unsafeUnwrap();
      expect(labels).toEqual(['size/medium', 'category/tests']);
    });

    it('should return error on API failure', async () => {
      const mockListLabels = vi.fn().mockRejectedValue(new Error('API Error'));

      const mockOctokit = {
        rest: {
          issues: {
            listLabelsOnIssue: mockListLabels,
          },
        },
      };

      const result = await getCurrentLabels(mockOctokit as any, mockContext);
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.type).toBe('GitHubAPIError');
    });
  });

  describe('applyLabels', () => {
    it('should add labels when none exist', async () => {
      const mockListLabels = vi.fn().mockResolvedValue({ data: [] });
      const mockAddLabels = vi.fn().mockResolvedValue({});

      const mockOctokit = {
        rest: {
          issues: {
            listLabelsOnIssue: mockListLabels,
            addLabels: mockAddLabels,
          },
        },
      };

      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const decisions: LabelDecisions = {
        labelsToAdd: ['size/small', 'category/tests'],
        labelsToRemove: [],
        reasoning: [],
      };

      const result = await applyLabels('token', mockContext, decisions, DEFAULT_LABELER_CONFIG.labels);
      expect(result.isOk()).toBe(true);

      const update = result._unsafeUnwrap();
      expect(update.added).toEqual(['size/small', 'category/tests']);
      expect(update.removed).toEqual([]);
      expect(mockAddLabels).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 1,
        labels: ['size/small', 'category/tests'],
      });
    });

    it('should replace existing size labels', async () => {
      const mockListLabels = vi.fn().mockResolvedValue({
        data: [{ name: 'size/medium' }, { name: 'category/tests' }],
      });
      const mockAddLabels = vi.fn().mockResolvedValue({});
      const mockRemoveLabel = vi.fn().mockResolvedValue({});

      const mockOctokit = {
        rest: {
          issues: {
            listLabelsOnIssue: mockListLabels,
            addLabels: mockAddLabels,
            removeLabel: mockRemoveLabel,
          },
        },
      };

      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const decisions: LabelDecisions = {
        labelsToAdd: ['size/large'],
        labelsToRemove: ['size/*'],
        reasoning: [],
      };

      const result = await applyLabels('token', mockContext, decisions, DEFAULT_LABELER_CONFIG.labels);
      expect(result.isOk()).toBe(true);

      const update = result._unsafeUnwrap();
      expect(update.removed).toContain('size/medium');
      expect(update.added).toContain('size/large');
    });

    it('should be idempotent (no changes when labels already match)', async () => {
      const mockListLabels = vi.fn().mockResolvedValue({
        data: [{ name: 'size/small' }, { name: 'category/tests' }],
      });
      const mockAddLabels = vi.fn();
      const mockRemoveLabel = vi.fn();

      const mockOctokit = {
        rest: {
          issues: {
            listLabelsOnIssue: mockListLabels,
            addLabels: mockAddLabels,
            removeLabel: mockRemoveLabel,
          },
        },
      };

      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const decisions: LabelDecisions = {
        labelsToAdd: ['size/small', 'category/tests'],
        labelsToRemove: [],
        reasoning: [],
      };

      const result = await applyLabels('token', mockContext, decisions, DEFAULT_LABELER_CONFIG.labels);
      expect(result.isOk()).toBe(true);

      const update = result._unsafeUnwrap();
      expect(update.added).toEqual([]);
      expect(update.removed).toEqual([]);
      expect(mockAddLabels).not.toHaveBeenCalled();
      expect(mockRemoveLabel).not.toHaveBeenCalled();
    });

    it('should handle permission errors (403)', async () => {
      const mockListLabels = vi.fn().mockResolvedValue({ data: [] });
      const mockAddLabels = vi.fn().mockRejectedValue({ status: 403, message: 'Forbidden' });

      const mockOctokit = {
        rest: {
          issues: {
            listLabelsOnIssue: mockListLabels,
            addLabels: mockAddLabels,
          },
        },
      };

      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const decisions: LabelDecisions = {
        labelsToAdd: ['size/small'],
        labelsToRemove: [],
        reasoning: [],
      };

      const result = await applyLabels('token', mockContext, decisions, DEFAULT_LABELER_CONFIG.labels);
      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error.type).toBe('GitHubAPIError');
      expect(error.status).toBe(403);
    });

    it('should handle additive policy for category labels', async () => {
      const mockListLabels = vi.fn().mockResolvedValue({
        data: [{ name: 'category/tests' }],
      });
      const mockAddLabels = vi.fn().mockResolvedValue({});

      const mockOctokit = {
        rest: {
          issues: {
            listLabelsOnIssue: mockListLabels,
            addLabels: mockAddLabels,
          },
        },
      };

      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const decisions: LabelDecisions = {
        labelsToAdd: ['category/tests', 'category/ci-cd'],
        labelsToRemove: [],
        reasoning: [],
      };

      const result = await applyLabels('token', mockContext, decisions, DEFAULT_LABELER_CONFIG.labels);
      expect(result.isOk()).toBe(true);

      const update = result._unsafeUnwrap();
      expect(update.added).toEqual(['category/ci-cd']);
      expect(mockAddLabels).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 1,
        labels: ['category/ci-cd'],
      });
    });

    it('should remove auto/* labels when violations are resolved', async () => {
      const mockListLabels = vi.fn().mockResolvedValue({
        data: [{ name: 'size/L' }, { name: 'auto/too-many-lines' }],
      });
      const mockAddLabels = vi.fn().mockResolvedValue({});
      const mockRemoveLabel = vi.fn().mockResolvedValue({});

      const mockOctokit = {
        rest: {
          issues: {
            listLabelsOnIssue: mockListLabels,
            addLabels: mockAddLabels,
            removeLabel: mockRemoveLabel,
          },
        },
      };

      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const decisions: LabelDecisions = {
        labelsToAdd: ['size/M'],
        labelsToRemove: [],
        reasoning: [],
      };

      const result = await applyLabels('token', mockContext, decisions, DEFAULT_LABELER_CONFIG.labels);
      expect(result.isOk()).toBe(true);

      const update = result._unsafeUnwrap();
      expect(update.removed).toContain('auto/too-many-lines');
      expect(update.removed).toContain('size/L');
      expect(update.added).toContain('size/M');
    });

    it('should remove a custom-named violation label when the violation is resolved', async () => {
      const mockListLabels = vi.fn().mockResolvedValue({
        data: [{ name: 'quality/large-files' }, { name: 'wip' }],
      });
      const mockAddLabels = vi.fn().mockResolvedValue({});
      const mockRemoveLabel = vi.fn().mockResolvedValue({});

      const mockOctokit = {
        rest: {
          issues: {
            listLabelsOnIssue: mockListLabels,
            addLabels: mockAddLabels,
            removeLabel: mockRemoveLabel,
          },
        },
      };

      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const decisions: LabelDecisions = {
        labelsToAdd: [],
        labelsToRemove: [],
        reasoning: [],
      };

      const result = await applyLabels('token', mockContext, decisions, DEFAULT_LABELER_CONFIG.labels, [
        'quality/large-files',
      ]);
      expect(result.isOk()).toBe(true);

      const update = result._unsafeUnwrap();
      expect(update.removed).toContain('quality/large-files');
      expect(update.removed).not.toContain('wip');
      expect(mockRemoveLabel).toHaveBeenCalledTimes(1);
    });

    it('should not remove a custom-named violation label while the violation is still active', async () => {
      const mockListLabels = vi.fn().mockResolvedValue({
        data: [{ name: 'quality/large-files' }],
      });
      const mockAddLabels = vi.fn().mockResolvedValue({});
      const mockRemoveLabel = vi.fn().mockResolvedValue({});

      const mockOctokit = {
        rest: {
          issues: {
            listLabelsOnIssue: mockListLabels,
            addLabels: mockAddLabels,
            removeLabel: mockRemoveLabel,
          },
        },
      };

      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const decisions: LabelDecisions = {
        labelsToAdd: ['quality/large-files'],
        labelsToRemove: [],
        reasoning: [],
      };

      const result = await applyLabels('token', mockContext, decisions, DEFAULT_LABELER_CONFIG.labels, [
        'quality/large-files',
      ]);
      expect(result.isOk()).toBe(true);

      const update = result._unsafeUnwrap();
      expect(update.removed).not.toContain('quality/large-files');
      expect(mockRemoveLabel).not.toHaveBeenCalled();
    });
  });
});
