/**
 * Trust boundary for the directory labeling policy under `pull_request_target`.
 *
 * The docs recommend checking out the base ref so that a fork cannot swap the labeling policy,
 * but file metrics must still measure the PR head. These tests pin the resulting split: the
 * policy comes from the trusted base ref over the GitHub API, while other events keep reading the
 * local checkout. They drive the real directory-labeler pipeline (config parsing, pattern
 * matching, decision engine) and assert on the labels that actually reach label application.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getOctokit } from '@actions/github';
import { ok, okAsync } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getEnvVar, logWarningI18n } from '../../src/actions-io';
import { applyDirectoryLabels } from '../../src/directory-labeler/label-applicator.js';
import { initializeI18n, resetI18n } from '../../src/i18n.js';
import { applyLabels } from '../../src/label-applicator';
import { decideLabels } from '../../src/label-decision-engine';
import { applyLabelsStage } from '../../src/workflow/stages/labeling';
import type { AnalysisArtifacts, InitializationArtifacts } from '../../src/workflow/types';

vi.mock('@actions/github', () => ({
  getOctokit: vi.fn(),
}));

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../src/actions-io', () => ({
  getEnvVar: vi.fn(),
  logInfoI18n: vi.fn(),
  logWarningI18n: vi.fn(),
  logDebugI18n: vi.fn(),
  logErrorI18n: vi.fn(),
  logInfo: vi.fn(),
  logWarning: vi.fn(),
}));

vi.mock('../../src/label-decision-engine', () => ({
  decideLabels: vi.fn(),
}));

vi.mock('../../src/label-applicator', () => ({
  applyLabels: vi.fn(),
}));

vi.mock('../../src/directory-labeler/label-applicator.js', () => ({
  applyDirectoryLabels: vi.fn(),
}));

const ATTACKER_CONFIG = `
version: 1
rules:
  - label: "attacker/policy"
    include:
      - "src/**"
`;

const TRUSTED_CONFIG = `
version: 1
rules:
  - label: "trusted/policy"
    include:
      - "src/**"
`;

const DEFAULT_BRANCH_CONFIG = `
version: 1
rules:
  - label: "default-branch/policy"
    include:
      - "src/**"
`;

function base64(content: string): string {
  return Buffer.from(content, 'utf-8').toString('base64');
}

/** Labels that reached label application, i.e. the effective labeling decision. */
function appliedLabels(): string[] {
  const call = vi.mocked(applyDirectoryLabels).mock.calls[0];
  if (!call) {
    return [];
  }
  return call[2].map(decision => decision.label);
}

describe('workflow/stages/labeling: directory labeling policy trust boundary', () => {
  let tempDir: string;
  let localConfigPath: string;
  let getContent: ReturnType<typeof vi.fn>;

  const buildContext = (overrides: { baseSha?: string } = {}): InitializationArtifacts => ({
    token: 'token',
    prContext: {
      owner: 'octo',
      repo: 'repo',
      pullNumber: 99,
      baseSha: overrides.baseSha ?? 'trusted-base',
      headSha: 'attacker-head',
      isDraft: false,
    },
    config: {
      language: 'en',
      githubToken: 'token',
      fileSizeLimit: 1024,
      fileSizeLimitEnabled: true,
      fileLinesLimit: 400,
      fileLinesLimitEnabled: true,
      prAdditionsLimit: 300,
      prAdditionsLimitEnabled: true,
      prFilesLimit: 20,
      prFilesLimitEnabled: true,
      sizeEnabled: true,
      sizeThresholds: { small: 50, medium: 150, large: 250, xlarge: 500 },
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
      enableDirectoryLabeling: true,
      directoryLabelerConfigPath: localConfigPath,
      maxLabels: 5,
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
        // Keeps the test focused on config loading: no CI status or commit fetching.
        use_ci_status: false,
      },
      exclude: { additional: [] },
      labels: { create_missing: true, namespace_policies: {} },
    },
    skipDraft: false,
  });

  const artifacts = (): AnalysisArtifacts => ({
    files: [
      { filename: 'src/app.ts', status: 'modified' },
      { filename: '__tests__/foo.test.ts', status: 'added' },
    ] as AnalysisArtifacts['files'],
    analysis: {
      metrics: {
        totalFiles: 2,
        totalAdditions: 10,
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
    },
    hasViolations: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetI18n();
    initializeI18n('en');

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-trust-'));
    localConfigPath = path.join(tempDir, 'directory-labeler.yml');
    // The local checkout is the fork-controlled head under `pull_request_target`.
    fs.writeFileSync(localConfigPath, ATTACKER_CONFIG, 'utf-8');

    getContent = vi.fn().mockResolvedValue({ data: { content: base64(TRUSTED_CONFIG) } });
    vi.mocked(getOctokit).mockReturnValue({
      rest: { repos: { getContent }, pulls: { listCommits: vi.fn() } },
      paginate: vi.fn(),
    } as unknown as ReturnType<typeof getOctokit>);

    vi.mocked(decideLabels).mockReturnValue(ok({ labelsToAdd: [], labelsToRemove: [], reasoning: [] }));
    vi.mocked(applyLabels).mockReturnValue(okAsync({ added: [], removed: [], apiCalls: 0 }));
    vi.mocked(applyDirectoryLabels).mockResolvedValue(ok({ applied: [], skipped: [], removed: [], failed: [] }));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('labels from the base ref policy, not the local checkout, on pull_request_target', async () => {
    vi.mocked(getEnvVar).mockReturnValue('pull_request_target');

    const result = await applyLabelsStage(buildContext(), artifacts());

    expect(result.isOk()).toBe(true);
    expect(appliedLabels()).toContain('trusted/policy');
    expect(appliedLabels()).not.toContain('attacker/policy');
  });

  it('requests the policy file from the base repository at the base SHA', async () => {
    vi.mocked(getEnvVar).mockReturnValue('pull_request_target');

    await applyLabelsStage(buildContext(), artifacts());

    expect(getContent).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'octo',
        repo: 'repo',
        ref: 'trusted-base',
        path: localConfigPath,
      }),
    );
  });

  it('labels from the default branch policy, not the local checkout, when the base SHA is unavailable', async () => {
    vi.mocked(getEnvVar).mockReturnValue('pull_request_target');
    getContent.mockResolvedValue({ data: { content: base64(DEFAULT_BRANCH_CONFIG) } });

    const result = await applyLabelsStage(buildContext({ baseSha: '' }), artifacts());

    expect(result.isOk()).toBe(true);
    expect(appliedLabels()).toContain('default-branch/policy');
    expect(appliedLabels()).not.toContain('attacker/policy');
    expect(getContent).toHaveBeenCalledWith(expect.not.objectContaining({ ref: expect.anything() }));
  });

  it('labels from the local checkout policy on pull_request', async () => {
    vi.mocked(getEnvVar).mockReturnValue('pull_request');

    const result = await applyLabelsStage(buildContext(), artifacts());

    expect(result.isOk()).toBe(true);
    expect(appliedLabels()).toContain('attacker/policy');
    expect(getContent).not.toHaveBeenCalled();
  });

  it('falls back to the default categories when the policy file is absent from the base ref', async () => {
    vi.mocked(getEnvVar).mockReturnValue('pull_request_target');
    getContent.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));

    const result = await applyLabelsStage(buildContext(), artifacts());

    expect(result.isOk()).toBe(true);
    expect(appliedLabels()).toContain('category/tests');
    expect(appliedLabels()).not.toContain('attacker/policy');
  });

  it('skips directory labeling when the base ref policy is invalid', async () => {
    vi.mocked(getEnvVar).mockReturnValue('pull_request_target');
    getContent.mockResolvedValue({ data: { content: base64('version: 2\nrules: []\n') } });

    const result = await applyLabelsStage(buildContext(), artifacts());

    expect(result.isOk()).toBe(true);
    expect(appliedLabels()).toEqual([]);
    expect(logWarningI18n).toHaveBeenCalledWith(
      'directoryLabeling.configLoadFailed',
      expect.objectContaining({ message: expect.stringContaining('version') }),
    );
  });
});
