import * as core from '@actions/core';
import * as github from '@actions/github';
import { ResultAsync } from 'neverthrow';

import { AUTO_LABEL_PREFIX } from './configs/label-defaults.js';
import { createGitHubAPIError, ensureError, extractErrorStatus, GitHubAPIError } from './errors/index.js';
import type { LabelDecisions, LabelPolicyConfig, LabelUpdate } from './labeler-types.js';
import type { PRContext } from './types.js';
import { extractNamespace, matchesNamespacePattern } from './utils/namespace-utils.js';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

export function applyLabels(
  token: string,
  context: PRContext,
  decisions: LabelDecisions,
  config: LabelPolicyConfig,
  managedLabels?: readonly string[],
): ResultAsync<LabelUpdate, GitHubAPIError> {
  const octokit = github.getOctokit(token);

  return getCurrentLabels(octokit, context).andThen(currentLabels => {
    const diff = calculateLabelDiff(decisions, currentLabels, config.namespace_policies, managedLabels);

    core.info(`Label diff: +${diff.toAdd.length} labels, -${diff.toRemove.length} labels`);

    const apiCalls = 1;

    return applyLabelChanges(octokit, context, diff, config.create_missing).map(result => ({
      added: result.added,
      removed: result.removed,
      skipped: result.skipped,
      apiCalls: apiCalls + result.apiCalls,
    }));
  });
}

export function getCurrentLabels(
  octokit: ReturnType<typeof github.getOctokit>,
  context: PRContext,
): ResultAsync<string[], GitHubAPIError> {
  return ResultAsync.fromPromise(
    octokit.rest.issues.listLabelsOnIssue({
      owner: context.owner,
      repo: context.repo,
      issue_number: context.pullNumber,
    }),
    (error): GitHubAPIError => {
      return createGitHubAPIError(
        `Failed to get current labels: ${ensureError(error).message}`,
        extractErrorStatus(error),
      );
    },
  ).map(response => response.data.map(label => label.name));
}

type LabelDiff = { toAdd: string[]; toRemove: string[] };

function calculateLabelDiff(
  decisions: LabelDecisions,
  currentLabels: string[],
  policies: Record<string, 'replace' | 'additive'>,
  managedLabels: readonly string[] = [],
): LabelDiff {
  const toAdd: string[] = [];
  const toRemove: string[] = [];

  for (const label of decisions.labelsToAdd) {
    const namespace = extractNamespace(label);
    if (namespace) {
      for (const [policyPattern, policy] of Object.entries(policies)) {
        if (policy === 'replace' && matchesNamespacePattern(namespace, policyPattern)) {
          for (const currentLabel of currentLabels) {
            const currentNamespace = extractNamespace(currentLabel);
            if (currentNamespace && matchesNamespacePattern(currentNamespace, policyPattern)) {
              if (currentLabel !== label && !toRemove.includes(currentLabel)) {
                toRemove.push(currentLabel);
              }
            }
          }
        }
      }
    }

    if (!currentLabels.includes(label) && !toAdd.includes(label)) {
      toAdd.push(label);
    }
  }

  for (const currentLabel of currentLabels) {
    const isManaged = currentLabel.startsWith(AUTO_LABEL_PREFIX) || managedLabels.includes(currentLabel);
    if (isManaged && !decisions.labelsToAdd.includes(currentLabel)) {
      if (!toRemove.includes(currentLabel)) {
        toRemove.push(currentLabel);
      }
    }
  }

  return { toAdd, toRemove };
}

function applyLabelChanges(
  octokit: ReturnType<typeof github.getOctokit>,
  context: PRContext,
  diff: LabelDiff,
  _createMissing: boolean,
): ResultAsync<{ added: string[]; removed: string[]; skipped: string[]; apiCalls: number }, GitHubAPIError> {
  let apiCalls = 0;
  const added: string[] = [];
  const removed: string[] = [];
  const skipped: string[] = [];

  const addLabelsWithRetry = async (): Promise<void> => {
    if (diff.toAdd.length === 0) {
      return;
    }

    await retryWithBackoff(async () => {
      await octokit.rest.issues.addLabels({
        owner: context.owner,
        repo: context.repo,
        issue_number: context.pullNumber,
        labels: diff.toAdd,
      });
      apiCalls++;
      added.push(...diff.toAdd);
      core.info(`Added labels: ${diff.toAdd.join(', ')}`);
    });
  };

  const removeLabelsWithRetry = async (): Promise<void> => {
    for (const label of diff.toRemove) {
      await retryWithBackoff(async () => {
        try {
          await octokit.rest.issues.removeLabel({
            owner: context.owner,
            repo: context.repo,
            issue_number: context.pullNumber,
            name: label,
          });
          apiCalls++;
          removed.push(label);
          core.info(`Removed label: ${label}`);
        } catch (err) {
          const status = extractErrorStatus(err);
          if (status === 404) {
            core.info(`Label not present, skip remove: ${label}`);
            skipped.push(label);
            return;
          }
          throw err;
        }
      });
    }
  };

  return ResultAsync.fromPromise(
    (async () => {
      await removeLabelsWithRetry();

      await addLabelsWithRetry();

      return { added, removed, skipped, apiCalls };
    })(),
    (error): GitHubAPIError => {
      const status = extractErrorStatus(error);

      if (status === 403) {
        core.warning('Insufficient permissions to apply labels (fork PR or missing pull-requests: write permission)');
        skipped.push(...diff.toAdd, ...diff.toRemove);
        return createGitHubAPIError('Permission denied: cannot apply labels', 403);
      }

      return createGitHubAPIError(`Failed to apply labels: ${ensureError(error).message}`, status);
    },
  );
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = MAX_RETRIES): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const status = extractErrorStatus(error);
      const msg = ensureError(error).message ?? '';
      const isRateLimited = status === 429 || (status === 403 && /rate limit|abuse/i.test(msg));
      if (isRateLimited && i < maxRetries - 1) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, i);
        core.warning(`Rate limit hit, retrying in ${delay}ms (attempt ${i + 1}/${maxRetries})...`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
