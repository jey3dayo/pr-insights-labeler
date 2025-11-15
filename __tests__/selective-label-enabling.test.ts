/**
 * Tests for Selective Label Enabling Feature
 * テスト駆動開発（TDD）によるラベル種別の選択的有効化機能
 */

import { describe, expect, it } from 'vitest';

import type { LabelerConfig } from '../src/labeler-types';
import { DEFAULT_LABELER_CONFIG } from '../src/labeler-types';
import {
  parseBooleanStrict,
  parseComplexityThresholdsV2,
  parseSizeThresholdsV2,
} from '../src/parsers/action-input-parsers';

describe('Selective Label Enabling - Type Definitions', () => {
  describe('LabelerConfig type structure', () => {
    it('should have size.enabled field', () => {
      const config: LabelerConfig = DEFAULT_LABELER_CONFIG;
      expect(config.size).toHaveProperty('enabled');
      expect(typeof config.size.enabled).toBe('boolean');
    });

    it('should have categoryLabeling.enabled field', () => {
      const config: LabelerConfig = DEFAULT_LABELER_CONFIG;
      expect(config).toHaveProperty('categoryLabeling');
      expect(config.categoryLabeling).toHaveProperty('enabled');
      expect(typeof config.categoryLabeling.enabled).toBe('boolean');
    });

    it('should have risk.enabled field', () => {
      const config: LabelerConfig = DEFAULT_LABELER_CONFIG;
      expect(config.risk).toHaveProperty('enabled');
      expect(typeof config.risk.enabled).toBe('boolean');
    });

    it('should have complexity.enabled field (existing)', () => {
      const config: LabelerConfig = DEFAULT_LABELER_CONFIG;
      expect(config.complexity).toHaveProperty('enabled');
      expect(typeof config.complexity.enabled).toBe('boolean');
    });
  });

  describe('Default configuration values', () => {
    it('should have all enabled flags set to true by default', () => {
      const config: LabelerConfig = DEFAULT_LABELER_CONFIG;
      expect(config.size.enabled).toBe(true);
      expect(config.complexity.enabled).toBe(true);
      expect(config.categoryLabeling.enabled).toBe(true);
      expect(config.risk.enabled).toBe(true);
    });
  });
});

describe('Selective Label Enabling - Input Parsing', () => {
  describe('parseBooleanStrict', () => {
    it('should parse valid true values', () => {
      const trueValues = ['true', 'TRUE', 'True', '1', 'yes', 'YES', 'on', 'ON', ' true '];
      for (const value of trueValues) {
        const result = parseBooleanStrict(value);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(true);
        }
      }
    });

    it('should parse valid false values', () => {
      const falseValues = ['false', 'FALSE', 'False', '0', 'no', 'NO', 'off', 'OFF', ' false '];
      for (const value of falseValues) {
        const result = parseBooleanStrict(value);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(false);
        }
      }
    });

    it('should reject unknown values with ConfigurationError', () => {
      const invalidValues = ['invalid', 'maybe', 'sometimes', '', 'truee', '2'];
      for (const value of invalidValues) {
        const result = parseBooleanStrict(value);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('ConfigurationError');
          expect(result.error.message).toContain('Invalid boolean value');
        }
      }
    });
  });

  describe('parseSizeThresholdsV2', () => {
    it('should parse valid size thresholds', () => {
      const json = '{"small": 200, "medium": 500, "large": 1000, "xlarge": 3000}';
      const result = parseSizeThresholdsV2(json);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ small: 200, medium: 500, large: 1000, xlarge: 3000 });
      }
    });

    it('should reject invalid JSON', () => {
      const json = '{invalid json}';
      const result = parseSizeThresholdsV2(json);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ParseError');
      }
    });

    it('should reject missing required fields', () => {
      const json = '{"small": 100}';
      const result = parseSizeThresholdsV2(json);
      expect(result.isErr()).toBe(true);
    });

    it('should reject negative values', () => {
      const json = '{"small": -10, "medium": 500, "large": 1000, "xlarge": 3000}';
      const result = parseSizeThresholdsV2(json);
      expect(result.isErr()).toBe(true);
    });

    it('should reject invalid ordering (small >= medium)', () => {
      const json = '{"small": 500, "medium": 100, "large": 1000, "xlarge": 3000}';
      const result = parseSizeThresholdsV2(json);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('small');
        expect(result.error.message).toContain('medium');
      }
    });

    it('should reject invalid ordering (medium >= large)', () => {
      const json = '{"small": 100, "medium": 1000, "large": 500, "xlarge": 3000}';
      const result = parseSizeThresholdsV2(json);
      expect(result.isErr()).toBe(true);
    });

    it('should reject invalid ordering (large >= xlarge)', () => {
      const json = '{"small": 100, "medium": 500, "large": 3000, "xlarge": 1000}';
      const result = parseSizeThresholdsV2(json);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('large');
        expect(result.error.message).toContain('xlarge');
      }
    });
  });

  describe('parseComplexityThresholdsV2', () => {
    it('should parse valid complexity thresholds', () => {
      const json = '{"medium": 10, "high": 20}';
      const result = parseComplexityThresholdsV2(json);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ medium: 10, high: 20 });
      }
    });

    it('should reject invalid JSON', () => {
      const json = '{invalid json}';
      const result = parseComplexityThresholdsV2(json);
      expect(result.isErr()).toBe(true);
    });

    it('should reject missing required fields', () => {
      const json = '{"medium": 10}';
      const result = parseComplexityThresholdsV2(json);
      expect(result.isErr()).toBe(true);
    });

    it('should reject negative values', () => {
      const json = '{"medium": -5, "high": 20}';
      const result = parseComplexityThresholdsV2(json);
      expect(result.isErr()).toBe(true);
    });

    it('should reject invalid ordering (medium >= high)', () => {
      const json = '{"medium": 20, "high": 10}';
      const result = parseComplexityThresholdsV2(json);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('medium');
        expect(result.error.message).toContain('high');
      }
    });
  });
});
