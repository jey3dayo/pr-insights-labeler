import { err, ok, type Result } from 'neverthrow';

import type { ActionInputs } from '../actions-io';
import type { ConfigurationError, ParseError } from '../errors/index.js';
import { createConfigurationError, createParseError } from '../errors/index.js';
import { parseSize } from '../parsers/size-parser.js';
import { hasProperty, isObject } from '../utils/type-guards.js';

/**
 * Size threshold configuration (v0.x format: S/M/L with additions + files)
 */
export interface SizeThresholds {
  S: { additions: number; files: number };
  M: { additions: number; files: number };
  L: { additions: number; files: number };
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
 * Normalized action inputs after validation (excluding githubToken/language)
 */
export interface NormalizedActionInputs {
  fileSizeLimit: number;
  fileLinesLimit: number;
  prAdditionsLimit: number;
  prFilesLimit: number;
  autoRemoveLabels: boolean;
  sizeEnabled: boolean;
  sizeThresholdsV2: SizeThresholdsV2;
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
 */
export function parseCommentMode(value: string): 'auto' | 'always' | 'never' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'always' || normalized === 'never') {
    return normalized;
  }
  return 'auto';
}

/**
 * Parse exclude patterns from string
 */
export function parseExcludePatterns(value: string): string[] {
  const patterns = value
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('#'));

  return [...new Set(patterns)];
}

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

export function parseSizeThresholds(value: string): Result<SizeThresholds, ParseError> {
  try {
    const parsed = JSON.parse(value);

    if (!parsed.S || !parsed.M || !parsed.L) {
      return err(createParseError(value, 'Missing required size thresholds (S, M, L)'));
    }

    const sizes = ['S', 'M', 'L'] as const;
    for (const size of sizes) {
      if (typeof parsed[size].additions !== 'number' || typeof parsed[size].files !== 'number') {
        return err(createParseError(value, `Invalid threshold structure for size ${size}`));
      }
      if (parsed[size].additions < 0 || parsed[size].files < 0) {
        return err(createParseError(value, `Threshold values for size ${size} must be non-negative`));
      }
    }

    if (parsed.S.additions > parsed.M.additions || parsed.M.additions > parsed.L.additions) {
      return err(createParseError(value, 'Size thresholds must be monotonic (S ≤ M ≤ L for additions)'));
    }
    if (parsed.S.files > parsed.M.files || parsed.M.files > parsed.L.files) {
      return err(createParseError(value, 'Size thresholds must be monotonic (S ≤ M ≤ L for files)'));
    }

    if (!isSizeThresholds(parsed)) {
      return err(createParseError(value, 'Invalid size thresholds structure'));
    }

    return ok(parsed);
  } catch (_error) {
    return err(createParseError(value, 'Invalid JSON for size thresholds'));
  }
}

export function parseSizeThresholdsV2(value: string): Result<SizeThresholdsV2, ParseError> {
  try {
    const parsed = JSON.parse(value);

    if (
      typeof parsed.small !== 'number' ||
      typeof parsed.medium !== 'number' ||
      typeof parsed.large !== 'number' ||
      typeof parsed.xlarge !== 'number'
    ) {
      return err(createParseError(value, 'Missing or invalid required size thresholds (small, medium, large, xlarge)'));
    }

    if (parsed.small < 0 || parsed.medium < 0 || parsed.large < 0 || parsed.xlarge < 0) {
      return err(createParseError(value, 'Size threshold values must be non-negative'));
    }

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

export function parseComplexityThresholdsV2(value: string): Result<{ medium: number; high: number }, ParseError> {
  try {
    const parsed = JSON.parse(value);

    if (typeof parsed.medium !== 'number' || typeof parsed.high !== 'number') {
      return err(createParseError(value, 'Missing or invalid required complexity thresholds (medium, high)'));
    }

    if (parsed.medium < 0 || parsed.high < 0) {
      return err(createParseError(value, 'Complexity threshold values must be non-negative'));
    }

    if (parsed.medium >= parsed.high) {
      return err(
        createParseError(value, `complexity.thresholds.medium (${parsed.medium}) must be less than high (${parsed.high})`),
      );
    }

    return ok({ medium: parsed.medium, high: parsed.high });
  } catch (_error) {
    return err(createParseError(value, 'Invalid JSON for complexity thresholds'));
  }
}

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

  const sizeThresholdsV2Result = parseSizeThresholdsV2(inputs.size_thresholds);
  if (sizeThresholdsV2Result.isErr()) {
    return err(sizeThresholdsV2Result.error);
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
