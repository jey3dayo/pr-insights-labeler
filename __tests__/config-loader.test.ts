import * as core from '@actions/core';
import * as github from '@actions/github';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@actions/github');

import {
  getDefaultLabelerConfig,
  loadConfig,
  mergeWithDefaults,
  parseYamlConfig,
  validateLabelerConfig,
} from '../src/config-loader';
import { DEFAULT_LABELER_CONFIG } from '../src/labeler-types';

describe('Config Loader', () => {
  describe('parseYamlConfig', () => {
    it('should parse valid YAML configuration', async () => {
      const yaml = `
size:
  thresholds:
    small: 100
    medium: 500
    large: 1000
`;
      const result = await parseYamlConfig(yaml);
      expect(result.isOk()).toBe(true);
    });

    it('should reject invalid YAML syntax', async () => {
      const yaml = `
size:
  thresholds:
    small: 100
  invalid: [unclosed
`;
      const result = await parseYamlConfig(yaml);
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.type).toBe('ConfigurationError');
    });

    it('should reject empty configuration', async () => {
      const yaml = '';
      const result = await parseYamlConfig(yaml);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('validateLabelerConfig', () => {
    it('should validate valid configuration', async () => {
      const config = {
        size: {
          thresholds: {
            small: 100,
            medium: 500,
            large: 1000,
          },
        },
      };

      const result = await validateLabelerConfig(config);
      expect(result.isOk()).toBe(true);
    });

    it('should reject non-object configuration', async () => {
      const result = await validateLabelerConfig('invalid');
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.field).toBe('root');
    });

    it('should reject negative thresholds', async () => {
      const config = {
        size: {
          thresholds: {
            small: -10,
            medium: 500,
            large: 1000,
          },
        },
      };

      const result = await validateLabelerConfig(config);
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.field).toBe('size.thresholds.small');
    });

    it('should reject invalid threshold ordering (small >= medium)', async () => {
      const config = {
        size: {
          thresholds: {
            small: 500,
            medium: 100,
            large: 1000,
          },
        },
      };

      const result = await validateLabelerConfig(config);
      expect(result.isErr()).toBe(true);
    });

    it('should accept valid language field (en)', async () => {
      const config = {
        language: 'en',
        size: {
          thresholds: {
            small: 100,
            medium: 500,
            large: 1000,
          },
        },
      };

      const result = await validateLabelerConfig(config);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.language).toBe('en');
      }
    });

    it('should accept valid language field (ja)', async () => {
      const config = {
        language: 'ja',
        size: {
          thresholds: {
            small: 100,
            medium: 500,
            large: 1000,
          },
        },
      };

      const result = await validateLabelerConfig(config);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.language).toBe('ja');
      }
    });

    it('should reject invalid language field', async () => {
      const config = {
        language: 'fr',
        size: {
          thresholds: {
            small: 100,
            medium: 500,
            large: 1000,
          },
        },
      };

      const result = await validateLabelerConfig(config);
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.field).toBe('language');
    });

    it('should accept valid display_name in categories', async () => {
      const config = {
        categories: [
          {
            label: 'category/tests',
            patterns: ['**/*.test.ts'],
            display_name: {
              en: 'Tests',
              ja: 'テスト',
            },
          },
        ],
      };

      const result = await validateLabelerConfig(config);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.categories[0]?.display_name).toEqual({
          en: 'Tests',
          ja: 'テスト',
        });
      }
    });

    it('should reject invalid display_name structure', async () => {
      const config = {
        categories: [
          {
            label: 'category/tests',
            patterns: ['**/*.test.ts'],
            display_name: {
              en: 'Tests',
            },
          },
        ],
      };

      const result = await validateLabelerConfig(config);
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.field).toContain('display_name');
    });

    it('should reject invalid threshold ordering (medium >= large)', async () => {
      const config = {
        size: {
          thresholds: {
            small: 100,
            medium: 1000,
            large: 500,
          },
        },
      };

      const result = await validateLabelerConfig(config);
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.message).toContain('must be less than large');
    });

    it('should reject non-integer thresholds', async () => {
      const config = {
        complexity: {
          thresholds: {
            medium: 10.5,
            high: 20,
          },
        },
      };

      const result = await validateLabelerConfig(config);
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.field).toBe('complexity.thresholds.medium');
    });

    it('should validate category patterns', async () => {
      const config = {
        categories: [
          {
            label: 'category/tests',
            patterns: ['__tests__/**', '**/*.test.ts'],
          },
        ],
      };

      const result = await validateLabelerConfig(config);
      expect(result.isOk()).toBe(true);
    });

    it('should reject invalid category patterns (unmatched brackets)', async () => {
      const config = {
        categories: [
          {
            label: 'category/tests',
            patterns: ['**/*.{ts,tsx'],
          },
        ],
      };

      const result = await validateLabelerConfig(config);
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.message).toContain('Invalid minimatch pattern');
    });

    it('should reject non-array categories', async () => {
      const config = {
        categories: 'invalid',
      };

      const result = await validateLabelerConfig(config);
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.field).toBe('categories');
    });

    it('should warn about unknown keys', async () => {
      const warningSpy = vi.spyOn(core, 'warning').mockImplementation(() => {});

      const config = {
        unknown_key: 'value',
        size: { thresholds: { small: 100, medium: 500, large: 1000 } },
      };

      await validateLabelerConfig(config);
      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown configuration keys'));

      warningSpy.mockRestore();
    });
  });

  describe('mergeWithDefaults', () => {
    it('should use defaults for missing fields', () => {
      const userConfig = {};
      const merged = mergeWithDefaults(userConfig);

      expect(merged.size).toEqual(DEFAULT_LABELER_CONFIG.size);
      expect(merged.complexity).toEqual(DEFAULT_LABELER_CONFIG.complexity);
      expect(merged.categories).toEqual(DEFAULT_LABELER_CONFIG.categories);
    });

    it('should override defaults with user values', () => {
      const userConfig = {
        size: {
          thresholds: {
            small: 50,
            medium: 250,
            large: 750,
          },
        },
      };

      const merged = mergeWithDefaults(userConfig);
      expect(merged.size.thresholds.small).toBe(50);
      expect(merged.size.thresholds.medium).toBe(250);
      expect(merged.size.thresholds.large).toBe(750);
    });

    it('should handle partial configuration', () => {
      const userConfig: Partial<typeof DEFAULT_LABELER_CONFIG> = {
        size: {
          thresholds: {
            small: 50,
            medium: DEFAULT_LABELER_CONFIG.size.thresholds.medium,
            large: DEFAULT_LABELER_CONFIG.size.thresholds.large,
          },
        },
      };

      const merged = mergeWithDefaults(userConfig);
      expect(merged.size.thresholds.small).toBe(50);
      expect(merged.size.thresholds.medium).toBe(DEFAULT_LABELER_CONFIG.size.thresholds.medium);
      expect(merged.size.thresholds.large).toBe(DEFAULT_LABELER_CONFIG.size.thresholds.large);
    });
  });

  describe('loadConfig', () => {
    it('should load config from GitHub API', async () => {
      const mockGetContent = vi.fn().mockResolvedValue({
        data: {
          content: Buffer.from('size:\n  thresholds:\n    small: 100\n    medium: 500\n    large: 1000\n').toString(
            'base64',
          ),
        },
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: mockGetContent,
          },
        },
      };

      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const result = await loadConfig('token', 'owner', 'repo', 'ref');
      expect(result.isOk()).toBe(true);
      expect(mockGetContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: '.github/pr-labeler.yml',
        ref: 'ref',
      });
    });

    it('should return error for 404 (config file not found)', async () => {
      const mockGetContent = vi.fn().mockRejectedValue({ status: 404, message: 'Not Found' });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: mockGetContent,
          },
        },
      };

      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const result = await loadConfig('token', 'owner', 'repo', 'ref');
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.message).toContain('not found');
    });

    it('should reject oversized config files', async () => {
      const largeContent = 'x'.repeat(2 * 1024 * 1024);
      const mockGetContent = vi.fn().mockResolvedValue({
        data: {
          content: Buffer.from(largeContent).toString('base64'),
        },
      });

      const mockOctokit = {
        rest: {
          repos: {
            getContent: mockGetContent,
          },
        },
      };

      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const result = await loadConfig('token', 'owner', 'repo', 'ref');
      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.message).toContain('too large');
    });
  });

  describe('getDefaultLabelerConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultLabelerConfig();
      expect(config).toEqual(DEFAULT_LABELER_CONFIG);
    });
  });
});
