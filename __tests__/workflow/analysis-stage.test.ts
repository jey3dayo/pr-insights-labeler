import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getEnvVar, logErrorI18n, logWarningI18n } from '../../src/actions-io';
import type { DiffFile, DiffResult } from '../../src/diff-strategy';
import { getDiffFiles } from '../../src/diff-strategy';
import { analyzeFiles } from '../../src/file-metrics';
import { analyzePullRequest } from '../../src/workflow/stages/analysis';
import type { InitializationArtifacts } from '../../src/workflow/types';

vi.mock('../../src/actions-io', () => ({
  getEnvVar: vi.fn(),
  logDebug: vi.fn(),
  logError: vi.fn(),
  logErrorI18n: vi.fn(),
  logInfo: vi.fn(),
  logInfoI18n: vi.fn(),
  logWarning: vi.fn(),
  logWarningI18n: vi.fn(),
}));

// Substitute only the `git rev-parse HEAD` call so the guard's real trust decision runs without
// spawning a process; the stage keeps calling the production `verifyHeadCheckout`.
const localHeadRevisionMock = vi.fn<(workspace: string | undefined) => Promise<string | undefined>>();

vi.mock('../../src/workflow/policy/head-checkout-guard.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/workflow/policy/head-checkout-guard')>();
  return {
    ...actual,
    verifyHeadCheckout: (input: Parameters<typeof actual.verifyHeadCheckout>[0]) =>
      actual.verifyHeadCheckout(input, localHeadRevisionMock),
  };
});

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
      fileSizeLimitEnabled: true,
      fileLinesLimit: 500,
      fileLinesLimitEnabled: true,
      prAdditionsLimit: 400,
      prAdditionsLimitEnabled: true,
      prFilesLimit: 20,
      prFilesLimitEnabled: true,
      sizeEnabled: true,
      sizeThresholds: { small: 50, medium: 150, large: 300, xlarge: 600 },
      complexityEnabled: true,
      complexityThresholdsV2: { medium: 10, high: 20 },
      categoryEnabled: true,
      riskEnabled: true,
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

  const setEnv = (env: Record<string, string | undefined>): void => {
    vi.mocked(getEnvVar).mockImplementation(key => env[key]);
  };

  beforeEach(() => {
    vi.mocked(getEnvVar).mockReset();
    vi.mocked(getEnvVar).mockReturnValue(undefined);
    localHeadRevisionMock.mockReset();
    localHeadRevisionMock.mockResolvedValue(undefined);
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
          filesSkippedByLimit: [],
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

  it('merges YAML exclude.additional patterns with the input additionalExcludePatterns', async () => {
    const context = {
      ...baseContext,
      config: {
        ...baseContext.config,
        additionalExcludePatterns: ['dist/**', 'shared/**'],
        complexityEnabled: false,
      },
      labelerConfig: {
        ...baseContext.labelerConfig,
        exclude: { additional: ['*.generated.ts', 'shared/**'] },
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
          totalAdditions: 10,
          excludedAdditions: 0,
          filesAnalyzed: [{ path: 'src/app.ts', size: 100, lines: 10, additions: 10, deletions: 0 }],
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
      }) as any,
    );

    const result = await analyzePullRequest(context);

    expect(result.isOk()).toBe(true);
    expect(analyzeFilesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        excludePatterns: expect.arrayContaining(['dist/**', 'shared/**', '*.generated.ts']),
      }),
      expect.anything(),
      expect.anything(),
    );
    const [, options] = analyzeFilesMock.mock.calls[0] as [unknown, { excludePatterns: string[] }, unknown, unknown];
    expect(options.excludePatterns).toHaveLength(3);
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
          filesSkippedByLimit: [],
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

  describe('pull_request_target head checkout guard', () => {
    const HEAD_SHA = 'a'.repeat(40);
    const OTHER_SHA = 'b'.repeat(40);

    const targetContext = {
      ...baseContext,
      prContext: { ...baseContext.prContext, headSha: HEAD_SHA },
    } satisfies InitializationArtifacts;

    const diffFile: DiffFile = { filename: 'src/app.ts', additions: 10, deletions: 0, status: 'modified' };
    const diffResult: DiffResult = { files: [diffFile], strategy: 'local-git' };

    it('continues into diff retrieval and file analysis when the local checkout is the PR head', async () => {
      setEnv({ GITHUB_EVENT_NAME: 'pull_request_target', GITHUB_WORKSPACE: '/workspace' });
      localHeadRevisionMock.mockResolvedValue(`${HEAD_SHA}\n`);
      getDiffFilesMock.mockResolvedValue(ok(diffResult));
      // A distinctive downstream failure proves file analysis was reached rather than short-circuited.
      analyzeFilesMock.mockResolvedValue(
        err({ type: 'FileAnalysisError', file: 'src/app.ts', message: 'reached file analysis' }),
      );

      const result = await analyzePullRequest(targetContext);

      expect(result._unsafeUnwrapErr()).toMatchObject({ type: 'FileAnalysisError', message: 'reached file analysis' });
    });

    it('fails before diff retrieval and file analysis when the local checkout is not the PR head', async () => {
      setEnv({ GITHUB_EVENT_NAME: 'pull_request_target', GITHUB_WORKSPACE: '/workspace' });
      localHeadRevisionMock.mockResolvedValue(OTHER_SHA);
      // Downstream mocks are deliberately left unconfigured: reaching them would surface as a
      // different error than the guard's.

      const result = await analyzePullRequest(targetContext);

      expect(result._unsafeUnwrapErr()).toMatchObject({ type: 'ConfigurationError', field: 'head_checkout' });
      expect(getDiffFilesMock).not.toHaveBeenCalled();
      expect(analyzeFilesMock).not.toHaveBeenCalled();
    });

    it('fails closed before analysis when the local HEAD revision cannot be resolved', async () => {
      setEnv({ GITHUB_EVENT_NAME: 'pull_request_target', GITHUB_WORKSPACE: undefined });
      localHeadRevisionMock.mockResolvedValue(undefined);

      const result = await analyzePullRequest(targetContext);

      expect(result._unsafeUnwrapErr()).toMatchObject({ type: 'ConfigurationError', field: 'head_checkout' });
      expect(getDiffFilesMock).not.toHaveBeenCalled();
      expect(analyzeFilesMock).not.toHaveBeenCalled();
    });

    it('does not constrain the checkout on plain pull_request, where HEAD is the merge commit', async () => {
      setEnv({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_WORKSPACE: '/workspace' });
      localHeadRevisionMock.mockResolvedValue(OTHER_SHA);
      getDiffFilesMock.mockResolvedValue(ok(diffResult));
      analyzeFilesMock.mockResolvedValue(
        err({ type: 'FileAnalysisError', file: 'src/app.ts', message: 'reached file analysis' }),
      );

      const result = await analyzePullRequest(targetContext);

      expect(result._unsafeUnwrapErr()).toMatchObject({ type: 'FileAnalysisError', message: 'reached file analysis' });
      expect(localHeadRevisionMock).not.toHaveBeenCalled();
    });
  });
});
