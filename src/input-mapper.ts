/**
 * Input mapper - converts action inputs to internal config
 */

import { err, ok, Result } from 'neverthrow';

import type { ActionInputs } from './actions-io';
import type { ConfigurationError, ParseError } from './errors/index.js';
import { createConfigurationError } from './errors/index.js';
import {
  parseBoolean,
  parseBooleanStrict,
  parseCommentMode,
  parseComplexityThresholdsV2,
  parseExcludePatterns,
  parseSizeThresholds,
  parseSizeThresholdsV2,
  type SizeThresholds,
  type SizeThresholdsV2,
} from './parsers/action-input-parsers.js';
import { parseSize } from './parsers/size-parser';

/**
 * Internal configuration (camelCase, parsed)
 */
export interface Config {
  fileSizeLimit: number; // bytes
  fileLinesLimit: number; // number
  prAdditionsLimit: number; // number
  prFilesLimit: number; // number
  autoRemoveLabels: boolean;
  // PR Insights Labeler - Selective Label Enabling
  sizeEnabled: boolean;
  sizeThresholdsV2: { small: number; medium: number; large: number; xlarge: number };
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
  // Label-Based Workflow Failure Control
  failOnLargeFiles: boolean;
  failOnTooManyFiles: boolean;
  failOnPrSize: string; // "" | "small" | "medium" | "large" | "xlarge" | "xxlarge"
  enableSummary: boolean;
  additionalExcludePatterns: string[];
  githubToken: string;
  // Directory-Based Labeling
  enableDirectoryLabeling: boolean;
  directoryLabelerConfigPath: string;
  maxLabels: number;
  useDefaultExcludes: boolean;
  // i18n Support
  language?: string; // Language code (e.g., 'en', 'ja', 'en-US', 'ja-JP')
}

/**
 * Map action inputs to internal config
 */
export function mapActionInputsToConfig(inputs: ActionInputs): Result<Config, ConfigurationError | ParseError> {
  // Parse file size limit
  const fileSizeLimitResult = parseSize(inputs.file_size_limit);
  if (fileSizeLimitResult.isErr()) {
    return err(fileSizeLimitResult.error);
  }

  // Parse numeric limits
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

  // Parse PR Insights Labeler enabled flags (strict validation)
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

  // Parse PR Insights Labeler thresholds
  const sizeThresholdsV2Result = parseSizeThresholdsV2(inputs.size_thresholds);
  if (sizeThresholdsV2Result.isErr()) {
    return err(sizeThresholdsV2Result.error);
  }

  const complexityThresholdsV2Result = parseComplexityThresholdsV2(inputs.complexity_thresholds);
  if (complexityThresholdsV2Result.isErr()) {
    return err(complexityThresholdsV2Result.error);
  }

  // Parse Directory-Based Labeler numeric inputs
  const rawMax = (inputs.max_labels ?? '').trim();
  const maxLabels = rawMax === '' ? 0 : parseInt(rawMax, 10);
  if (!Number.isInteger(maxLabels) || maxLabels < 0) {
    return err(createConfigurationError('max_labels', inputs.max_labels, 'max_labels must be a non-negative integer'));
  }

  // Label-Based Workflow Failure Control
  const hasExplicitLargeFiles = inputs.fail_on_large_files.trim() !== '';
  const hasExplicitTooManyFiles = inputs.fail_on_too_many_files.trim() !== '';
  const hasExplicitPrSize = inputs.fail_on_pr_size.trim() !== '';

  const failOnLargeFiles = hasExplicitLargeFiles ? parseBoolean(inputs.fail_on_large_files) === true : false;
  const failOnTooManyFiles = hasExplicitTooManyFiles ? parseBoolean(inputs.fail_on_too_many_files) === true : false;
  const failOnPrSize = hasExplicitPrSize ? inputs.fail_on_pr_size.trim() : '';

  // Validate fail_on_pr_size
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

  // size_enabled dependency check
  if (failOnPrSize !== '' && !sizeEnabledResult.value) {
    return err(
      createConfigurationError('fail_on_pr_size', failOnPrSize, 'fail_on_pr_size requires size_enabled to be true'),
    );
  }

  // Construct config object
  const config: Config = {
    fileSizeLimit: fileSizeLimitResult.value,
    fileLinesLimit,
    prAdditionsLimit,
    prFilesLimit,
    autoRemoveLabels: parseBoolean(inputs.auto_remove_labels),
    // PR Insights Labeler - Selective Label Enabling
    sizeEnabled: sizeEnabledResult.value,
    sizeThresholdsV2: sizeThresholdsV2Result.value,
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
    // Label-Based Workflow Failure Control
    failOnLargeFiles,
    failOnTooManyFiles,
    failOnPrSize,
    enableSummary: parseBoolean(inputs.enable_summary),
    additionalExcludePatterns: parseExcludePatterns(inputs.additional_exclude_patterns),
    githubToken: inputs.github_token,
    // Directory-Based Labeling
    enableDirectoryLabeling: parseBoolean(inputs.enable_directory_labeling),
    directoryLabelerConfigPath: inputs.directory_labeler_config_path,
    maxLabels,
    useDefaultExcludes: parseBoolean(inputs.use_default_excludes),
    // i18n Support
    language: inputs.language,
  };

  return ok(config);
}

export {
  parseBoolean,
  parseBooleanStrict,
  parseCommentMode,
  parseComplexityThresholdsV2,
  parseExcludePatterns,
  parseSizeThresholds,
  parseSizeThresholdsV2,
};

export type { SizeThresholds, SizeThresholdsV2 };
