import { ResultAsync } from 'neverthrow';

import { fetchRepositoryConfig, type FetchRepositoryConfigParams } from './config/loaders/github-config-fetcher.js';
import { mergeWithDefaults, validateLabelerConfig } from './config/loaders/labeler-config-validator.js';
import { parseYamlContent } from './config/loaders/yaml-config-parser.js';
import type { ConfigurationError } from './errors/index.js';
import type { LabelerConfig } from './labeler-types.js';
import { DEFAULT_LABELER_CONFIG } from './labeler-types.js';

export { mergeWithDefaults, validateLabelerConfig };

export function loadConfig(
  token: string,
  owner: string,
  repo: string,
  ref?: string,
): ResultAsync<LabelerConfig, ConfigurationError> {
  const params: FetchRepositoryConfigParams = { token, owner, repo, ...(ref ? { ref } : {}) };

  return fetchRepositoryConfig(params).andThen(content => parseYamlConfig(content));
}

export function parseYamlConfig(content: string): ResultAsync<LabelerConfig, ConfigurationError> {
  return parseYamlContent(content).andThen(validateLabelerConfig);
}

export function getDefaultLabelerConfig(): LabelerConfig {
  return JSON.parse(JSON.stringify(DEFAULT_LABELER_CONFIG));
}
