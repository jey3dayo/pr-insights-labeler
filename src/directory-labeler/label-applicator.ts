import * as core from '@actions/core';
import * as github from '@actions/github';
import { err, ok, type Result } from 'neverthrow';

import { DEFAULT_LABEL_COLOR, DEFAULT_LABEL_DESCRIPTION } from '../configs/directory-labeler-defaults.js';
import {
  createGitHubAPIError,
  createPermissionError,
  createRateLimitError,
  ensureError,
  extractErrorStatus,
} from '../errors/index.js';
import { extractNamespace } from '../utils/namespace-utils.js';
import { isNumber, isRecord, isString } from '../utils/type-guards.js';
import type { LabelDecision } from './decision-engine.js';
import type { NamespacePolicy } from './types.js';

type Octokit = ReturnType<typeof github.getOctokit>;

export interface PullRequestContext {
  repo: {
    owner: string;
    repo: string;
  };
  issue: {
    number: number;
  };
}

export interface ApplyResult {
  applied: string[];
  skipped: string[];
  removed?: string[];
  failed: Array<{ label: string; reason: string }>;
}

interface OctokitErrorResponse {
  response?: {
    headers?: Record<string, unknown>;
  };
}

type LabelApplicatorError =
  | ReturnType<typeof createGitHubAPIError>
  | ReturnType<typeof createPermissionError>
  | ReturnType<typeof createRateLimitError>;

async function fetchExistingLabels(
  octokit: Octokit,
  context: PullRequestContext,
): Promise<Result<string[], LabelApplicatorError>> {
  try {
    const { data } = await octokit.rest.issues.listLabelsOnIssue({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
    });
    return ok(data.map(label => label.name));
  } catch (error) {
    const e = ensureError(error);
    const status = extractErrorStatus(error);

    if (status === 403) {
      return err(createPermissionError('issues: read', `Failed to list labels: ${e.message}`));
    }

    if (status === 429) {
      const errorWithResponse = error as OctokitErrorResponse;
      const rawHeaders = errorWithResponse.response?.headers;
      const headers = isRecord(rawHeaders) ? rawHeaders : {};
      const retryAfterHeader = headers['retry-after'] ?? headers['Retry-After'];
      const retryAfter = isString(retryAfterHeader)
        ? Number.parseInt(retryAfterHeader, 10)
        : isNumber(retryAfterHeader)
          ? retryAfterHeader
          : undefined;
      return err(createRateLimitError(Number.isFinite(retryAfter) ? (retryAfter as number) : undefined));
    }

    return err(createGitHubAPIError(`Failed to list labels: ${e.message}`, status));
  }
}

function calculateNamespaceRemovals(
  existingLabels: string[],
  newLabels: string[],
  namespaces: Required<NamespacePolicy>,
): Set<string> {
  const labelsToRemove = new Set<string>();
  for (const newLabel of newLabels) {
    const namespace = extractNamespace(newLabel, ':');
    if (namespace && namespaces.exclusive.includes(namespace)) {
      for (const existingLabel of existingLabels) {
        const existingNamespace = extractNamespace(existingLabel, ':');
        if (existingNamespace === namespace && existingLabel !== newLabel) {
          labelsToRemove.add(existingLabel);
        }
      }
    }
  }
  return labelsToRemove;
}

export async function applyDirectoryLabels(
  octokit: Octokit,
  context: PullRequestContext,
  decisions: LabelDecision[],
  namespaces: Required<NamespacePolicy>,
): Promise<Result<ApplyResult, LabelApplicatorError>> {
  const result: ApplyResult = {
    applied: [],
    skipped: [],
    removed: [],
    failed: [],
  };

  if (decisions.length === 0) {
    core.debug('No label decisions to apply.');
    return ok(result);
  }

  const existingLabelsResult = await fetchExistingLabels(octokit, context);
  if (existingLabelsResult.isErr()) {
    return err(existingLabelsResult.error);
  }
  const existingLabels = existingLabelsResult.value;
  core.debug(`Existing labels: ${existingLabels.join(', ')}`);

  const newLabels = decisions.map(d => d.label);
  const labelsToRemove = calculateNamespaceRemovals(existingLabels, newLabels, namespaces);

  for (const label of labelsToRemove) {
    try {
      await octokit.rest.issues.removeLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        name: label,
      });
      result.removed?.push(label);
      core.info(`Removed label: ${label}`);
    } catch (error) {
      const e = ensureError(error);
      core.warning(`Failed to remove label "${label}": ${e.message}`);
      result.failed.push({ label, reason: `Failed to remove: ${e.message}` });
    }
  }

  const labelsToAdd = newLabels.filter(label => !existingLabels.includes(label));

  for (const label of newLabels) {
    if (existingLabels.includes(label)) {
      result.skipped.push(label);
      core.debug(`Skipped label (already exists): ${label}`);
    }
  }

  if (labelsToAdd.length > 0) {
    try {
      await octokit.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        labels: labelsToAdd,
      });
      result.applied.push(...labelsToAdd);
      core.info(`Applied labels: ${labelsToAdd.join(', ')}`);
    } catch (error) {
      const e = ensureError(error);
      const status = extractErrorStatus(error);

      if (status === 422) {
        core.info('Some labels do not exist. Attempting to create them...');
        await createMissingLabels(octokit, context, labelsToAdd, result);
      } else {
        for (const label of labelsToAdd) {
          result.failed.push({ label, reason: e.message });
        }
        core.error(`Failed to add labels: ${e.message}`);
      }
    }
  }

  core.debug(
    `Applied: ${result.applied.length}, Skipped: ${result.skipped.length}, Removed: ${result.removed?.length ?? 0}, Failed: ${result.failed.length}`,
  );
  return ok(result);
}

async function createMissingLabels(
  octokit: Octokit,
  context: PullRequestContext,
  labels: string[],
  result: ApplyResult,
): Promise<void> {
  for (const label of labels) {
    const initialAddResult = await tryAddLabel(octokit, context, label, result);
    if (initialAddResult.success || initialAddResult.status !== 422) {
      if (!initialAddResult.success && initialAddResult.error) {
        result.failed.push({ label, reason: `Failed to add: ${initialAddResult.error.message}` });
        core.warning(`Failed to add label "${label}": ${initialAddResult.error.message}`);
      }
      continue;
    }

    try {
      await octokit.rest.issues.createLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: label,
        color: DEFAULT_LABEL_COLOR,
        description: DEFAULT_LABEL_DESCRIPTION,
      });
      core.info(`Created label: ${label}`);
    } catch (error) {
      const status = extractErrorStatus(error);
      const e = ensureError(error);
      if (status !== 422) {
        result.failed.push({ label, reason: `Failed to create: ${e.message}` });
        core.warning(`Failed to create label "${label}": ${e.message}`);
        continue;
      }
    }

    const applyAfterCreate = await tryAddLabel(octokit, context, label, result);
    if (!applyAfterCreate.success && applyAfterCreate.error) {
      result.failed.push({ label, reason: `Failed to apply after create: ${applyAfterCreate.error.message}` });
      core.warning(`Failed to apply label "${label}" after create: ${applyAfterCreate.error.message}`);
    }
  }
}

async function tryAddLabel(
  octokit: Octokit,
  context: PullRequestContext,
  label: string,
  result: ApplyResult,
): Promise<{ success: true } | { success: false; status?: number; error?: Error }> {
  try {
    await octokit.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
      labels: [label],
    });
    result.applied.push(label);
    core.info(`Applied label: ${label}`);
    return { success: true };
  } catch (error) {
    const status = extractErrorStatus(error);
    const payload: { success: false; status?: number; error: Error } = { success: false, error: ensureError(error) };
    if (status !== undefined) {
      payload.status = status;
    }
    return payload;
  }
}
