import * as core from '@actions/core';
import { err, errAsync, ok, okAsync, type Result, type ResultAsync } from 'neverthrow';

function handleTransformerResult<TConfig, TError>(
  transformResult: Result<{ config: TConfig; warnings: string[] }, TError>,
): Result<TConfig, TError> {
  if (transformResult.isErr()) {
    return err(transformResult.error);
  }

  const { config: validatedConfig, warnings } = transformResult.value;
  warnings.forEach(message => core.warning(message));
  return ok(validatedConfig);
}

export function validateConfigWithTransformer<TConfig, TError>(
  config: unknown,
  transformer: (config: unknown) => Result<{ config: TConfig; warnings: string[] }, TError>,
): Result<TConfig, TError> {
  return handleTransformerResult(transformer(config));
}

export function validateConfigWithTransformerAsync<TConfig, TError>(
  config: unknown,
  transformer: (config: unknown) => Result<{ config: TConfig; warnings: string[] }, TError>,
): ResultAsync<TConfig, TError> {
  const processed = handleTransformerResult(transformer(config));
  if (processed.isErr()) {
    return errAsync(processed.error);
  }

  return okAsync(processed.value);
}
