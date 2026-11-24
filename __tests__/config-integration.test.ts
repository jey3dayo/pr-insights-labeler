import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildCompleteConfig } from '../src/config-builder.js';
import { loadEnvironmentConfig } from '../src/environment-loader.js';
import { initializeI18n } from '../src/i18n.js';
import { createMockLabelerConfig, createMockParsedInputs, setupI18nEnvironment } from './__fixtures__/index.js';

describe('Configuration Integration', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    restoreEnv = setupI18nEnvironment();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('Priority Chain: action input > labeler config > env > default', () => {
    it('should prioritize action input over labeler config and environment', () => {
      process.env['LANGUAGE'] = 'ja';

      const parsedInputs = createMockParsedInputs({ language: 'en' });
      const labelerConfig = createMockLabelerConfig({ language: 'ja' });
      const envConfig = loadEnvironmentConfig();

      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      expect(config.language).toBe('en');
    });

    it('should use labeler config when action input is undefined', () => {
      process.env['LANGUAGE'] = 'en';

      const parsedInputs = createMockParsedInputs({ language: undefined });
      const labelerConfig = createMockLabelerConfig({ language: 'ja' });
      const envConfig = loadEnvironmentConfig();

      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      expect(config.language).toBe('ja');
    });

    it('should use environment when both action input and labeler config are undefined', () => {
      process.env['LANGUAGE'] = 'ja';

      const parsedInputs = createMockParsedInputs({ language: undefined });
      const labelerConfig = createMockLabelerConfig({ language: undefined });
      const envConfig = loadEnvironmentConfig();

      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      expect(config.language).toBe('ja');
    });

    it('should use default when all sources are undefined', () => {
      delete process.env['LANGUAGE'];
      delete process.env['LANG'];

      const parsedInputs = createMockParsedInputs({ language: undefined });
      const labelerConfig = createMockLabelerConfig({ language: undefined });
      const envConfig = loadEnvironmentConfig();

      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      expect(config.language).toBe('en');
    });
  });

  describe('Language Code Normalization', () => {
    it('should normalize locale format from labeler config (ja-JP -> ja)', () => {
      const parsedInputs = createMockParsedInputs({ language: undefined });
      const labelerConfig = createMockLabelerConfig({ language: 'ja-JP' });
      const envConfig = loadEnvironmentConfig();

      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      expect(config.language).toBe('ja');
    });

    it('should normalize locale format from environment (en-US -> en)', () => {
      process.env['LANGUAGE'] = 'en-US';

      const parsedInputs = createMockParsedInputs({ language: undefined });
      const labelerConfig = createMockLabelerConfig({ language: undefined });
      const envConfig = loadEnvironmentConfig();

      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      expect(config.language).toBe('en');
    });
  });

  describe('Bug Fix: LANGUAGE environment variable', () => {
    it('should respect LANGUAGE=ja environment variable', () => {
      process.env['LANGUAGE'] = 'ja';

      const parsedInputs = createMockParsedInputs({ language: undefined });
      const labelerConfig = createMockLabelerConfig({ language: undefined });
      const envConfig = loadEnvironmentConfig();

      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      expect(config.language).toBe('ja');
    });
  });

  describe('i18n Integration', () => {
    it('should initialize i18n with resolved language code', () => {
      process.env['LANGUAGE'] = 'ja';

      const parsedInputs = createMockParsedInputs({ language: undefined });
      const labelerConfig = createMockLabelerConfig({ language: undefined });
      const envConfig = loadEnvironmentConfig();

      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      const result = initializeI18n(config.language);

      expect(result.isOk()).toBe(true);
      expect(config.language).toBe('ja');
    });
  });
});
