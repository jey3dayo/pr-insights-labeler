import { vi } from 'vitest';

export const setupActionsEnvironment = (): (() => void) => {
  const originalEnv = { ...process.env };

  return () => {
    process.env = originalEnv;
  };
};

export const setupGitHubEnvVars = (env: Record<string, string>): void => {
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
};

export const clearGitHubEnvVars = (keys: string[]): void => {
  keys.forEach(key => {
    delete process.env[key];
  });
};

export const clearGitHubTokens = (): void => {
  delete process.env['GITHUB_TOKEN'];
  delete process.env['GH_TOKEN'];
};

export const setupActionsCoreMocks = (): void => {
  vi.clearAllMocks();
};

export const createMockGetInput = (inputs: Record<string, string>) => {
  return (name: string): string => {
    return inputs[name] ?? '';
  };
};

export const createMockGetBooleanInput = (inputs: Record<string, boolean>) => {
  return (name: string): boolean => {
    return inputs[name] ?? false;
  };
};

export const DEFAULT_GITHUB_TOKEN = 'test-github-token-123';

export const DEFAULT_GITHUB_REPOSITORY = 'owner/test-repo';

export const DEFAULT_GITHUB_SHA = 'abc123def456';

export const DEFAULT_PR_NUMBER = 42;

export const DEFAULT_ACTION_INPUTS = {
  github_token: DEFAULT_GITHUB_TOKEN,
  language: 'en',
  enable_size: 'true',
  enable_complexity: 'false',
  enable_category: 'true',
  enable_risk: 'true',
  file_size_limit: '100000',
  file_size_limit_enabled: 'true',
  file_lines_limit: '500',
  file_lines_limit_enabled: 'true',
  pr_additions_limit: '5000',
  pr_additions_limit_enabled: 'true',
  pr_files_limit: '50',
  size_thresholds_v2: '200,500,1000,3000',
  complexity_thresholds_v2: '10,20',
  skip_draft_pr: 'false',
  comment_on_pr: 'auto',
  enable_summary: 'true',
  enable_directory_labeling: 'false',
  max_labels: '100',
  use_default_excludes: 'true',
};

export const withActionsEnvironment = <T>(fn: () => T): T => {
  const restore = setupActionsEnvironment();
  setupGitHubEnvVars({
    GITHUB_TOKEN: DEFAULT_GITHUB_TOKEN,
    GITHUB_REPOSITORY: DEFAULT_GITHUB_REPOSITORY,
    GITHUB_SHA: DEFAULT_GITHUB_SHA,
  });

  try {
    return fn();
  } finally {
    restore();
  }
};

export const withCleanEnvironment = <T>(fn: () => T): T => {
  const restore = setupActionsEnvironment();
  clearGitHubTokens();

  try {
    return fn();
  } finally {
    restore();
  }
};
