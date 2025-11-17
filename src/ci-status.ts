/**
 * CI Status Detection Module
 * Fetches and analyzes CI check results from GitHub Actions
 */

import type { getOctokit } from '@actions/github';
import { ResultAsync } from 'neverthrow';

import type { AppError } from './errors/index.js';
import { createGitHubAPIError, ensureError, extractErrorStatus } from './errors/index.js';
import type { CICheckStatus, CIStatus } from './types';
import { hasProperty, isNonEmptyString, isObject } from './utils/type-guards.js';

type Octokit = ReturnType<typeof getOctokit>;

/**
 * Represents a GitHub check run object
 */
interface CheckRun {
  name: string;
  conclusion: string | null;
}

/**
 * Type guard to check if a value is a valid CheckRun
 */
function isValidCheckRun(run: unknown): run is CheckRun {
  return isObject(run) && hasProperty(run, 'name') && isNonEmptyString(run.name);
}

/**
 * Maps check run conclusion to CICheckStatus
 */
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

/**
 * Determines the status of a specific check type from check runs
 */
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

  // If any check failed, return failed
  if (statuses.some(s => s === 'failed')) {
    return 'failed';
  }

  // If all passed, return passed
  if (statuses.every(s => s === 'passed')) {
    return 'passed';
  }

  // If any pending, return pending
  if (statuses.some(s => s === 'pending')) {
    return 'pending';
  }

  return 'unknown';
}

/**
 * Fetches CI status from GitHub API
 * @param octokit - GitHub API client
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param headSha - Commit SHA to check
 * @returns CI status or null if unavailable
 */
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
        response => response.data.check_runs,
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

/**
 * Checks if all CI checks passed
 */
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

/**
 * Checks if any CI check failed
 */
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
