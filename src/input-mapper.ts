import { err, ok, type Result } from 'neverthrow';

import type { ActionInputs } from './actions-io';
import type { ConfigurationError, ParseError } from './errors/index.js';
import { normalizeActionInputStrings, type NormalizedActionInputs } from './input/input-normalizer.js';

export type { SizeThresholds } from './input/input-normalizer.js';

export interface Config extends NormalizedActionInputs {
  githubToken: string;
  language?: string;
}

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
