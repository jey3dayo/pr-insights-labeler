import { err, ok, type Result } from 'neverthrow';

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
export {
  parseBoolean,
  parseBooleanStrict,
  parseCommentMode,
  parseComplexityThresholdsV2,
  parseExcludePatterns,
  parseSizeThresholds,
} from '../parsers/action-input-parsers.js';

/**
 * Normalized action inputs after validation (excluding githubToken/language)
 */
export interface NormalizedActionInputs {
  fileSizeLimit: number;
  fileLinesLimit: number;
  prAdditionsLimit: number;
  prFilesLimit: number;
  autoRemoveLabels: boolean;
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

/**
 * Normalize and validate raw action input strings
 */
export function normalizeActionInputStrings(
  inputs: ActionInputStrings,
): Result<NormalizedActionInputs, ConfigurationError | ParseError> {
  const fileSizeLimitResult = parseSize(inputs.file_size_limit);
  if (fileSizeLimitResult.isErr()) {
    return err(fileSizeLimitResult.error);
  }

  const fileLinesLimit = parseInt(inputs.file_lines_limit, 10);
  if (isNaN(fileLinesLimit)) {
    return err(
      createConfigurationError('file_lines_limit', inputs.file_lines_limit, 'File lines limit must be a number'),
    );
  }

  const prAdditionsLimit = parseInt(inputs.pr_additions_limit, 10);
  if (isNaN(prAdditionsLimit)) {
    return err(
      createConfigurationError('pr_additions_limit', inputs.pr_additions_limit, 'PR additions limit must be a number'),
    );
  }

  const prFilesLimit = parseInt(inputs.pr_files_limit, 10);
  if (isNaN(prFilesLimit)) {
    return err(createConfigurationError('pr_files_limit', inputs.pr_files_limit, 'PR files limit must be a number'));
  }

  const sizeEnabledResult = parseBooleanStrict(inputs.size_enabled);
  if (sizeEnabledResult.isErr()) {
    return err(sizeEnabledResult.error);
  }

  const complexityEnabledResult = parseBooleanStrict(inputs.complexity_enabled);
  if (complexityEnabledResult.isErr()) {
    return err(complexityEnabledResult.error);
  }

  const categoryEnabledResult = parseBooleanStrict(inputs.category_enabled);
  if (categoryEnabledResult.isErr()) {
    return err(categoryEnabledResult.error);
  }

  const riskEnabledResult = parseBooleanStrict(inputs.risk_enabled);
  if (riskEnabledResult.isErr()) {
    return err(riskEnabledResult.error);
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

  const failOnLargeFilesRaw = inputs.fail_on_large_files ?? '';
  const failOnTooManyFilesRaw = inputs.fail_on_too_many_files ?? '';
  const failOnPrSizeRaw = inputs.fail_on_pr_size ?? '';

  const hasExplicitLargeFiles = failOnLargeFilesRaw.trim() !== '';
  const hasExplicitTooManyFiles = failOnTooManyFilesRaw.trim() !== '';
  const hasExplicitPrSize = failOnPrSizeRaw.trim() !== '';

  const failOnLargeFiles = hasExplicitLargeFiles ? parseBoolean(failOnLargeFilesRaw) === true : false;
  const failOnTooManyFiles = hasExplicitTooManyFiles ? parseBoolean(failOnTooManyFilesRaw) === true : false;
  const failOnPrSize = hasExplicitPrSize ? failOnPrSizeRaw.trim() : '';

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

  if (failOnPrSize !== '' && !sizeEnabledResult.value) {
    return err(
      createConfigurationError('fail_on_pr_size', failOnPrSize, 'fail_on_pr_size requires size_enabled to be true'),
    );
  }

  return ok({
    fileSizeLimit: fileSizeLimitResult.value,
    fileLinesLimit,
    prAdditionsLimit,
    prFilesLimit,
    autoRemoveLabels: parseBoolean(inputs.auto_remove_labels),
    sizeEnabled: sizeEnabledResult.value,
    sizeThresholds: sizeThresholdsResult.value,
    complexityEnabled: complexityEnabledResult.value,
    complexityThresholdsV2: complexityThresholdsV2Result.value,
    categoryEnabled: categoryEnabledResult.value,
    riskEnabled: riskEnabledResult.value,
    largeFilesLabel: inputs.large_files_label,
    tooManyFilesLabel: inputs.too_many_files_label,
    tooManyLinesLabel: inputs.too_many_lines_label,
    excessiveChangesLabel: inputs.excessive_changes_label,
    skipDraftPr: parseBoolean(inputs.skip_draft_pr),
    commentOnPr: parseCommentMode(inputs.comment_on_pr),
    failOnLargeFiles,
    failOnTooManyFiles,
    failOnPrSize,
    enableSummary: parseBoolean(inputs.enable_summary),
    additionalExcludePatterns: parseExcludePatterns(inputs.additional_exclude_patterns),
    enableDirectoryLabeling: parseBoolean(inputs.enable_directory_labeling),
    directoryLabelerConfigPath: inputs.directory_labeler_config_path,
    maxLabels,
    useDefaultExcludes: parseBoolean(inputs.use_default_excludes),
  });
}
