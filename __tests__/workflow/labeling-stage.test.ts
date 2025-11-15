import { getOctokit } from '@actions/github';
import { err, errAsync, ok, okAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logDebugI18n, logErrorI18n, logInfoI18n, logWarning, logWarningI18n } from '../../src/actions-io';
import { getCIStatus } from '../../src/ci-status.js';
import { loadDirectoryLabelerConfig } from '../../src/directory-labeler/config-loader.js';
import { decideLabelsForFiles, filterByMaxLabels } from '../../src/directory-labeler/decision-engine.js';
import { applyDirectoryLabels } from '../../src/directory-labeler/label-applicator.js';
import { applyLabels } from '../../src/label-applicator';
import { decideLabels } from '../../src/label-decision-engine';
import { applyLabelsStage } from '../../src/workflow/stages/labeling';
import type { AnalysisArtifacts, InitializationArtifacts } from '../../src/workflow/types';

vi.mock('@actions/github', () => ({
  getOctokit: vi.fn(),
}));

vi.mock('../../src/actions-io', () => ({
  logInfoI18n: vi.fn(),
  logWarningI18n: vi.fn(),
  logDebugI18n: vi.fn(),
  logErrorI18n: vi.fn(),
  logInfo: vi.fn(),
  logWarning: vi.fn(),
}));

vi.mock('../../src/i18n.js', () => ({
  t: (_ns: string, key: string) => key,
}));

vi.mock('../../src/label-decision-engine', () => ({
  decideLabels: vi.fn(),
}));

vi.mock('../../src/label-applicator', () => ({
  applyLabels: vi.fn(),
}));

vi.mock('../../src/ci-status.js', () => ({
  getCIStatus: vi.fn(),
}));

vi.mock('../../src/directory-labeler/config-loader.js', () => ({
  loadDirectoryLabelerConfig: vi.fn(),
}));

vi.mock('../../src/directory-labeler/decision-engine.js', () => ({
  decideLabelsForFiles: vi.fn(),
  filterByMaxLabels: vi.fn(),
}));

vi.mock('../../src/directory-labeler/label-applicator.js', () => ({
  applyDirectoryLabels: vi.fn(),
}));

describe('workflow/stages/labeling', () => {
  const context: InitializationArtifacts = {
    token: 'token',
    prContext: {
      owner: 'octo',
      repo: 'repo',
      pullNumber: 99,
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
      enableDirectoryLabeling: true,
      directoryLabelerConfigPath: '.github/labels.yml',
      maxLabels: 2,
      useDefaultExcludes: true,
    },
    labelerConfig: {
      runtime: { fail_on_error: false, dry_run: false },
      language: 'en',
      summary: {},
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
    files: [{ filename: 'src/app.ts', status: 'modified' } as any, { filename: 'src/util.ts', status: 'added' } as any],
    analysis: {
      metrics: {
        totalFiles: 2,
        totalAdditions: 220,
        excludedAdditions: 0,
        filesAnalyzed: [
          { path: 'src/app.ts', size: 2000, lines: 200, additions: 120, deletions: 10 },
          { path: 'src/util.ts', size: 500, lines: 50, additions: 100, deletions: 5 },
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
    },
    hasViolations: false,
    complexityMetrics: undefined,
  };

  const baseNamespaces = { exclusive: ['size', 'area'], additive: ['scope'] };

  const octokitMock = {
    paginate: vi
      .fn()
      .mockImplementation(async () => [
        { commit: { message: 'feat: add feature' } },
        { commit: { message: 'fix: bug' } },
      ]),
    rest: {
      pulls: {
        listCommits: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.mocked(getOctokit).mockReturnValue(octokitMock as any);
    vi.mocked(decideLabels).mockReset();
    vi.mocked(applyLabels).mockReset();
    vi.mocked(getCIStatus).mockReset();
    vi.mocked(loadDirectoryLabelerConfig).mockReset();
    vi.mocked(decideLabelsForFiles).mockReset();
    vi.mocked(filterByMaxLabels).mockReset();
    vi.mocked(applyDirectoryLabels).mockReset();
    vi.mocked(logInfoI18n).mockReset();
    vi.mocked(logWarningI18n).mockReset();
    vi.mocked(logDebugI18n).mockReset();
    vi.mocked(logWarning).mockReset();
    vi.mocked(getCIStatus).mockReturnValue(okAsync(null));
    context.config.enableDirectoryLabeling = true;
    context.labelerConfig.runtime.fail_on_error = false;
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: [], labelsToRemove: [], reasoning: [] }));
    vi.mocked(applyLabels).mockReturnValue(okAsync({ added: [], removed: [], apiCalls: 0 } as any));
    vi.mocked(loadDirectoryLabelerConfig).mockReturnValue(
      ok({ namespaces: baseNamespaces, useDefaultExcludes: true } as any),
    );
    vi.mocked(decideLabelsForFiles).mockReturnValue(ok([{ label: 'scope/api', reason: 'match', priority: 1 }]));
    vi.mocked(filterByMaxLabels).mockReturnValue({
      selected: [{ label: 'scope/api', reason: 'match', priority: 1 }],
      rejected: [],
    });
    vi.mocked(applyDirectoryLabels).mockResolvedValue(
      ok({ applied: ['scope/api'], skipped: [], removed: [], failed: [] }),
    );
    context.labelerConfig.runtime.dry_run = false;
    octokitMock.paginate.mockClear();
    octokitMock.rest.pulls.listCommits.mockClear();
  });

  it('applies labels and directory labels successfully', async () => {
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: ['size/L'], labelsToRemove: ['size/M'], reasoning: [] }));
    vi.mocked(applyLabels).mockReturnValue(
      okAsync({ added: ['size/L'], removed: ['size/M'], skipped: [], apiCalls: 1 }),
    );
    vi.mocked(getCIStatus).mockReturnValue(
      okAsync({
        tests: 'passed',
        typeCheck: 'passed',
        build: 'pending',
        lint: 'passed',
      }),
    );
    vi.mocked(loadDirectoryLabelerConfig).mockReturnValue(
      ok({ namespaces: { exclusive: ['size'], additive: ['scope'] }, useDefaultExcludes: false }),
    );
    vi.mocked(decideLabelsForFiles).mockReturnValue(
      ok([
        { label: 'scope/frontend', reason: 'match', priority: 1 },
        { label: 'scope/backend', reason: 'match', priority: 2 },
      ]),
    );
    vi.mocked(filterByMaxLabels).mockReturnValue({
      selected: [{ label: 'scope/frontend', reason: 'match', priority: 1 }],
      rejected: [{ label: 'scope/backend', reason: 'match', priority: 2 }],
    });
    vi.mocked(applyDirectoryLabels).mockResolvedValue(
      ok({
        applied: ['scope/frontend'],
        skipped: [],
        removed: [],
        failed: [],
      }),
    );

    const ctx = JSON.parse(JSON.stringify(context)) as InitializationArtifacts;
    const art = JSON.parse(JSON.stringify(artifacts)) as AnalysisArtifacts;

    const result = await applyLabelsStage(ctx, art);
    expect(result.isOk()).toBe(true);

    expect(decideLabels).toHaveBeenCalled();
    expect(applyLabels).toHaveBeenCalled();
    expect(loadDirectoryLabelerConfig).toHaveBeenCalledWith('.github/labels.yml');
    expect(applyDirectoryLabels).toHaveBeenCalled();
    expect(octokitMock.paginate).toHaveBeenCalled();
    expect(logWarningI18n).toHaveBeenCalledWith('directoryLabeling.rejected', { count: 1 });
  });

  it('logs permission warning when label application returns 403', async () => {
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: ['size/L'], labelsToRemove: [], reasoning: [] }));
    vi.mocked(applyLabels).mockReturnValue(errAsync({ status: 403, message: 'forbidden' } as any));
    vi.mocked(getCIStatus).mockReturnValue(okAsync(null));
    const ctx = JSON.parse(JSON.stringify(context)) as InitializationArtifacts;
    const art = JSON.parse(JSON.stringify(artifacts)) as AnalysisArtifacts;
    ctx.config.enableDirectoryLabeling = false;

    const result = await applyLabelsStage(ctx, art);
    expect(result.isOk()).toBe(true);

    expect(logWarningI18n).toHaveBeenCalledWith('labels.skipped');
  });

  it('skips label application when decideLabels fails', async () => {
    vi.mocked(decideLabels).mockReturnValue(err(new Error('decide failed')));

    const result = await applyLabelsStage(context, artifacts);
    expect(result.isOk()).toBe(true);

    expect(applyLabels).not.toHaveBeenCalled();
  });

  it('warns when applyLabels fails without failing the action', async () => {
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: ['scope/api'], labelsToRemove: [], reasoning: [] }));
    context.labelerConfig.runtime.fail_on_error = false;
    vi.mocked(applyLabels).mockReturnValue(errAsync({ status: 500, message: 'boom' } as any));

    const result = await applyLabelsStage(context, artifacts);
    expect(result.isOk()).toBe(true);

    expect(logWarningI18n).toHaveBeenCalledWith('labels.applyFailed', { message: 'boom' });
  });

  it('fails the action when applyLabels errors and fail_on_error is true', async () => {
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: ['scope/api'], labelsToRemove: [], reasoning: [] }));
    context.labelerConfig.runtime.fail_on_error = true;
    vi.mocked(applyLabels).mockReturnValue(errAsync({ status: 500, message: 'fatal' } as any));

    const result = await applyLabelsStage(context, artifacts);

    expect(logErrorI18n).toHaveBeenCalledWith('labels.applyFailed', { message: 'fatal' });
    expect(result.isErr()).toBe(true);
  });

  it('handles FileSystemError when loading directory config and uses DEFAULT_CATEGORIES fallback', async () => {
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: [], labelsToRemove: [], reasoning: [] }));
    vi.mocked(loadDirectoryLabelerConfig).mockReturnValue(err({ type: 'FileSystemError', message: 'missing' } as any));
    vi.mocked(decideLabelsForFiles).mockReturnValue(ok([{ label: 'category/tests', reason: 'match', priority: 1 }]));
    vi.mocked(filterByMaxLabels).mockReturnValue({
      selected: [{ label: 'category/tests', reason: 'match', priority: 1 }],
      rejected: [],
    });
    vi.mocked(applyDirectoryLabels).mockResolvedValue(
      ok({ applied: ['category/tests'], skipped: [], removed: [], failed: [] }),
    );

    await applyLabelsStage(context, artifacts);

    expect(logInfoI18n).toHaveBeenCalledWith('directoryLabeling.configNotFound', {
      path: context.config.directoryLabelerConfigPath,
    });
    expect(logInfoI18n).toHaveBeenCalledWith('directoryLabeling.usingDefaultCategories');
    expect(decideLabelsForFiles).toHaveBeenCalled();
    expect(applyDirectoryLabels).toHaveBeenCalled();
  });

  it('handles validation errors when loading directory config', async () => {
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: [], labelsToRemove: [], reasoning: [] }));
    vi.mocked(loadDirectoryLabelerConfig).mockReturnValue(err({ type: 'ValidationError', message: 'invalid' } as any));

    const result = await applyLabelsStage(context, artifacts);

    expect(result.isOk()).toBe(true);

    expect(logWarningI18n).toHaveBeenCalledWith('directoryLabeling.configLoadFailed', { message: 'invalid' });
  });

  it('warns when decideLabelsForFiles fails', async () => {
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: [], labelsToRemove: [], reasoning: [] }));
    vi.mocked(loadDirectoryLabelerConfig).mockReturnValue(
      ok({ namespaces: baseNamespaces, useDefaultExcludes: true } as any),
    );
    vi.mocked(decideLabelsForFiles).mockReturnValue(err({ message: 'decide failed' } as any));

    const result = await applyLabelsStage(context, artifacts);

    expect(result.isOk()).toBe(true);

    expect(logWarningI18n).toHaveBeenCalledWith('directoryLabeling.decideFailed', { message: 'decide failed' });
  });

  it('skips when no directory labels match', async () => {
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: [], labelsToRemove: [], reasoning: [] }));
    vi.mocked(loadDirectoryLabelerConfig).mockReturnValue(
      ok({ namespaces: baseNamespaces, useDefaultExcludes: true } as any),
    );
    vi.mocked(decideLabelsForFiles).mockReturnValue(ok([]));

    const result = await applyLabelsStage(context, artifacts);

    expect(result.isOk()).toBe(true);

    expect(logInfoI18n).toHaveBeenCalledWith('directoryLabeling.noLabelsMatched');
  });

  it('continues when CI status retrieval fails', async () => {
    vi.mocked(getCIStatus).mockReturnValue(errAsync({ type: 'GitHubAPIError', message: 'boom' } as any));

    const result = await applyLabelsStage(context, artifacts);

    expect(result.isOk()).toBe(true);
    expect(logWarning).toHaveBeenCalledWith('CI status unavailable: boom');
  });

  it('handles applyDirectoryLabels permission errors', async () => {
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: [], labelsToRemove: [], reasoning: [] }));
    vi.mocked(loadDirectoryLabelerConfig).mockReturnValue(
      ok({ namespaces: baseNamespaces, useDefaultExcludes: true } as any),
    );
    vi.mocked(decideLabelsForFiles).mockReturnValue(ok([{ label: 'scope/api', reason: 'match', priority: 1 }]));
    vi.mocked(filterByMaxLabels).mockReturnValue({
      selected: [{ label: 'scope/api', reason: 'match', priority: 1 }],
      rejected: [],
    });
    vi.mocked(applyDirectoryLabels).mockResolvedValue(err({ type: 'PermissionError', message: 'no perms' } as any));

    const result = await applyLabelsStage(context, artifacts);

    expect(result.isOk()).toBe(true);

    expect(logWarningI18n).toHaveBeenCalledWith('directoryLabeling.permissionError', { message: 'no perms' });
  });

  it('handles applyDirectoryLabels generic errors', async () => {
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: [], labelsToRemove: [], reasoning: [] }));
    vi.mocked(loadDirectoryLabelerConfig).mockReturnValue(
      ok({ namespaces: baseNamespaces, useDefaultExcludes: true } as any),
    );
    vi.mocked(decideLabelsForFiles).mockReturnValue(ok([{ label: 'scope/api', reason: 'match', priority: 1 }]));
    vi.mocked(filterByMaxLabels).mockReturnValue({
      selected: [{ label: 'scope/api', reason: 'match', priority: 1 }],
      rejected: [],
    });
    vi.mocked(applyDirectoryLabels).mockResolvedValue(err({ type: 'GitHubAPIError', message: 'boom' } as any));

    const result = await applyLabelsStage(context, artifacts);

    expect(result.isOk()).toBe(true);

    expect(logWarningI18n).toHaveBeenCalledWith('directoryLabeling.applyFailed', { message: 'boom' });
  });

  it('logs directory labeling failures in detail', async () => {
    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: [], labelsToRemove: [], reasoning: [] }));
    vi.mocked(loadDirectoryLabelerConfig).mockReturnValue(
      ok({ namespaces: baseNamespaces, useDefaultExcludes: true } as any),
    );
    vi.mocked(decideLabelsForFiles).mockReturnValue(ok([{ label: 'scope/api', reason: 'match', priority: 1 }]));
    vi.mocked(filterByMaxLabels).mockReturnValue({
      selected: [{ label: 'scope/api', reason: 'match', priority: 1 }],
      rejected: [],
    });
    vi.mocked(applyDirectoryLabels).mockResolvedValue(
      ok({ applied: [], skipped: [], removed: [], failed: [{ label: 'scope/api', reason: 'failed' }] }),
    );

    const result = await applyLabelsStage(context, artifacts);

    expect(result.isOk()).toBe(true);

    expect(logWarningI18n).toHaveBeenCalledWith('directoryLabeling.failedDetail', {
      label: 'scope/api',
      reason: 'failed',
    });
  });
});
