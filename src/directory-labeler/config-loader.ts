import fs from 'node:fs';

import { load as yamlLoad } from 'js-yaml';
import { err, ok, type Result, type ResultAsync } from 'neverthrow';

import { fetchRepositoryConfig, isConfigNotFoundError } from '../config/loaders/github-config-fetcher.js';
import { createConfigurationError, createFileSystemError, ensureError } from '../errors/index.js';
import { validateConfigWithTransformer } from '../utils/config-validation-utils.js';
import { parseDirectoryLabelerConfig } from './transformers/config-transformer.js';
import {
  DEFAULT_NAMESPACES,
  DEFAULT_OPTIONS,
  type DirectoryLabelerConfig,
  type MinimatchOptions,
  type NamespacePolicy,
} from './types.js';

export type LoadConfigError = ReturnType<typeof createFileSystemError> | ReturnType<typeof createConfigurationError>;

export interface LoadRepositoryConfigParams {
  token: string;
  owner: string;
  repo: string;
  configPath: string;
  ref?: string;
}

export function loadDirectoryLabelerConfig(configPath: string): Result<DirectoryLabelerConfig, LoadConfigError> {
  if (!fs.existsSync(configPath)) {
    return err(createFileSystemError(configPath, 'notFound'));
  }

  let fileContent: string;
  try {
    fileContent = fs.readFileSync(configPath, 'utf-8');
  } catch {
    return err(createFileSystemError(configPath, 'read'));
  }

  return parseDirectoryLabelerConfigContent(fileContent);
}

export function loadDirectoryLabelerConfigFromRepository(
  params: LoadRepositoryConfigParams,
): ResultAsync<DirectoryLabelerConfig, LoadConfigError> {
  const { configPath } = params;

  return fetchRepositoryConfig({
    token: params.token,
    owner: params.owner,
    repo: params.repo,
    path: configPath,
    ...(params.ref ? { ref: params.ref } : {}),
  })
    .mapErr((error): LoadConfigError =>
      isConfigNotFoundError(error) ? createFileSystemError(configPath, 'notFound') : error,
    )
    .andThen(content => parseDirectoryLabelerConfigContent(content));
}

export function parseDirectoryLabelerConfigContent(
  fileContent: string,
): Result<DirectoryLabelerConfig, ReturnType<typeof createConfigurationError>> {
  let rawConfig: unknown;
  try {
    // 安全モード: DEFAULT_SCHEMAでYAMLアンカー/エイリアス、マージキーをサポート、任意コード実行は防止
    rawConfig = yamlLoad(fileContent);
  } catch (error) {
    const message = ensureError(error).message;
    return err(createConfigurationError('yaml', fileContent, `YAML parse error: ${message}`));
  }

  const validationResult = validateDirectoryLabelerConfig(rawConfig);
  if (validationResult.isErr()) {
    return validationResult;
  }

  return ok(applyDefaults(validationResult.value));
}

export function validateDirectoryLabelerConfig(
  config: unknown,
): Result<DirectoryLabelerConfig, ReturnType<typeof createConfigurationError>> {
  return validateConfigWithTransformer(config, parseDirectoryLabelerConfig);
}

function applyDefaults(config: DirectoryLabelerConfig): DirectoryLabelerConfig {
  const options: Required<MinimatchOptions> = {
    ...DEFAULT_OPTIONS,
    ...(config.options || {}),
  };

  const namespaces: Required<NamespacePolicy> = {
    ...DEFAULT_NAMESPACES,
    ...(config.namespaces || {}),
  };

  return {
    ...config,
    options,
    namespaces,
    useDefaultExcludes: config.useDefaultExcludes !== false,
  };
}
