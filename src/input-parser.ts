/**
 * Input Parser
 *
 * Action inputs のパース・バリデーション
 * 参考: action-cache の getInputs() パターン
 */

import * as core from '@actions/core';
import { err, ok, type Result } from 'neverthrow';

import type { ConfigurationError, ParseError } from './errors/index.js';
import { createConfigurationError } from './errors/index.js';
import {
  parseBoolean,
  parseBooleanStrict,
  parseCommentMode,
  parseComplexityThresholdsV2,
  parseExcludePatterns,
  parseSizeThresholds,
} from './parsers/action-input-parsers.js';
import { parseSize } from './parsers/size-parser.js';

/**
 * Parsed Inputs Interface (型安全)
 */
export interface ParsedInputs {
  // 言語設定（nullable: action.yml の default 削除により）
  language: string | undefined;

  // GitHub token (required)
  githubToken: string;

  // ファイル制限（number 型）
  fileSizeLimit: number;
  fileLinesLimit: number;
  prAdditionsLimit: number;
  prFilesLimit: number;

  // PR Insights Labeler - 有効化フラグ（boolean 型）
  sizeEnabled: boolean;
  complexityEnabled: boolean;
  categoryEnabled: boolean;
  riskEnabled: boolean;

  // PR Insights Labeler - 閾値（型安全なオブジェクト）
  sizeThresholds: { small: number; medium: number; large: number; xlarge: number };
  complexityThresholdsV2: { medium: number; high: number };

  // その他のフィールド
  autoRemoveLabels: boolean;
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

  // Directory-Based Labeling
  enableDirectoryLabeling: boolean;
  directoryLabelerConfigPath: string;
  maxLabels: number;
  useDefaultExcludes: boolean;
}

/**
 * Parse and validate all action inputs
 * 既存の mapActionInputsToConfig() のロジックを100%保持
 *
 * 参考: action-cache の getInputs()
 *
 * @returns パース済みの型安全な入力データ
 */
export function parseActionInputs(): Result<ParsedInputs, ConfigurationError | ParseError> {
  // Language (nullable: action.yml の default 削除により undefined 可能)
  const rawLanguage = core.getInput('language');
  const language = rawLanguage || undefined; // 空文字列 → undefined

  // GitHub Token (required)
  const githubToken = core.getInput('github_token');
  if (!githubToken) {
    return err(createConfigurationError('github_token', undefined, 'GitHub token is required'));
  }

  // File size limit (parse "100KB" → 102400)
  const fileSizeLimitResult = parseSize(core.getInput('file_size_limit'));
  if (fileSizeLimitResult.isErr()) {
    return err(fileSizeLimitResult.error);
  }

  // Parse numeric limits
  const fileLinesLimitStr = core.getInput('file_lines_limit');
  const fileLinesLimit = parseInt(fileLinesLimitStr, 10);
  if (isNaN(fileLinesLimit)) {
    return err(createConfigurationError('file_lines_limit', fileLinesLimitStr, 'File lines limit must be a number'));
  }

  const prAdditionsLimitStr = core.getInput('pr_additions_limit');
  const prAdditionsLimit = parseInt(prAdditionsLimitStr, 10);
  if (isNaN(prAdditionsLimit)) {
    return err(
      createConfigurationError('pr_additions_limit', prAdditionsLimitStr, 'PR additions limit must be a number'),
    );
  }

  const prFilesLimitStr = core.getInput('pr_files_limit');
  const prFilesLimit = parseInt(prFilesLimitStr, 10);
  if (isNaN(prFilesLimit)) {
    return err(createConfigurationError('pr_files_limit', prFilesLimitStr, 'PR files limit must be a number'));
  }

  // Parse PR Insights Labeler enabled flags (strict validation)
  const sizeEnabledResult = parseBooleanStrict(core.getInput('size_enabled'));
  if (sizeEnabledResult.isErr()) {
    return err(sizeEnabledResult.error);
  }

  const complexityEnabledResult = parseBooleanStrict(core.getInput('complexity_enabled'));
  if (complexityEnabledResult.isErr()) {
    return err(complexityEnabledResult.error);
  }

  const categoryEnabledResult = parseBooleanStrict(core.getInput('category_enabled'));
  if (categoryEnabledResult.isErr()) {
    return err(categoryEnabledResult.error);
  }

  const riskEnabledResult = parseBooleanStrict(core.getInput('risk_enabled'));
  if (riskEnabledResult.isErr()) {
    return err(riskEnabledResult.error);
  }

  // Parse PR Insights Labeler thresholds
  const sizeThresholdsResult = parseSizeThresholds(core.getInput('size_thresholds'));
  if (sizeThresholdsResult.isErr()) {
    return err(sizeThresholdsResult.error);
  }

  const complexityThresholdsV2Result = parseComplexityThresholdsV2(core.getInput('complexity_thresholds'));
  if (complexityThresholdsV2Result.isErr()) {
    return err(complexityThresholdsV2Result.error);
  }

  // Parse Directory-Based Labeler numeric inputs
  const rawMax = core.getInput('max_labels').trim();
  const maxLabels = rawMax === '' ? 0 : parseInt(rawMax, 10);
  if (!Number.isInteger(maxLabels) || maxLabels < 0) {
    return err(createConfigurationError('max_labels', rawMax, 'max_labels must be a non-negative integer'));
  }

  // Label-Based Workflow Failure Control
  const failOnLargeFilesStr = core.getInput('fail_on_large_files');
  const failOnTooManyFilesStr = core.getInput('fail_on_too_many_files');
  const failOnPrSizeStr = core.getInput('fail_on_pr_size');

  const hasExplicitLargeFiles = failOnLargeFilesStr.trim() !== '';
  const hasExplicitTooManyFiles = failOnTooManyFilesStr.trim() !== '';
  const hasExplicitPrSize = failOnPrSizeStr.trim() !== '';

  const failOnLargeFiles = hasExplicitLargeFiles ? parseBoolean(failOnLargeFilesStr) === true : false;
  const failOnTooManyFiles = hasExplicitTooManyFiles ? parseBoolean(failOnTooManyFilesStr) === true : false;
  const failOnPrSize = hasExplicitPrSize ? failOnPrSizeStr.trim() : '';

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

  return ok({
    language,
    githubToken,
    fileSizeLimit: fileSizeLimitResult.value,
    fileLinesLimit,
    prAdditionsLimit,
    prFilesLimit,
    sizeEnabled: sizeEnabledResult.value,
    sizeThresholds: sizeThresholdsResult.value,
    complexityEnabled: complexityEnabledResult.value,
    complexityThresholdsV2: complexityThresholdsV2Result.value,
    categoryEnabled: categoryEnabledResult.value,
    riskEnabled: riskEnabledResult.value,
    autoRemoveLabels: parseBoolean(core.getInput('auto_remove_labels')),
    largeFilesLabel: core.getInput('large_files_label'),
    tooManyFilesLabel: core.getInput('too_many_files_label'),
    tooManyLinesLabel: core.getInput('too_many_lines_label'),
    excessiveChangesLabel: core.getInput('excessive_changes_label'),
    skipDraftPr: parseBoolean(core.getInput('skip_draft_pr')),
    commentOnPr: parseCommentMode(core.getInput('comment_on_pr')),
    failOnLargeFiles,
    failOnTooManyFiles,
    failOnPrSize,
    enableSummary: parseBoolean(core.getInput('enable_summary')),
    additionalExcludePatterns: parseExcludePatterns(core.getInput('additional_exclude_patterns')),
    enableDirectoryLabeling: parseBoolean(core.getInput('enable_directory_labeling')),
    directoryLabelerConfigPath: core.getInput('directory_labeler_config_path'),
    maxLabels,
    useDefaultExcludes: parseBoolean(core.getInput('use_default_excludes')),
  });
}
