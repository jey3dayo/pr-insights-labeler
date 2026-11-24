import type { getOctokit } from '@actions/github';
import { ResultAsync } from 'neverthrow';

import type { AppError } from './errors/index.js';
import { createGitHubAPIError, ensureError, extractErrorStatus } from './errors/index.js';
import type { CICheckStatus, CIStatus } from './types';
import { hasProperty, isNonEmptyString, isObject } from './utils/type-guards.js';

type Octokit = ReturnType<typeof getOctokit>;

interface CheckRun {
  name: string;
  conclusion: string | null;
}

function isValidCheckRun(run: unknown): run is CheckRun {
  return isObject(run) && hasProperty(run, 'name') && isNonEmptyString(run.name);
}

function mapConclusion(conclusion: string | null): CICheckStatus {
  switch (conclusion) {
    case 'success':
      return 'passed';
    case 'failure':
    case 'timed_out':
    case 'action_required':
      return 'failed';
    case 'neutral':
    case 'cancelled':
    case 'skipped':
      return 'unknown';
    default:
      return 'pending';
  }
}

function determineCheckStatus(
  checkRuns: Array<{ name: string; conclusion: string | null }>,
  patterns: string[],
): CICheckStatus {
  const relevantChecks = checkRuns.filter(check =>
    patterns.some(pattern => check.name.toLowerCase().includes(pattern.toLowerCase())),
  );

  if (relevantChecks.length === 0) {
    return 'unknown';
  }

  const statuses = relevantChecks.map(check => mapConclusion(check.conclusion));

  if (statuses.some(s => s === 'failed')) {
    return 'failed';
  }

  if (statuses.every(s => s === 'passed')) {
    return 'passed';
  }

  if (statuses.some(s => s === 'pending')) {
    return 'pending';
  }

  return 'unknown';
}

export function getCIStatus(
  octokit: Octokit,
  owner: string,
  repo: string,
  headSha: string,
): ResultAsync<CIStatus | null, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const allCheckRuns = await octokit.paginate(
        octokit.rest.checks.listForRef,
        {
          owner,
          repo,
          ref: headSha,
          per_page: 100,
        },
        response => response.data,
      );

      const checkRuns: CheckRun[] = allCheckRuns.filter(isValidCheckRun).map(run => ({
        name: run.name,
        conclusion: run.conclusion,
      }));

      if (checkRuns.length === 0) {
        return null;
      }

      return {
        tests: determineCheckStatus(checkRuns, ['test', 'jest', 'vitest', 'mocha', 'integration']),
        typeCheck: determineCheckStatus(checkRuns, ['type', 'tsc', 'typescript', 'type-check']),
        build: determineCheckStatus(checkRuns, ['build', 'compile']),
        lint: determineCheckStatus(checkRuns, ['lint', 'eslint', 'prettier', 'format']),
      };
    })(),
    error => {
      const ensured = ensureError(error);
      return createGitHubAPIError(`Failed to fetch CI status: ${ensured.message}`, extractErrorStatus(error));
    },
  );
}

export function allCIPassed(ciStatus: CIStatus | null | undefined): boolean {
  if (!ciStatus) {
    return false;
  }

  return (
    ciStatus.tests === 'passed' &&
    ciStatus.typeCheck === 'passed' &&
    ciStatus.build === 'passed' &&
    ciStatus.lint === 'passed'
  );
}

export function anyCIFailed(ciStatus: CIStatus | null | undefined): boolean {
  if (!ciStatus) {
    return false;
  }

  return (
    ciStatus.tests === 'failed' ||
    ciStatus.typeCheck === 'failed' ||
    ciStatus.build === 'failed' ||
    ciStatus.lint === 'failed'
  );
}
