/**
 * Tests for config-builder module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildCompleteConfig } from '../src/config-builder.js';
import type { EnvironmentConfig } from '../src/environment-loader.js';
import type { ParsedInputs } from '../src/input-parser.js';
import type { LabelerConfig } from '../src/labeler-types.js';

// Mock actions-io for logDebug and logWarning
vi.mock('../src/actions-io.js', () => ({
  logDebug: vi.fn(),
  logWarning: vi.fn(),
}));

describe('buildCompleteConfig', () => {
  let parsedInputs: ParsedInputs;
  let labelerConfig: LabelerConfig;
  let envConfig: EnvironmentConfig;

  beforeEach(() => {
    // デフォルトのパース済み inputs
    parsedInputs = {
      language: undefined,
      githubToken: 'test-token',
      fileSizeLimit: 102400,
      fileLinesLimit: 1000,
      prAdditionsLimit: 5000,
      prFilesLimit: 100,
      sizeEnabled: true,
      complexityEnabled: false,
      categoryEnabled: true,
      riskEnabled: true,
      sizeThresholds: { small: 100, medium: 500, large: 1000, xlarge: 2000 },
      complexityThresholdsV2: { medium: 10, high: 20 },
      autoRemoveLabels: true,
      largeFilesLabel: 'auto/large-files',
      tooManyFilesLabel: 'auto/too-many-files',
      tooManyLinesLabel: 'auto/too-many-lines',
      excessiveChangesLabel: 'auto/excessive-changes',
      skipDraftPr: true,
      commentOnPr: 'auto',
      failOnLargeFiles: false,
      failOnTooManyFiles: false,
      failOnPrSize: '',
      enableSummary: true,
      additionalExcludePatterns: [],
      enableDirectoryLabeling: false,
      directoryLabelerConfigPath: '.github/directory-labeler.yml',
      maxLabels: 0,
      useDefaultExcludes: true,
    };

    // デフォルトの labeler config
    labelerConfig = {};

    // デフォルトの環境設定
    envConfig = {
      language: undefined,
      githubToken: undefined,
    };
  });

  describe('language priority resolution', () => {
    it('should use default language if all sources are undefined', () => {
      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);
      expect(config.language).toBe('en');
    });

    it('should use environment language if action input and labeler config are undefined', () => {
      envConfig.language = 'ja';
      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);
      expect(config.language).toBe('ja');
    });

    it('should prioritize labeler config over environment', () => {
      labelerConfig.language = 'ja';
      envConfig.language = 'en';
      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);
      expect(config.language).toBe('ja');
    });

    it('should prioritize action input over labeler config', () => {
      parsedInputs.language = 'en';
      labelerConfig.language = 'ja';
      envConfig.language = 'ja';
      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);
      expect(config.language).toBe('en');
    });

    it('should normalize language codes from action input', () => {
      parsedInputs.language = 'ja-JP';
      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);
      expect(config.language).toBe('ja');
    });

    it('should normalize language codes from labeler config', () => {
      labelerConfig.language = 'en-US';
      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);
      expect(config.language).toBe('en');
    });

    it('should normalize language codes from environment', () => {
      envConfig.language = 'ja-JP';
      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);
      expect(config.language).toBe('ja');
    });

    it('should fallback to default for invalid language codes', () => {
      parsedInputs.language = 'fr';
      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);
      expect(config.language).toBe('en'); // normalized with warning
    });
  });

  describe('config field mapping', () => {
    it('should map all parsed input fields to complete config', () => {
      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      expect(config.githubToken).toBe('test-token');
      expect(config.fileSizeLimit).toBe(102400);
      expect(config.sizeEnabled).toBe(true);
      expect(config.complexityEnabled).toBe(false);
      expect(config.sizeThresholds).toEqual({ small: 100, medium: 500, large: 1000, xlarge: 2000 });
      expect(config.skipDraftPr).toBe(true);
      expect(config.commentOnPr).toBe('auto');
    });

    it('should preserve all input fields in complete config', () => {
      parsedInputs.sizeEnabled = false;
      parsedInputs.complexityEnabled = true;
      parsedInputs.categoryEnabled = false;

      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      expect(config.sizeEnabled).toBe(false);
      expect(config.complexityEnabled).toBe(true);
      expect(config.categoryEnabled).toBe(false);
    });
  });
});
