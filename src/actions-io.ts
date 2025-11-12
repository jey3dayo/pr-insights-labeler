/**
 * GitHub Actions I/O interface
 * Handles input/output operations and logging for the action
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { err, ok, Result } from 'neverthrow';

import { VIOLATION_LABELS } from './configs/label-defaults.js';
import type { ConfigurationError } from './errors/index.js';
import { createConfigurationError } from './errors/index.js';
import { isInitialized, t } from './i18n.js';

/**
 * Action input parameters (snake_case from action.yml)
 */
export interface ActionInputs {
  github_token: string;
  file_size_limit: string;
  file_lines_limit: string;
  pr_additions_limit: string;
  pr_files_limit: string;
  auto_remove_labels: string;
  // PR Insights Labeler - Selective Label Enabling
  size_enabled: string;
  size_thresholds: string;
  complexity_enabled: string;
  complexity_thresholds: string;
  category_enabled: string;
  risk_enabled: string;
  large_files_label: string;
  too_many_files_label: string;
  too_many_lines_label: string;
  excessive_changes_label: string;
  skip_draft_pr: string;
  comment_on_pr: string;
  // Label-Based Workflow Failure Control
  fail_on_large_files: string; // "" | "true" | "false"
  fail_on_too_many_files: string; // "" | "true" | "false"
  fail_on_pr_size: string; // "" | "small" | "medium" | "large" | "xlarge" | "xxlarge"
  enable_summary: string;
  additional_exclude_patterns: string;
  // Directory-Based Labeling
  enable_directory_labeling: string;
  directory_labeler_config_path: string;
  max_labels: string;
  use_default_excludes: string;
  // i18n Support
  language: string;
}

/**
 * Action output parameters
 */
export interface ActionOutputs {
  large_files: string; // JSON array of files exceeding limits
  pr_additions: string; // Total lines added in PR
  pr_files: string; // Total number of files in PR
  exceeds_file_size: string; // "true" | "false"
  exceeds_file_lines: string; // "true" | "false"
  exceeds_additions: string; // "true" | "false"
  exceeds_file_count: string; // "true" | "false"
  has_violations: string; // "true" | "false"
}

/**
 * Get environment variable (abstraction for testability)
 */
export function getEnvVar(key: string): string | undefined {
  return process.env[key];
}

/**
 * Resolve token value from input or environment variables
 * Priority: input parameter > GITHUB_TOKEN > GH_TOKEN
 * @internal
 */
function resolveTokenValue(): string | undefined {
  return core.getInput('github_token') || getEnvVar('GITHUB_TOKEN') || getEnvVar('GH_TOKEN');
}

/**
 * Get GitHub token from input or environment variables
 * Priority: input parameter > GITHUB_TOKEN > GH_TOKEN
 */
export function getGitHubToken(): Result<string, ConfigurationError> {
  const token = resolveTokenValue();

  if (!token) {
    return err(
      createConfigurationError(
        'github_token',
        undefined,
        'GitHub token is required. Set github_token input or GITHUB_TOKEN/GH_TOKEN environment variable',
      ),
    );
  }

  // Mark token as secret to prevent it from being logged
  core.setSecret(token);
  return ok(token);
}

/**
 * Get all action inputs with defaults
 */
export function getActionInputs(): ActionInputs {
  return {
    github_token: resolveTokenValue() || '',
    file_size_limit: core.getInput('file_size_limit') || '100KB',
    file_lines_limit: core.getInput('file_lines_limit') || '500',
    pr_additions_limit: core.getInput('pr_additions_limit') || '5000',
    pr_files_limit: core.getInput('pr_files_limit') || '50',
    auto_remove_labels: core.getInput('auto_remove_labels') || 'true',
    // PR Insights Labeler - Selective Label Enabling
    size_enabled: core.getInput('size_enabled') || 'true',
    size_thresholds: core.getInput('size_thresholds') || '{"small": 100, "medium": 500, "large": 1000}',
    complexity_enabled: core.getInput('complexity_enabled') || 'false',
    complexity_thresholds: core.getInput('complexity_thresholds') || '{"medium": 15, "high": 30}',
    category_enabled: core.getInput('category_enabled') || 'true',
    risk_enabled: core.getInput('risk_enabled') || 'true',
    large_files_label: core.getInput('large_files_label') || VIOLATION_LABELS.largeFiles,
    too_many_files_label: core.getInput('too_many_files_label') || VIOLATION_LABELS.tooManyFiles,
    too_many_lines_label: core.getInput('too_many_lines_label') || VIOLATION_LABELS.tooManyLines,
    excessive_changes_label: core.getInput('excessive_changes_label') || VIOLATION_LABELS.excessiveChanges,
    skip_draft_pr: core.getInput('skip_draft_pr') || 'true',
    comment_on_pr: core.getInput('comment_on_pr') || 'auto',
    // Label-Based Workflow Failure Control
    fail_on_large_files: core.getInput('fail_on_large_files') || '',
    fail_on_too_many_files: core.getInput('fail_on_too_many_files') || '',
    fail_on_pr_size: core.getInput('fail_on_pr_size') || '',
    enable_summary: core.getInput('enable_summary') || 'true',
    additional_exclude_patterns: core.getInput('additional_exclude_patterns') || '',
    // Directory-Based Labeling
    enable_directory_labeling: core.getInput('enable_directory_labeling') || 'false',
    directory_labeler_config_path: core.getInput('directory_labeler_config_path') || '.github/directory-labeler.yml',
    max_labels: core.getInput('max_labels') || '10',
    use_default_excludes: core.getInput('use_default_excludes') || 'true',
    // i18n Support
    language: core.getInput('language') || 'en',
  };
}

/**
 * Set action output values
 */
export function setActionOutputs(outputs: ActionOutputs): void {
  core.setOutput('large_files', outputs.large_files);
  core.setOutput('pr_additions', outputs.pr_additions);
  core.setOutput('pr_files', outputs.pr_files);
  core.setOutput('exceeds_file_size', outputs.exceeds_file_size);
  core.setOutput('exceeds_file_lines', outputs.exceeds_file_lines);
  core.setOutput('exceeds_additions', outputs.exceeds_additions);
  core.setOutput('exceeds_file_count', outputs.exceeds_file_count);
  core.setOutput('has_violations', outputs.has_violations);
}

/**
 * Log info message
 */
export function logInfo(message: string): void {
  core.info(message);
}

/**
 * 未初期化時にキーとパラメータを安全に文字列化するフォールバック
 */
function formatFallbackMessage(key: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) {
    return key;
  }

  try {
    return `${key}: ${JSON.stringify(params)}`;
  } catch (_error) {
    return key;
  }
}

/**
 * Log debug message
 */
export function logDebug(message: string): void {
  core.debug(message);
}

/**
 * Log warning message
 */
export function logWarning(message: string): void {
  core.warning(message);
}

/**
 * Log error message
 */
export function logError(message: string): void {
  core.error(message);
}

/**
 * Set action as failed
 */
export function setFailed(message: string): void {
  core.setFailed(message);
}

/**
 * Get pull request context from GitHub Actions
 * Uses @actions/github context for reliable PR information
 */
export function getPullRequestContext(): {
  owner: string;
  repo: string;
  pullNumber: number;
  baseSha: string;
  headSha: string;
  isDraft: boolean;
} {
  const context = github.context;
  const pullRequest = context.payload.pull_request;

  if (!pullRequest) {
    throw new Error(
      'This action must be run in the context of a pull request. ' +
        'Ensure the workflow is triggered by pull_request or pull_request_target events.',
    );
  }

  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pullNumber: pullRequest.number,
    baseSha: pullRequest['base'].sha,
    headSha: pullRequest['head'].sha,
    isDraft: pullRequest['draft'] === true,
  };
}

/**
 * i18n対応のログ出力ヘルパー（情報ログ）
 *
 * @param key - 翻訳キー（例: 'initialization.starting'）
 * @param params - 補間変数（オプション）
 *
 * @example
 * logInfoI18n('initialization.starting');
 * logInfoI18n('initialization.analyzingPr', { prNumber: 123, owner: 'user', repo: 'test-repo' });
 */
export function logInfoI18n(key: string, params?: Record<string, unknown>): void {
  if (!isInitialized()) {
    // i18n未初期化時はキーをそのまま出力（フォールバック）
    logInfo(formatFallbackMessage(key, params));
    return;
  }
  const message = t('logs', key, params);
  core.info(message);
}

/**
 * i18n対応のログ出力ヘルパー（警告ログ）
 *
 * @param key - 翻訳キー（例: 'initialization.i18nFailed'）
 * @param params - 補間変数（オプション）
 *
 * @example
 * logWarningI18n('initialization.i18nFailed', { message: 'Invalid JSON' });
 */
export function logWarningI18n(key: string, params?: Record<string, unknown>): void {
  if (!isInitialized()) {
    logWarning(formatFallbackMessage(key, params));
    return;
  }
  const message = t('logs', key, params);
  core.warning(message);
}

/**
 * i18n対応のログ出力ヘルパー（エラーログ）
 *
 * @param key - 翻訳キー（例: 'completion.failed'）
 * @param params - 補間変数（オプション）
 *
 * @example
 * logErrorI18n('completion.failed', { message: 'Network error' });
 */
export function logErrorI18n(key: string, params?: Record<string, unknown>): void {
  if (!isInitialized()) {
    logError(formatFallbackMessage(key, params));
    return;
  }
  const message = t('logs', key, params);
  core.error(message);
}

/**
 * i18n対応のログ出力ヘルパー（デバッグログ）
 *
 * @param key - 翻訳キー（例: 'analysis.gettingDiff'）
 * @param params - 補間変数（オプション）
 *
 * @example
 * logDebugI18n('analysis.gettingDiff');
 */
export function logDebugI18n(key: string, params?: Record<string, unknown>): void {
  if (!isInitialized()) {
    logDebug(formatFallbackMessage(key, params));
    return;
  }
  const message = t('logs', key, params);
  core.debug(message);
}
