import { err, ok, type Result } from 'neverthrow';

import { type ConfigurationError } from '../../errors/index.js';
import type { LabelerConfig } from '../../labeler-types.js';
import { collectUnknownKeys, validateObjectInput } from '../../utils/config-transformer-utils.js';
import {
  assignIfDefined,
  getOptionalField,
  KNOWN_FIELD_NAMES,
  parseCategoriesField,
  parseComplexityField,
  parseLanguageField,
  parseRiskField,
  parseSizeField,
  parseSummaryField,
} from './labeler-config-parsers.js';

const KNOWN_KEYS = Object.values(KNOWN_FIELD_NAMES);

export interface LabelerConfigTransformResult {
  config: Partial<LabelerConfig>;
  warnings: string[];
}

export function parseLabelerConfig(config: unknown): Result<LabelerConfigTransformResult, ConfigurationError> {
  const objectValidation = validateObjectInput(config, 'root');
  if (objectValidation.isErr()) {
    return err(objectValidation.error);
  }

  const source = objectValidation.value;
  const normalized: Partial<LabelerConfig> = {};
  const warnings: string[] = [];

  const languageResult = parseLanguageField(source[KNOWN_FIELD_NAMES.LANGUAGE]);
  if (languageResult.isErr()) {
    return err(languageResult.error);
  }
  assignIfDefined(normalized, 'language', languageResult.value);

  const summaryResult = parseSummaryField(source[KNOWN_FIELD_NAMES.SUMMARY]);
  if (summaryResult.isErr()) {
    return err(summaryResult.error);
  }
  assignIfDefined(normalized, 'summary', summaryResult.value);

  const sizeResult = parseSizeField(source[KNOWN_FIELD_NAMES.SIZE]);
  if (sizeResult.isErr()) {
    return err(sizeResult.error);
  }
  assignIfDefined(normalized, 'size', sizeResult.value);

  const complexityResult = parseComplexityField(source[KNOWN_FIELD_NAMES.COMPLEXITY]);
  if (complexityResult.isErr()) {
    return err(complexityResult.error);
  }
  assignIfDefined(normalized, 'complexity', complexityResult.value);

  const categoriesResult = parseCategoriesField(source[KNOWN_FIELD_NAMES.CATEGORIES]);
  if (categoriesResult.isErr()) {
    return err(categoriesResult.error);
  }
  assignIfDefined(normalized, 'categories', categoriesResult.value);

  const riskResult = parseRiskField(source[KNOWN_FIELD_NAMES.RISK]);
  if (riskResult.isErr()) {
    return err(riskResult.error);
  }
  assignIfDefined(normalized, 'risk', riskResult.value);

  assignIfDefined(
    normalized,
    'categoryLabeling',
    getOptionalField<LabelerConfig['categoryLabeling']>(source, KNOWN_FIELD_NAMES.CATEGORY_LABELING),
  );
  assignIfDefined(normalized, 'exclude', getOptionalField<LabelerConfig['exclude']>(source, KNOWN_FIELD_NAMES.EXCLUDE));
  assignIfDefined(normalized, 'labels', getOptionalField<LabelerConfig['labels']>(source, KNOWN_FIELD_NAMES.LABELS));
  assignIfDefined(normalized, 'runtime', getOptionalField<LabelerConfig['runtime']>(source, KNOWN_FIELD_NAMES.RUNTIME));

  const unknownKeyWarnings = collectUnknownKeys(source, KNOWN_KEYS);
  warnings.push(...unknownKeyWarnings);

  return ok({ config: normalized, warnings });
}
