import type { ViolationDetail } from './errors/index.js';
import { t } from './i18n.js';
import type { Config } from './input-mapper.js';
import type { SizeThresholds } from './parsers/action-input-parsers.js';
import { calculateSizeCategory, compareSizeThreshold } from './size-comparison.js';

export interface FailureEvaluationInput {
  config: Config;
  appliedLabels: string[] | undefined;
  violations: {
    largeFiles: ViolationDetail[];
    exceedsFileLines: ViolationDetail[];
    exceedsAdditions: boolean;
    exceedsFileCount: boolean;
  };
  metrics: {
    totalAdditions: number;
    excludedAdditions: number;
  };
  sizeThresholds: SizeThresholds;
}

function hasLabelOrViolation(appliedLabels: string[] | undefined, label: string, violation: boolean): boolean {
  return (appliedLabels?.includes(label) ?? false) || violation;
}

function addUniqueFailure(failures: string[], failureKeys: Set<string>, key: string, message: string): void {
  if (!failureKeys.has(key)) {
    failureKeys.add(key);
    failures.push(message);
  }
}

export function evaluateFailureConditions(input: FailureEvaluationInput): string[] {
  const { config, appliedLabels, violations, metrics, sizeThresholds } = input;
  const failures: string[] = [];
  const failureKeys = new Set<string>();

  if (config.failOnLargeFiles && config.fileSizeLimitEnabled) {
    if (hasLabelOrViolation(appliedLabels, config.largeFilesLabel, violations.largeFiles.length > 0)) {
      addUniqueFailure(failures, failureKeys, 'largeFiles', t('logs', 'failures.largeFiles'));
    }
  }

  if (config.failOnTooManyFiles && config.prFilesLimitEnabled) {
    if (hasLabelOrViolation(appliedLabels, config.tooManyFilesLabel, violations.exceedsFileCount)) {
      addUniqueFailure(failures, failureKeys, 'tooManyFiles', t('logs', 'failures.tooManyFiles'));
    }
  }

  if (config.failOnLargeFiles && config.fileLinesLimitEnabled) {
    if (hasLabelOrViolation(appliedLabels, config.tooManyLinesLabel, violations.exceedsFileLines.length > 0)) {
      addUniqueFailure(failures, failureKeys, 'tooManyLines', t('logs', 'failures.tooManyLines'));
    }
  }

  if (config.failOnPrSize !== '' && config.prAdditionsLimitEnabled) {
    if (hasLabelOrViolation(appliedLabels, config.excessiveChangesLabel, violations.exceedsAdditions)) {
      addUniqueFailure(failures, failureKeys, 'excessiveChanges', t('logs', 'failures.excessiveChanges'));
    }
  }

  if (config.failOnPrSize !== '') {
    const sizeLabel = appliedLabels?.find(l => l.startsWith('size/'));
    const actualSize = sizeLabel
      ? sizeLabel.replace(/^size\//, '')
      : calculateSizeCategory(metrics.totalAdditions, sizeThresholds);

    if (compareSizeThreshold(actualSize, config.failOnPrSize)) {
      addUniqueFailure(
        failures,
        failureKeys,
        'prSize',
        t('logs', 'failures.prSize', { size: actualSize, threshold: config.failOnPrSize }),
      );
    }
  }

  return failures;
}
