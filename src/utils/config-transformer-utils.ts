import { err, ok, type Result } from 'neverthrow';

import { type ConfigurationError, createConfigurationError } from '../errors/index.js';

export function validateObjectInput(
  config: unknown,
  fieldPath: string,
): Result<Record<string, unknown>, ConfigurationError> {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return err(createConfigurationError(fieldPath, config, 'Configuration must be an object'));
  }
  return ok(config as Record<string, unknown>);
}

export function validateNumericThreshold(
  value: unknown,
  fieldPath: string,
  min: number,
  max: number,
  options?: {
    integerOnly?: boolean;
  },
): Result<number, ConfigurationError> {
  if (typeof value !== 'number') {
    return err(createConfigurationError(fieldPath, value, 'Must be a number'));
  }

  if (options?.integerOnly && !Number.isInteger(value)) {
    return err(createConfigurationError(fieldPath, value, 'Must be an integer'));
  }

  if (value < min || value > max) {
    return err(createConfigurationError(fieldPath, value, `Must be between ${min} and ${max}, but got ${value}`));
  }

  return ok(value);
}

export function collectUnknownKeys(source: Record<string, unknown>, knownKeys: readonly string[]): string[] {
  const unknownKeys = Object.keys(source).filter(key => !knownKeys.includes(key));
  if (unknownKeys.length > 0) {
    return [`Unknown configuration keys will be ignored: ${unknownKeys.join(', ')}`];
  }
  return [];
}
