/**
 * Failure evaluation logic for label-based workflow failure control
 */

import type { ViolationDetail } from './errors/index.js';
import { t } from './i18n.js';
import type { Config } from './input-mapper.js';
import type { SizeThresholdsV2 } from './parsers/action-input-parsers.js';
import { calculateSizeCategory, compareSizeThreshold } from './size-comparison.js';

/**
 * Failure evaluation input
 */
export interface FailureEvaluationInput {
  config: Config;
  appliedLabels: string[] | undefined; // undefined if label fetch failed
  violations: {
    largeFiles: ViolationDetail[]; // File size violations
    exceedsFileLines: ViolationDetail[]; // Per-file line count violations
    exceedsAdditions: boolean; // PR additions limit exceeded
    exceedsFileCount: boolean; // PR file count limit exceeded
  };
  metrics: {
    totalAdditions: number;
    excludedAdditions: number;
  };
  sizeThresholds: SizeThresholdsV2;
}

/**
 * Evaluate failure conditions based on config, labels, and violations
 * Returns array of failure messages (empty if no failures)
 *
 * @param input - Failure evaluation input
 * @returns Array of failure messages (i18n-translated)
 */
export function evaluateFailureConditions(input: FailureEvaluationInput): string[] {
  const { config, appliedLabels, violations, metrics, sizeThresholds } = input;
  const failures: string[] = [];
  // Track failure keys to prevent duplicates of the same failure type
  const failureKeys = new Set<string>();

  // fail_on_large_files: Check for large files (auto/large-files label or violation)
  if (config.failOnLargeFiles) {
    const hasLargeFilesLabel = appliedLabels?.includes(config.largeFilesLabel) ?? false;
    const hasLargeFilesViolation = violations.largeFiles.length > 0;
    if (hasLargeFilesLabel || hasLargeFilesViolation) {
      if (!failureKeys.has('largeFiles')) {
        failureKeys.add('largeFiles');
        failures.push(t('logs', 'failures.largeFiles'));
      }
    }
  }

  // fail_on_too_many_files: Check for too many files (auto/too-many-files label or violation)
  if (config.failOnTooManyFiles) {
    const hasTooManyFilesLabel = appliedLabels?.includes(config.tooManyFilesLabel) ?? false;
    const hasTooManyFilesViolation = violations.exceedsFileCount;
    if (hasTooManyFilesLabel || hasTooManyFilesViolation) {
      if (!failureKeys.has('tooManyFiles')) {
        failureKeys.add('tooManyFiles');
        failures.push(t('logs', 'failures.tooManyFiles'));
      }
    }
  }

  // Additional check: fail_on_large_files also covers per-file line count violations
  if (config.failOnLargeFiles) {
    const hasTooManyLinesLabel = appliedLabels?.includes(config.tooManyLinesLabel) ?? false;
    const hasTooManyLinesViolation = violations.exceedsFileLines.length > 0;
    if (hasTooManyLinesLabel || hasTooManyLinesViolation) {
      if (!failureKeys.has('tooManyLines')) {
        failureKeys.add('tooManyLines');
        failures.push(t('logs', 'failures.tooManyLines'));
      }
    }
  }

  // Additional check: fail_on_pr_size also covers PR additions limit (excessive changes label)
  if (config.failOnPrSize !== '') {
    const hasExcessiveChangesLabel = appliedLabels?.includes(config.excessiveChangesLabel) ?? false;
    const hasExcessiveChangesViolation = violations.exceedsAdditions;
    if (hasExcessiveChangesLabel || hasExcessiveChangesViolation) {
      if (!failureKeys.has('excessiveChanges')) {
        failureKeys.add('excessiveChanges');
        failures.push(t('logs', 'failures.excessiveChanges'));
      }
    }
  }

  // fail_on_pr_size: Check if PR size exceeds threshold
  if (config.failOnPrSize !== '') {
    const sizeLabel = appliedLabels?.find(l => l.startsWith('size/'));
    let actualSize: string;

    if (sizeLabel) {
      // Normalize "size/large" -> "large"
      actualSize = sizeLabel.replace(/^size\//, '');
    } else {
      // Calculate size category from totalAdditions if no label applied
      actualSize = calculateSizeCategory(metrics.totalAdditions, sizeThresholds);
    }

    if (compareSizeThreshold(actualSize, config.failOnPrSize)) {
      if (!failureKeys.has('prSize')) {
        failureKeys.add('prSize');
        failures.push(t('logs', 'failures.prSize', { size: actualSize, threshold: config.failOnPrSize }));
      }
    }
  }

  return failures;
}
