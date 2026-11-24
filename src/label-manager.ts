import * as github from '@actions/github';
import { err, ok, Result } from 'neverthrow';

import { logDebug, logInfo, logWarning } from './actions-io';
import { AUTO_LABEL_PREFIX, VIOLATION_LABELS } from './configs/label-defaults.js';
import type { ConfigurationError, GitHubAPIError, Violations } from './errors/index.js';
import { createConfigurationError, createGitHubAPIError, ensureError } from './errors/index.js';
import type { AnalysisResult } from './file-metrics';
import type { PRContext } from './types';
import { getCurrentLabels as fetchCurrentLabels } from './utils/github-label-utils.js';
import { calculateSizeLabel } from './utils/size-label-utils.js';

export interface LabelConfig {
  sizeLabelThresholds: {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  };
  applySizeLabels?: boolean;
  autoRemoveLabels?: boolean;
  largeFilesLabel?: string;
  tooManyFilesLabel?: string;
  tooManyLinesLabel?: string;
}

export interface LabelUpdate {
  added: string[];
  removed: string[];
  current: string[];
}

function validateSizeLabelThresholds(thresholds: LabelConfig['sizeLabelThresholds']): Result<void, ConfigurationError> {
  const { small, medium, large, xlarge } = thresholds;

  if (small < 0 || medium < 0 || large < 0 || xlarge < 0) {
    return err(
      createConfigurationError(
        'size_label_thresholds',
        JSON.stringify(thresholds),
        'Threshold values must be non-negative',
      ),
    );
  }

  if (small > medium || medium > large || large > xlarge) {
    return err(
      createConfigurationError(
        'size_label_thresholds',
        JSON.stringify(thresholds),
        'Thresholds must be monotonic (small ≤ medium ≤ large ≤ xlarge)',
      ),
    );
  }

  return ok(undefined);
}

export function getDetailLabels(
  violations: Violations,
  customLabels?: { largeFiles?: string; tooManyFiles?: string; tooManyLines?: string },
): string[] {
  const labels: string[] = [];

  if (violations.largeFiles.length > 0) {
    labels.push(customLabels?.largeFiles || VIOLATION_LABELS.largeFiles);
  }

  if (violations.exceedsFileLines.length > 0) {
    labels.push(customLabels?.tooManyLines || VIOLATION_LABELS.tooManyLines);
  }

  if (violations.exceedsAdditions) {
    labels.push(VIOLATION_LABELS.excessiveChanges);
  }

  if (violations.exceedsFileCount) {
    labels.push(customLabels?.tooManyFiles || VIOLATION_LABELS.tooManyFiles);
  }

  return labels;
}

export async function getCurrentLabels(token: string, context: PRContext): Promise<Result<string[], GitHubAPIError>> {
  logDebug(`Getting current labels for PR #${context.pullNumber}`);

  const result = await fetchCurrentLabels(token, context);

  if (result.isOk()) {
    logDebug(`Found ${result.value.length} labels: ${result.value.join(', ')}`);
  }

  return result;
}

export async function getCurrentPRLabels(token: string, context: PRContext): Promise<string[] | undefined> {
  logDebug(`Getting current labels for PR #${context.pullNumber}`);

  const result = await fetchCurrentLabels(token, context);

  if (result.isErr()) {
    logWarning('Failed to get labels (will use violations only)');
    return undefined;
  }

  const labels = result.value;
  logDebug(`Found ${labels.length} labels: ${labels.join(', ')}`);
  return labels;
}

type LabelModifier = (
  octokit: ReturnType<typeof github.getOctokit>,
  context: PRContext,
  labels: string[],
) => Promise<void>;

async function modifyLabels(
  labels: string[],
  token: string,
  context: PRContext,
  operation: {
    name: string;
    logMessage: (labels: string[]) => string;
    execute: LabelModifier;
  },
): Promise<Result<void, GitHubAPIError>> {
  if (labels.length === 0) {
    logDebug(`No labels to ${operation.name}`);
    return ok(undefined);
  }

  try {
    logInfo(operation.logMessage(labels));
    const octokit = github.getOctokit(token);
    await operation.execute(octokit, context, labels);
    return ok(undefined);
  } catch (error) {
    const message = ensureError(error).message;
    return err(createGitHubAPIError(`Failed to ${operation.name} labels: ${message}`));
  }
}

export async function addLabels(
  labels: string[],
  token: string,
  context: PRContext,
): Promise<Result<void, GitHubAPIError>> {
  return modifyLabels(labels, token, context, {
    name: 'add',
    logMessage: lbls => `Adding labels: ${lbls.join(', ')}`,
    execute: async (octokit, ctx, lbls) => {
      await octokit.rest.issues.addLabels({
        owner: ctx.owner,
        repo: ctx.repo,
        issue_number: ctx.pullNumber,
        labels: lbls,
      });
    },
  });
}

export async function removeLabels(
  labels: string[],
  token: string,
  context: PRContext,
): Promise<Result<void, GitHubAPIError>> {
  return modifyLabels(labels, token, context, {
    name: 'remove',
    logMessage: lbls => `Removing labels: ${lbls.join(', ')}`,
    execute: async (octokit, ctx, lbls) => {
      // Remove each label individually (GitHub API doesn't support bulk removal)
      for (const label of lbls) {
        try {
          await octokit.rest.issues.removeLabel({
            owner: ctx.owner,
            repo: ctx.repo,
            issue_number: ctx.pullNumber,
            name: label,
          });
        } catch (error) {
          logWarning(`Failed to remove label '${label}': ${ensureError(error).message}`);
        }
      }
    },
  });
}

function buildCustomViolationLabels(config: LabelConfig): {
  largeFiles?: string;
  tooManyFiles?: string;
  tooManyLines?: string;
} {
  const customLabels: { largeFiles?: string; tooManyFiles?: string; tooManyLines?: string } = {};
  if (config.largeFilesLabel) {
    customLabels.largeFiles = config.largeFilesLabel;
  }
  if (config.tooManyFilesLabel) {
    customLabels.tooManyFiles = config.tooManyFilesLabel;
  }
  if (config.tooManyLinesLabel) {
    customLabels.tooManyLines = config.tooManyLinesLabel;
  }
  return customLabels;
}

function calculateLabelsToRemove(
  currentLabels: string[],
  newSizeLabel: string | null,
  newViolationLabels: string[],
  applySizeLabels: boolean,
  autoRemoveLabels: boolean,
): string[] {
  if (!autoRemoveLabels) {
    return [];
  }
  const labelsToRemove: string[] = [];
  if (applySizeLabels) {
    for (const label of currentLabels) {
      if ((label.startsWith('size:') || label.startsWith('size/')) && label !== newSizeLabel) {
        labelsToRemove.push(label);
      }
    }
  }
  for (const label of currentLabels) {
    if (label.startsWith(AUTO_LABEL_PREFIX) && !newViolationLabels.includes(label)) {
      labelsToRemove.push(label);
    }
  }
  return labelsToRemove;
}

function calculateLabelsToAdd(
  currentLabels: string[],
  newSizeLabel: string | null,
  newViolationLabels: string[],
  applySizeLabels: boolean,
): string[] {
  const labelsToAdd: string[] = [];
  if (applySizeLabels && newSizeLabel && !currentLabels.includes(newSizeLabel)) {
    labelsToAdd.push(newSizeLabel);
  }
  for (const label of newViolationLabels) {
    if (!currentLabels.includes(label)) {
      labelsToAdd.push(label);
    }
  }
  return labelsToAdd;
}

export async function updateLabels(
  analysisResult: AnalysisResult,
  config: LabelConfig,
  token: string,
  context: PRContext,
): Promise<Result<LabelUpdate, GitHubAPIError | ConfigurationError>> {
  const validationResult = validateSizeLabelThresholds(config.sizeLabelThresholds);
  if (validationResult.isErr()) {
    return err(validationResult.error);
  }

  const currentLabelsResult = await getCurrentLabels(token, context);
  if (currentLabelsResult.isErr()) {
    return err(currentLabelsResult.error);
  }
  const currentLabels = currentLabelsResult.value;

  const applySizeLabels = config.applySizeLabels !== false;
  const autoRemoveLabels = config.autoRemoveLabels !== false;

  const newSizeLabel = applySizeLabels
    ? calculateSizeLabel(analysisResult.metrics.totalAdditions, config.sizeLabelThresholds)
    : null;

  const newViolationLabels = getDetailLabels(analysisResult.violations, buildCustomViolationLabels(config));

  const labelsToRemove = calculateLabelsToRemove(
    currentLabels,
    newSizeLabel,
    newViolationLabels,
    applySizeLabels,
    autoRemoveLabels,
  );
  const labelsToAdd = calculateLabelsToAdd(currentLabels, newSizeLabel, newViolationLabels, applySizeLabels);

  if (labelsToRemove.length > 0) {
    const removeResult = await removeLabels(labelsToRemove, token, context);
    if (removeResult.isErr()) {
      logWarning(`Failed to remove some labels, continuing...`);
    }
  }

  if (labelsToAdd.length > 0) {
    const addResult = await addLabels(labelsToAdd, token, context);
    if (addResult.isErr()) {
      return err(addResult.error);
    }
  }

  const finalLabels = currentLabels.filter(label => !labelsToRemove.includes(label)).concat(labelsToAdd);
  const result: LabelUpdate = { added: labelsToAdd, removed: labelsToRemove, current: finalLabels };

  if (labelsToAdd.length === 0 && labelsToRemove.length === 0) {
    logInfo('No label changes needed');
  } else {
    logInfo(
      `Label update complete. Added: ${labelsToAdd.join(', ') || 'none'}. Removed: ${labelsToRemove.join(', ') || 'none'}`,
    );
  }

  return ok(result);
}
