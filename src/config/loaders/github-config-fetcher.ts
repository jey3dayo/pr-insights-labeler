import * as core from '@actions/core';
import * as github from '@actions/github';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';

import {
  type ConfigurationError,
  createConfigurationError,
  ensureError,
  extractErrorStatus,
} from '../../errors/index.js';

export const CONFIG_FILE_PATH = '.github/pr-labeler.yml';
export const MAX_CONFIG_SIZE = 1024 * 1024; // 1MB

/**
 * `value` marker set on the error produced when the file does not exist in the repository.
 * Callers map "missing" to their own not-found semantics, so it must stay a stable contract
 * rather than be re-derived from the error message.
 */
export const CONFIG_NOT_FOUND = 'not found';

export interface FetchRepositoryConfigParams {
  token: string;
  owner: string;
  repo: string;
  /** Omit to read from the repository default branch */
  ref?: string;
  /** Repository-relative path of the configuration file. Defaults to `.github/pr-labeler.yml`. */
  path?: string;
}

/**
 * Whether the fetch failed because the configuration file does not exist in the repository.
 */
export function isConfigNotFoundError(error: ConfigurationError): boolean {
  return error.value === CONFIG_NOT_FOUND;
}

/**
 * Fetch configuration file content from GitHub repository
 */
export function fetchRepositoryConfig(params: FetchRepositoryConfigParams): ResultAsync<string, ConfigurationError> {
  const { token, owner, repo, ref, path = CONFIG_FILE_PATH } = params;
  const octokit = github.getOctokit(token);

  return ResultAsync.fromPromise(
    octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      // An empty ref would be serialized as `?ref=`, so omit it entirely to let
      // the API resolve the repository default branch.
      ...(ref ? { ref } : {}),
    }),
    error => {
      const status = extractErrorStatus(error);
      if (status === 404) {
        core.info(`Configuration file ${path} not found, using defaults`);
        return createConfigurationError(path, CONFIG_NOT_FOUND, 'Configuration file not found');
      }
      return createConfigurationError(path, error, `Failed to fetch configuration file: ${ensureError(error).message}`);
    },
  ).andThen(response => {
    if (!('content' in response.data)) {
      return errAsync(createConfigurationError(path, response.data, 'Response does not contain file content'));
    }

    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    const byteLen = Buffer.byteLength(content, 'utf-8');

    if (byteLen > MAX_CONFIG_SIZE) {
      core.warning(`Configuration file exceeds size limit (${byteLen} > ${MAX_CONFIG_SIZE} bytes), using defaults`);
      return errAsync(createConfigurationError(path, byteLen, 'Configuration file too large'));
    }

    return okAsync(content);
  });
}
