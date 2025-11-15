import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logErrorI18n, logWarningI18n } from '../../src/actions-io';
import { getDiffFiles } from '../../src/diff-strategy';
import { analyzeFiles } from '../../src/file-metrics';
import { analyzePullRequest } from '../../src/workflow/stages/analysis';
import type { InitializationArtifacts } from '../../src/workflow/types';

vi.mock('../../src/actions-io', () => ({
  logDebug: vi.fn(),
  logErrorI18n: vi.fn(),
  logInfo: vi.fn(),
  logInfoI18n: vi.fn(),
  logWarning: vi.fn(),
  logWarningI18n: vi.fn(),
}));

vi.mock('../../src/i18n.js', () => ({
  t: (_ns: string, key: string) => key,
}));

vi.mock('../../src/diff-strategy', () => ({
  getDiffFiles: vi.fn(),
}));

vi.mock('../../src/file-metrics', () => ({
  analyzeFiles: vi.fn(),
}));

const getDiffFilesMock = vi.mocked(getDiffFiles);
const analyzeFilesMock = vi.mocked(analyzeFiles);

const complexityAnalyzeMock = vi.fn();

vi.mock('../../src/complexity-analyzer', () => ({
  createComplexityAnalyzer: vi.fn(() => ({
    analyzeFiles: complexityAnalyzeMock,
  })),
}));

describe('workflow/stages/analysis', () => {
  const baseContext: InitializationArtifacts = {
    token: 'token',
    prContext: {
      owner: 'octo',
      repo: 'repo',
      pullNumber: 123,
      baseSha: 'base',
      headSha: 'head',
      isDraft: false,
    },
    config: {
      language: 'en',
      githubToken: 'token',
      fileSizeLimit: 1024,
      fileLinesLimit: 500,
      prAdditionsLimit: 400,
      prFilesLimit: 20,
      sizeEnabled: true,
      sizeThresholds: { small: 50, medium: 150, large: 300, xlarge: 600 },
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
      maxLabels: 5,
      useDefaultExcludes: true,
    },
    labelerConfig: {
      runtime: { fail_on_error: false, dry_run: false },
      language: 'en',
      summary: {},
      size: { enabled: true, thresholds: { small: 50, medium: 150, large: 300, xlarge: 600 } },
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

  beforeEach(() => {
    getDiffFilesMock.mockReset();
    analyzeFilesMock.mockReset();
    complexityAnalyzeMock.mockReset();
    vi.mocked(logErrorI18n).mockReset();
    vi.mocked(logWarningI18n).mockReset();
  });

  it('returns analysis artifacts with complexity metrics', async () => {
    getDiffFilesMock.mockResolvedValue(
      ok({
        files: [{ filename: 'src/app.ts', status: 'modified' }],
        strategy: 'comparison',
      }) as any,
    );

    analyzeFilesMock.mockResolvedValue(
      ok({
        metrics: {
          totalFiles: 1,
          totalAdditions: 120,
          excludedAdditions: 0,
          filesAnalyzed: [{ path: 'src/app.ts', size: 2048, lines: 250, additions: 120, deletions: 20 }],
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
      }) as any,
    );

    complexityAnalyzeMock.mockResolvedValue(
      ok({
        maxComplexity: 20,
        avgComplexity: 12,
        analyzedFiles: 1,
        files: [
          {
            path: 'src/app.ts',
            complexity: 20,
            functions: [{ name: 'fn', complexity: 20, loc: { start: 10, end: 40 } }],
          },
        ],
        skippedFiles: [],
        syntaxErrorFiles: [],
        truncated: false,
        hasTsconfig: true,
      }),
    );

    const result = await analyzePullRequest(baseContext);

    expect(result.isOk()).toBe(true);
    const artifacts = result._unsafeUnwrap();
    expect(artifacts.analysis.metrics.totalFiles).toBe(1);
    expect(artifacts.complexityMetrics).toBeDefined();
    expect(artifacts.hasViolations).toBe(false);
    expect(complexityAnalyzeMock).toHaveBeenCalled();
  });

  it('propagates diff retrieval errors', async () => {
    getDiffFilesMock.mockResolvedValue(err({ type: 'DiffError', message: 'diff failed', source: 'local-git' }) as any);

    const result = await analyzePullRequest(baseContext);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toMatchObject({ type: 'DiffError', message: 'diff failed' });
  });

  it('fails action when complexity analyzer errors and fail_on_error is true', async () => {
    const context = {
      ...baseContext,
      labelerConfig: {
        ...baseContext.labelerConfig,
        runtime: { fail_on_error: true, dry_run: false },
      },
    } satisfies InitializationArtifacts;

    getDiffFilesMock.mockResolvedValue(
      ok({
        files: [{ filename: 'src/app.ts', status: 'modified' }],
        strategy: 'comparison',
      }) as any,
    );

    analyzeFilesMock.mockResolvedValue(
      ok({
        metrics: {
          totalFiles: 1,
          totalAdditions: 50,
          excludedAdditions: 0,
          filesAnalyzed: [{ path: 'src/app.ts', size: 2048, lines: 250, additions: 50, deletions: 10 }],
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
      }) as any,
    );

    complexityAnalyzeMock.mockResolvedValue(err(new Error('complexity failed')));

    const result = await analyzePullRequest(context);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe('UnexpectedError');
    expect(logErrorI18n).toHaveBeenCalled();
  });
});
