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
  normalizeActionInputStrings,
  type ActionInputStrings,
  type NormalizedActionInputs,
} from './input/input-normalizer.js';

/**
 * Parsed Inputs Interface (型安全)
 */
export interface ParsedInputs extends NormalizedActionInputs {
  language: string | undefined;
  githubToken: string;
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

  const rawInputs: ActionInputStrings = {
    file_size_limit: core.getInput('file_size_limit'),
    file_lines_limit: core.getInput('file_lines_limit'),
    pr_additions_limit: core.getInput('pr_additions_limit'),
    pr_files_limit: core.getInput('pr_files_limit'),
    auto_remove_labels: core.getInput('auto_remove_labels'),
    size_enabled: core.getInput('size_enabled'),
    size_thresholds: core.getInput('size_thresholds'),
    complexity_enabled: core.getInput('complexity_enabled'),
    complexity_thresholds: core.getInput('complexity_thresholds'),
    category_enabled: core.getInput('category_enabled'),
    risk_enabled: core.getInput('risk_enabled'),
    large_files_label: core.getInput('large_files_label'),
    too_many_files_label: core.getInput('too_many_files_label'),
    too_many_lines_label: core.getInput('too_many_lines_label'),
    excessive_changes_label: core.getInput('excessive_changes_label'),
    skip_draft_pr: core.getInput('skip_draft_pr'),
    comment_on_pr: core.getInput('comment_on_pr'),
    fail_on_large_files: core.getInput('fail_on_large_files'),
    fail_on_too_many_files: core.getInput('fail_on_too_many_files'),
    fail_on_pr_size: core.getInput('fail_on_pr_size'),
    enable_summary: core.getInput('enable_summary'),
    additional_exclude_patterns: core.getInput('additional_exclude_patterns'),
    enable_directory_labeling: core.getInput('enable_directory_labeling'),
    directory_labeler_config_path: core.getInput('directory_labeler_config_path'),
    max_labels: core.getInput('max_labels'),
    use_default_excludes: core.getInput('use_default_excludes'),
  };

  const normalizedResult = normalizeActionInputStrings(rawInputs);
  if (normalizedResult.isErr()) {
    return err(normalizedResult.error);
  }

  const normalized = normalizedResult.value;

  return ok({
    ...normalized,
    language,
    githubToken,
  });
}
