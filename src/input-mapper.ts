/**
 * Input mapper - converts action inputs to internal config
 */

import { err, ok, type Result } from 'neverthrow';

import type { ActionInputs } from './actions-io';
import type { ConfigurationError, ParseError } from './errors/index.js';
import { normalizeActionInputStrings, type NormalizedActionInputs } from './input/input-normalizer.js';

export type { SizeThresholds, SizeThresholdsV2 } from './input/input-normalizer.js';
export {
  parseBoolean,
  parseBooleanStrict,
  parseCommentMode,
  parseComplexityThresholdsV2,
  parseExcludePatterns,
  parseSizeThresholds,
  parseSizeThresholdsV2,
} from './input/input-normalizer.js';

/**
 * Internal configuration (camelCase, parsed)
 */
export interface Config extends NormalizedActionInputs {
  githubToken: string;
  // i18n Support
  language?: string; // Language code (e.g., 'en', 'ja', 'en-US', 'ja-JP')
}

/**
 * Map action input strings to internal config
 */
export function mapActionInputsToConfig(inputs: ActionInputs): Result<Config, ConfigurationError | ParseError> {
  const normalizedResult = normalizeActionInputStrings(inputs);
  if (normalizedResult.isErr()) {
    return err(normalizedResult.error);
  }

  const normalized = normalizedResult.value;

  return ok({
    ...normalized,
    githubToken: inputs.github_token,
    language: inputs.language,
  });
}
