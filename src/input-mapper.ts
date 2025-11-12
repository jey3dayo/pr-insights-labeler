/**
 * Input mapper - converts action inputs to internal config
 */

import { err, ok, Result } from 'neverthrow';

import type { ActionInputs } from './actions-io';
import type { ConfigurationError, ParseError } from './errors/index.js';
import { createConfigurationError, createParseError } from './errors/index.js';
import { parseSize } from './parsers/size-parser';
import { hasProperty, isObject } from './utils/type-guards.js';

/**
 * Size threshold configuration (v0.x format: S/M/L with additions + files)
 */
export interface SizeThresholds {
  S: { additions: number; files: number };
  M: { additions: number; files: number };
  L: { additions: number; files: number };
  // XL is determined when L thresholds are exceeded
}

/**
 * Size threshold configuration (v2 format: small/medium/large/xlarge with additions only)
 */
export interface SizeThresholdsV2 {
  small: number;
  medium: number;
  large: number;
  xlarge: number;
}

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
 * Parse boolean value (lenient)
 * Accepts: true, 1, yes, on (case insensitive, with spaces)
 * Unknown values default to false
 */
export function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
}

/**
 * Parse boolean value (strict)
 * Accepts: true, 1, yes, on, false, 0, no, off (case insensitive, with spaces)
 * Unknown values return ConfigurationError
 */
export function parseBooleanStrict(value: string): Result<boolean, ConfigurationError> {
  const normalized = value.trim().toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return ok(true);
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return ok(false);
  }

  return err(
    createConfigurationError(
      'boolean',
      value,
      `Invalid boolean value: "${value}". Allowed values: true/false/1/0/yes/no/on/off`,
    ),
  );
}

/**
 * Parse comment mode
 * Valid values: auto, always, never
 * Default: auto
 */
export function parseCommentMode(value: string): 'auto' | 'always' | 'never' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'always' || normalized === 'never') {
    return normalized;
  }
  return 'auto'; // default
}

/**
 * Parse exclude patterns
 * Splits by comma or newline, trims, filters empty values and comments
 * Also removes duplicate patterns
 */
export function parseExcludePatterns(value: string): string[] {
  const patterns = value
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('#')); // Skip empty and comment lines

  // Remove duplicates
  return [...new Set(patterns)];
}

/**
 * Type guard to check if parsed value is a valid SizeThresholds
 */
function isSizeThresholds(value: unknown): value is SizeThresholds {
  if (!isObject(value)) {
    return false;
  }

  const sizes = ['S', 'M', 'L'] as const;

  for (const size of sizes) {
    if (!hasProperty(value, size)) {
      return false;
    }
    const sizeObj = value[size];
    if (!isObject(sizeObj)) {
      return false;
    }
    if (!hasProperty(sizeObj, 'additions') || !hasProperty(sizeObj, 'files')) {
      return false;
    }
    if (typeof sizeObj.additions !== 'number' || typeof sizeObj.files !== 'number') {
      return false;
    }
  }

  return true;
}

/**
 * Parse size thresholds from JSON string (v0.x の形式: S/M/L with additions + files)
 */
export function parseSizeThresholds(value: string): Result<SizeThresholds, ParseError> {
  try {
    const parsed = JSON.parse(value);

    // Validate required fields
    if (!parsed.S || !parsed.M || !parsed.L) {
      return err(createParseError(value, 'Missing required size thresholds (S, M, L)'));
    }

    // Validate structure and non-negative values
    const sizes = ['S', 'M', 'L'] as const;
    for (const size of sizes) {
      if (typeof parsed[size].additions !== 'number' || typeof parsed[size].files !== 'number') {
        return err(createParseError(value, `Invalid threshold structure for size ${size}`));
      }
      if (parsed[size].additions < 0 || parsed[size].files < 0) {
        return err(createParseError(value, `Threshold values for size ${size} must be non-negative`));
      }
    }

    // Validate monotonicity (S ≤ M ≤ L)
    if (parsed.S.additions > parsed.M.additions || parsed.M.additions > parsed.L.additions) {
      return err(createParseError(value, 'Size thresholds must be monotonic (S ≤ M ≤ L for additions)'));
    }
    if (parsed.S.files > parsed.M.files || parsed.M.files > parsed.L.files) {
      return err(createParseError(value, 'Size thresholds must be monotonic (S ≤ M ≤ L for files)'));
    }

    // Type guard ensures type safety without assertion
    if (!isSizeThresholds(parsed)) {
      return err(createParseError(value, 'Invalid size thresholds structure'));
    }

    return ok(parsed);
  } catch (_error) {
    return err(createParseError(value, 'Invalid JSON for size thresholds'));
  }
}

/**
 * Parse size thresholds from JSON string (V2: small/medium/large with additions only)
 * Used by PR Insights Labeler feature
 */
export function parseSizeThresholdsV2(
  value: string,
): Result<{ small: number; medium: number; large: number; xlarge: number }, ParseError> {
  try {
    const parsed = JSON.parse(value);

    // Validate required fields
    if (
      typeof parsed.small !== 'number' ||
      typeof parsed.medium !== 'number' ||
      typeof parsed.large !== 'number' ||
      typeof parsed.xlarge !== 'number'
    ) {
      return err(createParseError(value, 'Missing or invalid required size thresholds (small, medium, large, xlarge)'));
    }

    // Validate non-negative values
    if (parsed.small < 0 || parsed.medium < 0 || parsed.large < 0 || parsed.xlarge < 0) {
      return err(createParseError(value, 'Size threshold values must be non-negative'));
    }

    // Validate monotonicity (small < medium < large < xlarge)
    if (parsed.small >= parsed.medium) {
      return err(
        createParseError(value, `size.thresholds.small (${parsed.small}) must be less than medium (${parsed.medium})`),
      );
    }
    if (parsed.medium >= parsed.large) {
      return err(
        createParseError(value, `size.thresholds.medium (${parsed.medium}) must be less than large (${parsed.large})`),
      );
    }
    if (parsed.large >= parsed.xlarge) {
      return err(
        createParseError(value, `size.thresholds.large (${parsed.large}) must be less than xlarge (${parsed.xlarge})`),
      );
    }

    return ok({ small: parsed.small, medium: parsed.medium, large: parsed.large, xlarge: parsed.xlarge });
  } catch (_error) {
    return err(createParseError(value, 'Invalid JSON for size thresholds'));
  }
}

/**
 * Parse complexity thresholds from JSON string (V2: medium/high)
 * Used by PR Insights Labeler feature
 */
export function parseComplexityThresholdsV2(value: string): Result<{ medium: number; high: number }, ParseError> {
  try {
    const parsed = JSON.parse(value);

    // Validate required fields
    if (typeof parsed.medium !== 'number' || typeof parsed.high !== 'number') {
      return err(createParseError(value, 'Missing or invalid required complexity thresholds (medium, high)'));
    }

    // Validate non-negative values
    if (parsed.medium < 0 || parsed.high < 0) {
      return err(createParseError(value, 'Complexity threshold values must be non-negative'));
    }

    // Validate monotonicity (medium < high)
    if (parsed.medium >= parsed.high) {
      return err(
        createParseError(
          value,
          `complexity.thresholds.medium (${parsed.medium}) must be less than high (${parsed.high})`,
        ),
      );
    }

    return ok({ medium: parsed.medium, high: parsed.high });
  } catch (_error) {
    return err(createParseError(value, 'Invalid JSON for complexity thresholds'));
  }
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
