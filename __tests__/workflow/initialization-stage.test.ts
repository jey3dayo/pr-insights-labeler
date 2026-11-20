import { errAsync, ok, okAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getEnvVar, getPullRequestContext, logInfoI18n, logWarningI18n } from '../../src/actions-io';
import { buildCompleteConfig } from '../../src/config-builder.js';
import { getDefaultLabelerConfig, loadConfig } from '../../src/config-loader';
import { loadEnvironmentConfig } from '../../src/environment-loader.js';
import { initializeI18n } from '../../src/i18n.js';
import { parseActionInputs } from '../../src/input-parser.js';
import { initializeAction } from '../../src/workflow/stages/initialization';

vi.mock('../../src/actions-io', () => ({
  getEnvVar: vi.fn(),
  getPullRequestContext: vi.fn(),
  logInfoI18n: vi.fn(),
  logWarningI18n: vi.fn(),
}));

vi.mock('../../src/config-builder.js', () => ({
  buildCompleteConfig: vi.fn(),
}));

vi.mock('../../src/config-loader', () => ({
  loadConfig: vi.fn(),
  getDefaultLabelerConfig: vi.fn(),
}));

vi.mock('../../src/environment-loader.js', () => ({
  loadEnvironmentConfig: vi.fn(),
}));

vi.mock('../../src/i18n.js', () => ({
  initializeI18n: vi.fn(),
}));

vi.mock('../../src/input-parser.js', () => ({
  parseActionInputs: vi.fn(),
}));

describe('workflow/stages/initialization', () => {
  const prContext = {
    owner: 'octo',
    repo: 'repo',
    pullNumber: 99,
    baseSha: 'base-sha',
    headSha: 'head-sha',
    isDraft: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parseActionInputs).mockReturnValue(ok({ githubToken: 'token' }) as never);
    vi.mocked(getPullRequestContext).mockReturnValue(prContext);
    vi.mocked(loadEnvironmentConfig).mockReturnValue({ language: 'en', githubToken: 'token' });
    vi.mocked(loadConfig).mockReturnValue(okAsync({}) as never);
    vi.mocked(getDefaultLabelerConfig).mockReturnValue({} as never);
    vi.mocked(buildCompleteConfig).mockReturnValue({ language: 'en', skipDraftPr: false } as never);
    vi.mocked(initializeI18n).mockReturnValue(ok(undefined) as never);
  });

  describe('labeler policy config ref (trust boundary)', () => {
    it('reads the policy file from the base SHA on pull_request_target', async () => {
      vi.mocked(getEnvVar).mockReturnValue('pull_request_target');

      const result = await initializeAction();

      expect(result.isOk()).toBe(true);
      expect(loadConfig).toHaveBeenCalledWith('token', 'octo', 'repo', 'base-sha');
      expect(logInfoI18n).toHaveBeenCalledWith('initialization.policyConfigFromBase', { ref: 'base-sha' });
    });

    it('reads the policy file from the head SHA on pull_request', async () => {
      vi.mocked(getEnvVar).mockReturnValue('pull_request');

      const result = await initializeAction();

      expect(result.isOk()).toBe(true);
      expect(loadConfig).toHaveBeenCalledWith('token', 'octo', 'repo', 'head-sha');
    });

    it('falls back to the default branch (no ref), never head, when the base SHA is unavailable on pull_request_target', async () => {
      vi.mocked(getEnvVar).mockReturnValue('pull_request_target');
      vi.mocked(getPullRequestContext).mockReturnValue({ ...prContext, baseSha: '' });

      const result = await initializeAction();

      expect(result.isOk()).toBe(true);
      expect(loadConfig).toHaveBeenCalledWith('token', 'octo', 'repo', undefined);
      expect(logWarningI18n).toHaveBeenCalledWith('initialization.policyConfigBaseShaMissing');
    });
  });

  describe('labeler config load failure', () => {
    it('warns with the reason and continues with defaults when the config fails to load', async () => {
      vi.mocked(getEnvVar).mockReturnValue('pull_request');
      vi.mocked(loadConfig).mockReturnValue(
        errAsync({ value: 'invalid', message: 'Invalid configuration: bad thresholds' }) as never,
      );
      const defaultConfig = { marker: 'default' };
      vi.mocked(getDefaultLabelerConfig).mockReturnValue(defaultConfig as never);

      const result = await initializeAction();

      expect(result.isOk()).toBe(true);
      expect(logWarningI18n).toHaveBeenCalledWith('initialization.configLoadFailed', {
        message: 'Invalid configuration: bad thresholds',
      });
      expect(buildCompleteConfig).toHaveBeenCalledWith(expect.anything(), defaultConfig, expect.anything());
    });

    it('does not warn when the configuration file simply does not exist', async () => {
      vi.mocked(getEnvVar).mockReturnValue('pull_request');
      vi.mocked(loadConfig).mockReturnValue(
        errAsync({ value: 'not found', message: 'Configuration file not found' }) as never,
      );

      const result = await initializeAction();

      expect(result.isOk()).toBe(true);
      expect(logWarningI18n).not.toHaveBeenCalledWith('initialization.configLoadFailed', expect.anything());
      expect(getDefaultLabelerConfig).toHaveBeenCalled();
    });
  });
});
