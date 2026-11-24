import * as core from '@actions/core';
import * as yaml from 'js-yaml';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';

import { type ConfigurationError, createConfigurationError, ensureError } from '../../errors/index.js';
import { CONFIG_FILE_PATH } from './github-config-fetcher.js';

export function parseYamlContent(content: string): ResultAsync<unknown, ConfigurationError> {
  try {
    const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA }) as unknown;

    if (parsed === null || parsed === undefined) {
      core.warning('Configuration file is empty, using defaults');
      return errAsync(createConfigurationError(CONFIG_FILE_PATH, parsed, 'Configuration file is empty'));
    }

    return okAsync(parsed);
  } catch (error) {
    const err = ensureError(error);
    core.warning(`Failed to parse YAML configuration: ${err.message}, using defaults`);
    return errAsync(createConfigurationError(CONFIG_FILE_PATH, content, `YAML parse error: ${err.message}`));
  }
}
