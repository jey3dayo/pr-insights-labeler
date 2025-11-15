import { errAsync, ok, okAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logInfoI18n, logWarningI18n, setActionOutputs } from '../../src/actions-io';
import { manageComment } from '../../src/comment-manager';
import { getCurrentPRLabels } from '../../src/label-manager.js';
import { writeSummaryWithAnalysis } from '../../src/summary/summary-writer';
import { evaluatePRFailures } from '../../src/workflow/policy/pr-failure-evaluator';
import { finalizeAction } from '../../src/workflow/stages/finalization';
import type { AnalysisArtifacts, InitializationArtifacts } from '../../src/workflow/types';

vi.mock('../../src/actions-io', () => ({
  logInfoI18n: vi.fn(),
  logWarningI18n: vi.fn(),
  setActionOutputs: vi.fn(),
}));

vi.mock('../../src/comment-manager', () => ({
  manageComment: vi.fn(),
}));

vi.mock('../../src/summary/summary-writer', () => ({
  writeSummaryWithAnalysis: vi.fn(),
}));

vi.mock('../../src/label-manager.js', () => ({
  getCurrentPRLabels: vi.fn(),
}));

vi.mock('../../src/workflow/policy/pr-failure-evaluator', () => ({
  evaluatePRFailures: vi.fn(),
}));

describe('workflow/stages/finalization', () => {
  const context: InitializationArtifacts = {
    token: 'token',
    prContext: {
      owner: 'octo',
      repo: 'repo',
      pullNumber: 45,
      baseSha: 'base',
      headSha: 'head',
      isDraft: false,
    },
    config: {
      language: 'en',
      githubToken: 'token',
      fileSizeLimit: 1024,
      fileLinesLimit: 400,
      prAdditionsLimit: 300,
      prFilesLimit: 20,
      sizeEnabled: true,
      sizeThresholds: { small: 50, medium: 150, large: 250, xlarge: 500 },
      complexityEnabled: true,
      complexityThresholdsV2: { medium: 10, high: 20 },
      categoryEnabled: true,
      riskEnabled: true,
      autoRemoveLabels: true,
      largeFilesLabel: 'large',
      tooManyFilesLabel: 'many',
      tooManyLinesLabel: 'lines',
      excessiveChangesLabel: 'changes',
      skipDraftPr: false,
      commentOnPr: 'auto',
      failOnLargeFiles: false,
      failOnTooManyFiles: false,
      failOnPrSize: '',
      enableSummary: true,
      additionalExcludePatterns: [],
      enableDirectoryLabeling: false,
      directoryLabelerConfigPath: '.github/labeler.yml',
      maxLabels: 10,
      useDefaultExcludes: true,
    },
    labelerConfig: {
      runtime: { fail_on_error: false, dry_run: false },
      language: 'en',
      summary: { title: 'PR Summary' },
      size: { enabled: true, thresholds: { small: 50, medium: 150, large: 250, xlarge: 500 } },
      complexity: {
        enabled: true,
        metric: 'cyclomatic',
        thresholds: { medium: 10, high: 20 },
        extensions: ['.ts'],
        exclude: [],
      },
      categoryLabeling: { enabled: true },
      categories: [],
      risk: {
        enabled: true,
        high_if_no_tests_for_core: false,
        core_paths: [],
        coverage_threshold: undefined,
        config_files: [],
        use_ci_status: true,
      },
      exclude: { additional: [] },
      labels: { create_missing: true, namespace_policies: {} },
    },
    skipDraft: false,
  };

  const artifacts: AnalysisArtifacts = {
    files: [{ filename: 'src/app.ts', status: 'modified' } as any],
    analysis: {
      metrics: {
        totalFiles: 1,
        totalAdditions: 120,
        excludedAdditions: 0,
        filesAnalyzed: [{ path: 'src/app.ts', size: 2048, lines: 200, additions: 120, deletions: 20 }],
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
    },
    hasViolations: false,
    complexityMetrics: {
      maxComplexity: 18,
      avgComplexity: 11,
      analyzedFiles: 1,
      files: [
        {
          path: 'src/app.ts',
          complexity: 18,
          functions: [{ name: 'fn', complexity: 18, loc: { start: 10, end: 40 } }],
        },
      ],
      skippedFiles: [],
      syntaxErrorFiles: [],
      truncated: false,
      hasTsconfig: true,
    },
  };

  beforeEach(() => {
    vi.mocked(manageComment).mockReset();
    vi.mocked(writeSummaryWithAnalysis).mockReset();
    vi.mocked(getCurrentPRLabels).mockReset();
    vi.mocked(evaluatePRFailures).mockReset();
    vi.mocked(logInfoI18n).mockReset();
    vi.mocked(logWarningI18n).mockReset();
    vi.mocked(setActionOutputs).mockReset();
  });

  it('writes summary and comment successfully', async () => {
    vi.mocked(manageComment).mockResolvedValue(ok({ action: 'updated' }));
    vi.mocked(writeSummaryWithAnalysis).mockReturnValue(okAsync({ action: 'written', bytesWritten: 256 }));
    vi.mocked(getCurrentPRLabels).mockResolvedValue(['size/L']);
    vi.mocked(evaluatePRFailures).mockReturnValue([]);

    const result = await finalizeAction(context, artifacts);

    expect(manageComment).toHaveBeenCalled();
    expect(writeSummaryWithAnalysis).toHaveBeenCalled();
    expect(logInfoI18n).toHaveBeenCalledWith('summary.written', { bytes: 256 });
    expect(setActionOutputs).toHaveBeenCalled();
    expect(result.isOk()).toBe(true);
  });

  it('handles summary write errors via warnings and failure evaluation', async () => {
    vi.mocked(manageComment).mockResolvedValue(ok({ action: 'updated' }));
    vi.mocked(writeSummaryWithAnalysis).mockReturnValue(errAsync(new Error('summary failed')));
    vi.mocked(getCurrentPRLabels).mockResolvedValue(['risk/high']);
    vi.mocked(evaluatePRFailures).mockReturnValue(['too risky']);

    const result = await finalizeAction(context, artifacts);

    expect(logWarningI18n).toHaveBeenCalledWith('summary.writeFailed', { message: 'summary failed' });
    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error.type).toBe('ViolationError');
    expect(error.message).toContain('too risky');
  });
});
