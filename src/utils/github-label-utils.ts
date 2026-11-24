import * as github from '@actions/github';
import { Result, ResultAsync } from 'neverthrow';

import { createGitHubAPIError, ensureError, extractErrorStatus, GitHubAPIError } from '../errors/index.js';
import type { PRContext } from '../types.js';

export function fetchCurrentLabels(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
): ResultAsync<string[], GitHubAPIError> {
  const octokit = github.getOctokit(token);

  return ResultAsync.fromPromise(
    octokit.rest.issues.listLabelsOnIssue({
      owner,
      repo,
      issue_number: pullNumber,
    }),
    (error): GitHubAPIError => {
      return createGitHubAPIError(`Failed to get labels: ${ensureError(error).message}`, extractErrorStatus(error));
    },
  ).map(response => response.data.map(label => label.name));
}

export async function getCurrentLabels(token: string, context: PRContext): Promise<Result<string[], GitHubAPIError>> {
  const resultAsync = fetchCurrentLabels(token, context.owner, context.repo, context.pullNumber);
  return resultAsync;
}
