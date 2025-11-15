/**
 * Configuration Fixtures
 *
 * Provides default test configurations and factory functions
 * for creating mock configs with flexible overrides.
 *
 * Pattern inspired by action-cache's actionContextFixtures.ts
 */

import type { EnvironmentConfig } from '../../src/environment-loader.js';
import type { Config } from '../../src/input-mapper.js';
import type { ParsedInputs } from '../../src/input-parser.js';
import type { LabelerConfig } from '../../src/labeler-types.js';
import { DEFAULT_LABELER_CONFIG } from '../../src/labeler-types.js';

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default ParsedInputs for testing
 */
export const defaultParsedInputs: ParsedInputs = {
  language: 'en',
  githubToken: 'test-github-token',
  fileSizeLimit: 100000,
  fileLinesLimit: 500,
  prAdditionsLimit: 5000,
  prFilesLimit: 50,
  sizeEnabled: true,
  complexityEnabled: false,
  categoryEnabled: true,
  riskEnabled: true,
  sizeThresholds: { small: 200, medium: 500, large: 1000, xlarge: 3000 },
  complexityThresholdsV2: { medium: 10, high: 20 },
  autoRemoveLabels: true,
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

/**
 * Default LabelerConfig for testing
 * Uses the actual DEFAULT_LABELER_CONFIG but can be overridden
 */
export const defaultLabelerConfig: LabelerConfig = { ...DEFAULT_LABELER_CONFIG };

/**
 * Default EnvironmentConfig for testing
 */
export const defaultEnvironmentConfig: EnvironmentConfig = {
  language: undefined,
  enableSize: undefined,
  enableComplexity: undefined,
  enableCategory: undefined,
  enableRisk: undefined,
  sizeThresholds: undefined,
  complexityThresholds: undefined,
};

/**
 * Default Config for testing
 */
export const defaultConfig: Config = {
  language: 'en',
  enableSize: true,
  sizeSmall: 200,
  sizeMedium: 500,
  sizeLarge: 1000,
  sizeXlarge: 3000,
  enableComplexity: false,
  complexityMedium: 10,
  complexityHigh: 20,
  enableCategory: true,
  enableRisk: true,
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a mock ParsedInputs with optional overrides
 *
 * @example
 * const inputs = createMockParsedInputs({ language: 'ja' });
 */
export const createMockParsedInputs = (overrides?: Partial<ParsedInputs>): ParsedInputs => ({
  ...defaultParsedInputs,
  ...overrides,
});

/**
 * Create a mock LabelerConfig with optional overrides
 *
 * @example
 * const config = createMockLabelerConfig({ language: 'ja' });
 */
export const createMockLabelerConfig = (overrides?: Partial<LabelerConfig>): LabelerConfig => ({
  ...defaultLabelerConfig,
  ...overrides,
});

/**
 * Create a mock EnvironmentConfig with optional overrides
 *
 * @example
 * const envConfig = createMockEnvironmentConfig({ language: 'ja' });
 */
export const createMockEnvironmentConfig = (overrides?: Partial<EnvironmentConfig>): EnvironmentConfig => ({
  ...defaultEnvironmentConfig,
  ...overrides,
});

/**
 * Create a mock Config with optional overrides
 *
 * @example
 * const config = createMockConfig({ language: 'ja' });
 */
export const createMockConfig = (overrides?: Partial<Config>): Config => ({
  ...defaultConfig,
  ...overrides,
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Backup and restore environment variables helper
 *
 * @example
 * const restoreEnv = backupEnvironment();
 * // ... test code that modifies process.env
 * restoreEnv();
 */
export const backupEnvironment = (): (() => void) => {
  const originalEnv = { ...process.env };
  return () => {
    process.env = originalEnv;
  };
};

/**
 * Setup environment variables for testing
 *
 * @example
 * setupEnvironment({ LANGUAGE: 'ja', ENABLE_SIZE: 'true' });
 */
export const setupEnvironment = (env: Record<string, string>): void => {
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
};

/**
 * Clear specific environment variables
 *
 * @example
 * clearEnvironment(['LANGUAGE', 'ENABLE_SIZE']);
 */
export const clearEnvironment = (keys: string[]): void => {
  keys.forEach(key => {
    delete process.env[key];
  });
};
