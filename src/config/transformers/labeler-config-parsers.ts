import { err, ok, type Result } from 'neverthrow';

import { type ConfigurationError, createConfigurationError } from '../../errors/index.js';
import type { LabelerConfig } from '../../labeler-types.js';
import { DEFAULT_LABELER_CONFIG } from '../../labeler-types.js';
import { validateNumericThreshold } from '../../utils/config-transformer-utils.js';
import { validateMinimatchPattern } from '../../utils/pattern-validator.js';
import { isBoolean, isConfigurationError, isRecord, isString, isStringArray } from '../../utils/type-guards.js';

export const KNOWN_FIELD_NAMES = {
  LANGUAGE: 'language',
  SUMMARY: 'summary',
  SIZE: 'size',
  COMPLEXITY: 'complexity',
  CATEGORY_LABELING: 'categoryLabeling',
  CATEGORIES: 'categories',
  RISK: 'risk',
  EXCLUDE: 'exclude',
  LABELS: 'labels',
  RUNTIME: 'runtime',
} as const;

const LANGUAGE_FIELD = KNOWN_FIELD_NAMES.LANGUAGE;
const SUMMARY_FIELD = KNOWN_FIELD_NAMES.SUMMARY;
const SIZE_FIELD = KNOWN_FIELD_NAMES.SIZE;
const COMPLEXITY_FIELD = KNOWN_FIELD_NAMES.COMPLEXITY;
const CATEGORIES_FIELD = KNOWN_FIELD_NAMES.CATEGORIES;
const RISK_FIELD = KNOWN_FIELD_NAMES.RISK;

type ThresholdKey<T extends Record<string, number>> = keyof T & string;

interface ThresholdKeySpec<T extends Record<string, number>> {
  key: ThresholdKey<T>;
  path: string;
}

interface ThresholdComparisonSpec<T extends Record<string, number>> {
  smaller: ThresholdKey<T>;
  larger: ThresholdKey<T>;
  errorField: string;
  createMessage: (params: { smallerValue: number; largerValue: number }) => string;
}

function validateThresholdGroup<T extends Record<string, number>>(
  thresholdsRaw: unknown,
  options: {
    fieldLabel: string;
    keys: ThresholdKeySpec<T>[];
    defaults: T;
    comparisons: ThresholdComparisonSpec<T>[];
  },
): Result<T, ConfigurationError> {
  if (!isRecord(thresholdsRaw)) {
    return err(
      createConfigurationError(options.fieldLabel, thresholdsRaw, `${options.fieldLabel} must be an object`),
    );
  }

  const providedValues: Partial<Record<ThresholdKey<T>, number>> = {};

  for (const keySpec of options.keys) {
    const rawValue = thresholdsRaw[keySpec.key];
    if (rawValue === undefined) {
      continue;
    }

    const validated = validateNumericThreshold(rawValue, keySpec.path, 0, Number.MAX_SAFE_INTEGER, {
      integerOnly: true,
    });
    if (validated.isErr()) {
      return err(validated.error);
    }

    providedValues[keySpec.key] = validated.value;
  }

  const finalValues = {} as Record<ThresholdKey<T>, number>;
  for (const keySpec of options.keys) {
    finalValues[keySpec.key] = providedValues[keySpec.key] ?? options.defaults[keySpec.key];
  }

  for (const comparison of options.comparisons) {
    const smallerValue = finalValues[comparison.smaller];
    const largerValue = finalValues[comparison.larger];

    if (smallerValue >= largerValue) {
      const context = {
        [comparison.smaller]: smallerValue,
        [comparison.larger]: largerValue,
      };
      return err(
        createConfigurationError(
          comparison.errorField,
          context,
          comparison.createMessage({ smallerValue, largerValue }),
        ),
      );
    }
  }

  return ok(finalValues as T);
}

export function parseLanguageField(
  rawLanguage: unknown,
): Result<LabelerConfig['language'] | undefined, ConfigurationError> {
  if (rawLanguage === undefined) {
    return ok(undefined);
  }

  if (!isString(rawLanguage)) {
    return err(createConfigurationError(LANGUAGE_FIELD, rawLanguage, 'language must be a string'));
  }

  const lang = rawLanguage.toLowerCase();
  const isEn = /^en(?:[-_].+)?$/.test(lang);
  const isJa = /^ja(?:[-_].+)?$/.test(lang);

  if (!isEn && !isJa) {
    return err(
      createConfigurationError(
        LANGUAGE_FIELD,
        rawLanguage,
        "language must start with 'en' or 'ja' (e.g., 'en', 'en-US', 'ja', 'ja-JP')",
      ),
    );
  }

  return ok(rawLanguage);
}

export function parseSummaryField(
  rawSummary: unknown,
): Result<LabelerConfig['summary'] | undefined, ConfigurationError> {
  if (rawSummary === undefined) {
    return ok(undefined);
  }

  if (!isRecord(rawSummary)) {
    return err(createConfigurationError(SUMMARY_FIELD, rawSummary, 'summary must be an object'));
  }

  const title = rawSummary['title'];
  if (title === undefined) {
    return ok(undefined);
  }

  if (!isString(title)) {
    return err(createConfigurationError('summary.title', title, 'summary.title must be a string'));
  }

  return ok({ title });
}

export function parseSizeField(rawSize: unknown): Result<LabelerConfig['size'] | undefined, ConfigurationError> {
  if (rawSize === undefined) {
    return ok(undefined);
  }

  if (!isRecord(rawSize)) {
    return err(createConfigurationError(SIZE_FIELD, rawSize, 'size must be an object'));
  }

  const thresholdsRaw = rawSize['thresholds'];
  if (thresholdsRaw !== undefined) {
    const validation = validateThresholdGroup(thresholdsRaw, {
      fieldLabel: 'size.thresholds',
      keys: [
        { key: 'small', path: 'size.thresholds.small' },
        { key: 'medium', path: 'size.thresholds.medium' },
        { key: 'large', path: 'size.thresholds.large' },
        { key: 'xlarge', path: 'size.thresholds.xlarge' },
      ],
      defaults: DEFAULT_LABELER_CONFIG.size.thresholds,
      comparisons: [
        {
          smaller: 'small',
          larger: 'medium',
          errorField: 'size.thresholds',
          createMessage: ({ smallerValue, largerValue }) =>
            `size.thresholds.small (${smallerValue}) must be less than medium (${largerValue})`,
        },
        {
          smaller: 'medium',
          larger: 'large',
          errorField: 'size.thresholds',
          createMessage: ({ smallerValue, largerValue }) =>
            `size.thresholds.medium (${smallerValue}) must be less than large (${largerValue})`,
        },
        {
          smaller: 'large',
          larger: 'xlarge',
          errorField: 'size.thresholds',
          createMessage: ({ smallerValue, largerValue }) =>
            `size.thresholds.large (${smallerValue}) must be less than xlarge (${largerValue})`,
        },
      ],
    });

    if (validation.isErr()) {
      return err(validation.error);
    }
  }

  return ok(rawSize as unknown as LabelerConfig['size']);
}

export function parseComplexityField(
  rawComplexity: unknown,
): Result<LabelerConfig['complexity'] | undefined, ConfigurationError> {
  if (rawComplexity === undefined) {
    return ok(undefined);
  }

  if (!isRecord(rawComplexity)) {
    return err(createConfigurationError(COMPLEXITY_FIELD, rawComplexity, 'complexity must be an object'));
  }

  const thresholdsRaw = rawComplexity['thresholds'];
  if (thresholdsRaw !== undefined) {
    const validation = validateThresholdGroup(thresholdsRaw, {
      fieldLabel: 'complexity.thresholds',
      keys: [
        { key: 'medium', path: 'complexity.thresholds.medium' },
        { key: 'high', path: 'complexity.thresholds.high' },
      ],
      defaults: DEFAULT_LABELER_CONFIG.complexity.thresholds,
      comparisons: [
        {
          smaller: 'medium',
          larger: 'high',
          errorField: 'complexity.thresholds',
          createMessage: ({ smallerValue, largerValue }) =>
            `complexity.thresholds.medium (${smallerValue}) must be less than high (${largerValue})`,
        },
      ],
    });

    if (validation.isErr()) {
      return err(validation.error);
    }
  }

  return ok(rawComplexity as unknown as LabelerConfig['complexity']);
}

export function parseCategoriesField(
  rawCategories: unknown,
): Result<LabelerConfig['categories'] | undefined, ConfigurationError> {
  if (rawCategories === undefined) {
    return ok(undefined);
  }

  if (!Array.isArray(rawCategories)) {
    return err(createConfigurationError(CATEGORIES_FIELD, rawCategories, 'categories must be an array'));
  }

  try {
    const normalizedCategories = rawCategories.map((category, index) => {
      if (!isRecord(category)) {
        throw createConfigurationError(`categories[${index}]`, category, 'Category config must be an object');
      }

      const label = category['label'];
      const patterns = category['patterns'];
      const displayName = category['display_name'];

      if (!isString(label)) {
        throw createConfigurationError(`categories[${index}].label`, label, 'Category label must be a string');
      }

      if (!Array.isArray(patterns)) {
        throw createConfigurationError(`categories[${index}].patterns`, patterns, 'Category patterns must be an array');
      }

      const validatedPatterns: string[] = [];
      for (let j = 0; j < patterns.length; j++) {
        const pattern = patterns[j];
        if (!isString(pattern)) {
          throw createConfigurationError(`categories[${index}].patterns[${j}]`, pattern, 'Pattern must be a string');
        }

        const patternValidation = validateMinimatchPattern(pattern);
        if (patternValidation.isErr()) {
          const { reason, details } = patternValidation.error;
          throw createConfigurationError(
            `categories[${index}].patterns[${j}]`,
            pattern,
            `Invalid minimatch pattern: ${reason}${details ? ` - ${details}` : ''}`,
          );
        }

        validatedPatterns.push(patternValidation.value);
      }

      const normalizedCategory: LabelerConfig['categories'][number] = {
        label,
        patterns: validatedPatterns,
      };

      if (displayName !== undefined) {
        if (!isRecord(displayName)) {
          throw createConfigurationError(
            `categories[${index}].display_name`,
            displayName,
            'display_name must be an object',
          );
        }

        const en = displayName['en'];
        const ja = displayName['ja'];

        if (!isString(en)) {
          throw createConfigurationError(
            `categories[${index}].display_name.en`,
            en,
            'display_name.en must be a string',
          );
        }

        if (!isString(ja)) {
          throw createConfigurationError(
            `categories[${index}].display_name.ja`,
            ja,
            'display_name.ja must be a string',
          );
        }

        normalizedCategory.display_name = { en, ja };
      }

      if ('exclude' in category) {
        const exclude = category['exclude'];
        if (exclude !== undefined) {
          if (!isStringArray(exclude)) {
            throw createConfigurationError(
              `categories[${index}].exclude`,
              exclude,
              'categories.exclude must be an array of strings',
            );
          }
          normalizedCategory.exclude = [...exclude];
        }
      }

      return normalizedCategory;
    });

    return ok(normalizedCategories);
  } catch (error) {
    if (isConfigurationError(error)) {
      return err(error);
    }
    return err(createConfigurationError('categories', error, 'Unexpected error during category validation'));
  }
}

export function parseRiskField(rawRisk: unknown): Result<LabelerConfig['risk'] | undefined, ConfigurationError> {
  if (rawRisk === undefined) {
    return ok(undefined);
  }

  if (!isRecord(rawRisk)) {
    return err(createConfigurationError(RISK_FIELD, rawRisk, 'risk must be an object'));
  }

  const useCiStatus = rawRisk['use_ci_status'];
  if (useCiStatus !== undefined && !isBoolean(useCiStatus)) {
    return err(createConfigurationError('risk.use_ci_status', useCiStatus, 'risk.use_ci_status must be a boolean'));
  }

  return ok(rawRisk as unknown as LabelerConfig['risk']);
}

export function getOptionalField<T>(source: Record<string, unknown>, fieldName: string): T | undefined {
  if (!(fieldName in source)) {
    return undefined;
  }

  const value = source[fieldName];
  return value === undefined ? undefined : (value as T);
}

export function assignIfDefined<K extends keyof LabelerConfig>(
  target: Partial<LabelerConfig>,
  key: K,
  value: LabelerConfig[K] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}
