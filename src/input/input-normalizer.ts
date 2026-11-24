import { err, ok, type Result, safeTry } from 'neverthrow';

import type { ActionInputs } from '../actions-io';
import type { ConfigurationError, ParseError } from '../errors/index.js';
import { createConfigurationError } from '../errors/index.js';
import {
  parseBoolean,
  parseBooleanStrict,
  parseCommentMode,
  parseComplexityThresholdsV2,
  parseExcludePatterns,
  parseSizeThresholds,
  type SizeThresholds,
} from '../parsers/action-input-parsers.js';
import { parseSize } from '../parsers/size-parser.js';

export type { SizeThresholds } from '../parsers/action-input-parsers.js';

export interface NormalizedActionInputs {
  fileSizeLimit: number;
  fileSizeLimitEnabled: boolean;
  fileLinesLimit: number;
  fileLinesLimitEnabled: boolean;
  prAdditionsLimit: number;
  prAdditionsLimitEnabled: boolean;
  prFilesLimit: number;
  prFilesLimitEnabled: boolean;
  sizeEnabled: boolean;
  sizeThresholds: SizeThresholds;
  complexityEnabled: boolean;
  complexityThresholdsV2: { medium: number; high: number };
  categoryEnabled: boolean;
  riskEnabled: boolean;
  largeFilesLabel: string;
  tooManyFilesLabel: string;
  tooManyLinesLabel: string;
  excessiveChangesLabel: string;
  skipDraftPr: boolean;
  commentOnPr: 'auto' | 'always' | 'never';
  failOnLargeFiles: boolean;
  failOnTooManyFiles: boolean;
  failOnPrSize: string;
  enableSummary: boolean;
  additionalExcludePatterns: string[];
  enableDirectoryLabeling: boolean;
  directoryLabelerConfigPath: string;
  maxLabels: number;
  useDefaultExcludes: boolean;
}

export type ActionInputStrings = Omit<ActionInputs, 'github_token' | 'language'>;

interface FileLimitInputs {
  fileSizeLimit: number;
  fileSizeLimitEnabled: boolean;
  fileLinesLimit: number;
  fileLinesLimitEnabled: boolean;
}

function parseFileLimits(inputs: ActionInputStrings): Result<FileLimitInputs, ConfigurationError | ParseError> {
  return safeTry(function* () {
    const fileSizeLimit = yield* parseSize(inputs.file_size_limit).safeUnwrap();
    const fileSizeLimitEnabled = yield* parseBooleanStrict(inputs.file_size_limit_enabled).safeUnwrap();

    const fileLinesLimit = parseInt(inputs.file_lines_limit, 10);
    if (isNaN(fileLinesLimit)) {
      return err(
        createConfigurationError('file_lines_limit', inputs.file_lines_limit, 'File lines limit must be a number'),
      );
    }

    const fileLinesLimitEnabled = yield* parseBooleanStrict(inputs.file_lines_limit_enabled).safeUnwrap();

    return ok({ fileSizeLimit, fileSizeLimitEnabled, fileLinesLimit, fileLinesLimitEnabled });
  });
}

interface PRLimitInputs {
  prAdditionsLimit: number;
  prAdditionsLimitEnabled: boolean;
  prFilesLimit: number;
  prFilesLimitEnabled: boolean;
}

function parsePRLimits(inputs: ActionInputStrings): Result<PRLimitInputs, ConfigurationError | ParseError> {
  return safeTry(function* () {
    const prAdditionsLimit = parseInt(inputs.pr_additions_limit, 10);
    if (isNaN(prAdditionsLimit)) {
      return err(
        createConfigurationError(
          'pr_additions_limit',
          inputs.pr_additions_limit,
          'PR additions limit must be a number',
        ),
      );
    }

    const prFilesLimit = parseInt(inputs.pr_files_limit, 10);
    if (isNaN(prFilesLimit)) {
      return err(createConfigurationError('pr_files_limit', inputs.pr_files_limit, 'PR files limit must be a number'));
    }

    const prAdditionsLimitEnabled = yield* parseBooleanStrict(inputs.pr_additions_limit_enabled).safeUnwrap();
    const prFilesLimitEnabled = yield* parseBooleanStrict(inputs.pr_files_limit_enabled).safeUnwrap();

    return ok({ prAdditionsLimit, prAdditionsLimitEnabled, prFilesLimit, prFilesLimitEnabled });
  });
}

interface FeatureFlagInputs {
  sizeEnabled: boolean;
  complexityEnabled: boolean;
  categoryEnabled: boolean;
  riskEnabled: boolean;
}

function parseFeatureFlags(inputs: ActionInputStrings): Result<FeatureFlagInputs, ConfigurationError | ParseError> {
  return safeTry(function* () {
    const sizeEnabled = yield* parseBooleanStrict(inputs.size_enabled).safeUnwrap();
    const complexityEnabled = yield* parseBooleanStrict(inputs.complexity_enabled).safeUnwrap();
    const categoryEnabled = yield* parseBooleanStrict(inputs.category_enabled).safeUnwrap();
    const riskEnabled = yield* parseBooleanStrict(inputs.risk_enabled).safeUnwrap();
    return ok({ sizeEnabled, complexityEnabled, categoryEnabled, riskEnabled });
  });
}

interface FailureConditionInputs {
  failOnLargeFiles: boolean;
  failOnTooManyFiles: boolean;
  failOnPrSize: string;
}

function parseFailureConditions(
  inputs: ActionInputStrings,
  sizeEnabled: boolean,
): Result<FailureConditionInputs, ConfigurationError | ParseError> {
  const failOnLargeFilesRaw = inputs.fail_on_large_files ?? '';
  const failOnTooManyFilesRaw = inputs.fail_on_too_many_files ?? '';
  const failOnPrSizeRaw = inputs.fail_on_pr_size ?? '';

  const failOnLargeFiles = failOnLargeFilesRaw.trim() !== '' ? parseBoolean(failOnLargeFilesRaw) === true : false;
  const failOnTooManyFiles = failOnTooManyFilesRaw.trim() !== '' ? parseBoolean(failOnTooManyFilesRaw) === true : false;
  const failOnPrSize = failOnPrSizeRaw.trim() !== '' ? failOnPrSizeRaw.trim() : '';

  const validSizes = ['', 'small', 'medium', 'large', 'xlarge', 'xxlarge'];
  if (!validSizes.includes(failOnPrSize)) {
    return err(
      createConfigurationError(
        'fail_on_pr_size',
        failOnPrSize,
        `Invalid fail_on_pr_size value. Valid values: ${validSizes.join(', ')}`,
      ),
    );
  }

  if (failOnPrSize !== '' && !sizeEnabled) {
    return err(
      createConfigurationError('fail_on_pr_size', failOnPrSize, 'fail_on_pr_size requires size_enabled to be true'),
    );
  }

  return ok({ failOnLargeFiles, failOnTooManyFiles, failOnPrSize });
}

export function normalizeActionInputStrings(
  inputs: ActionInputStrings,
): Result<NormalizedActionInputs, ConfigurationError | ParseError> {
  const fileLimitsResult = parseFileLimits(inputs);
  if (fileLimitsResult.isErr()) {
    return err(fileLimitsResult.error);
  }

  const prLimitsResult = parsePRLimits(inputs);
  if (prLimitsResult.isErr()) {
    return err(prLimitsResult.error);
  }

  const featureFlagsResult = parseFeatureFlags(inputs);
  if (featureFlagsResult.isErr()) {
    return err(featureFlagsResult.error);
  }

  const sizeThresholdsResult = parseSizeThresholds(inputs.size_thresholds);
  if (sizeThresholdsResult.isErr()) {
    return err(sizeThresholdsResult.error);
  }

  const complexityThresholdsV2Result = parseComplexityThresholdsV2(inputs.complexity_thresholds);
  if (complexityThresholdsV2Result.isErr()) {
    return err(complexityThresholdsV2Result.error);
  }

  const rawMax = (inputs.max_labels ?? '').trim();
  const maxLabels = rawMax === '' ? 0 : parseInt(rawMax, 10);
  if (!Number.isInteger(maxLabels) || maxLabels < 0) {
    return err(createConfigurationError('max_labels', inputs.max_labels, 'max_labels must be a non-negative integer'));
  }

  const failureConditionsResult = parseFailureConditions(inputs, featureFlagsResult.value.sizeEnabled);
  if (failureConditionsResult.isErr()) {
    return err(failureConditionsResult.error);
  }

  return ok({
    ...fileLimitsResult.value,
    ...prLimitsResult.value,
    ...featureFlagsResult.value,
    sizeThresholds: sizeThresholdsResult.value,
    complexityThresholdsV2: complexityThresholdsV2Result.value,
    largeFilesLabel: inputs.large_files_label,
    tooManyFilesLabel: inputs.too_many_files_label,
    tooManyLinesLabel: inputs.too_many_lines_label,
    excessiveChangesLabel: inputs.excessive_changes_label,
    skipDraftPr: parseBoolean(inputs.skip_draft_pr),
    commentOnPr: parseCommentMode(inputs.comment_on_pr),
    ...failureConditionsResult.value,
    enableSummary: parseBoolean(inputs.enable_summary),
    additionalExcludePatterns: parseExcludePatterns(inputs.additional_exclude_patterns),
    enableDirectoryLabeling: parseBoolean(inputs.enable_directory_labeling),
    directoryLabelerConfigPath: inputs.directory_labeler_config_path,
    maxLabels,
    useDefaultExcludes: parseBoolean(inputs.use_default_excludes),
  });
}
