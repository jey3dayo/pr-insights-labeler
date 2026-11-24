import type { EnvironmentConfig } from '../../src/environment-loader.js';
import type { Config } from '../../src/input-mapper.js';
import type { ParsedInputs } from '../../src/input-parser.js';
import type { LabelerConfig } from '../../src/labeler-types.js';
import { DEFAULT_LABELER_CONFIG } from '../../src/labeler-types.js';

export const defaultParsedInputs: ParsedInputs = {
  language: 'en',
  githubToken: 'test-github-token',
  fileSizeLimit: 100000,
  fileSizeLimitEnabled: true,
  fileLinesLimit: 500,
  fileLinesLimitEnabled: true,
  prAdditionsLimitEnabled: true,
  prFilesLimitEnabled: true,
  prAdditionsLimit: 5000,
  prFilesLimit: 50,
  sizeEnabled: true,
  complexityEnabled: false,
  categoryEnabled: true,
  riskEnabled: true,
  sizeThresholds: { small: 200, medium: 500, large: 1000, xlarge: 3000 },
  complexityThresholdsV2: { medium: 10, high: 20 },
  largeFilesLabel: 'large-files',
  tooManyFilesLabel: 'too-many-files',
  tooManyLinesLabel: 'too-many-lines',
  excessiveChangesLabel: 'excessive-changes',
  skipDraftPr: false,
  commentOnPr: 'auto',
  failOnLargeFiles: false,
  failOnTooManyFiles: false,
  failOnPrSize: '',
  enableSummary: true,
  additionalExcludePatterns: [],
  enableDirectoryLabeling: false,
  directoryLabelerConfigPath: '.github/labeler.yml',
  maxLabels: 100,
  useDefaultExcludes: true,
};

export const defaultLabelerConfig: LabelerConfig = { ...DEFAULT_LABELER_CONFIG };

export const defaultEnvironmentConfig: EnvironmentConfig = {
  language: undefined,
  enableSize: undefined,
  enableComplexity: undefined,
  enableCategory: undefined,
  enableRisk: undefined,
  sizeThresholds: undefined,
  complexityThresholds: undefined,
};

export const defaultConfig: Config = {
  ...defaultParsedInputs,
};

export const createMockParsedInputs = (overrides?: Partial<ParsedInputs>): ParsedInputs => ({
  ...defaultParsedInputs,
  ...overrides,
});

export const createMockLabelerConfig = (overrides?: Partial<LabelerConfig>): LabelerConfig => ({
  ...defaultLabelerConfig,
  ...overrides,
});

export const createMockEnvironmentConfig = (overrides?: Partial<EnvironmentConfig>): EnvironmentConfig => ({
  ...defaultEnvironmentConfig,
  ...overrides,
});

export const createMockConfig = (overrides?: Partial<Config>): Config => ({
  ...defaultConfig,
  ...overrides,
});

export const backupEnvironment = (): (() => void) => {
  const originalEnv = { ...process.env };
  return () => {
    process.env = originalEnv;
  };
};

export const setupEnvironment = (env: Record<string, string>): void => {
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
};

export const clearEnvironment = (keys: string[]): void => {
  keys.forEach(key => {
    delete process.env[key];
  });
};
