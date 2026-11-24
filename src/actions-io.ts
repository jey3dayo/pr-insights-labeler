import * as core from '@actions/core';
import * as github from '@actions/github';
import { err, ok, Result } from 'neverthrow';

import { VIOLATION_LABELS } from './configs/label-defaults.js';
import type { ConfigurationError } from './errors/index.js';
import { createConfigurationError } from './errors/index.js';
import { isInitialized, t } from './i18n.js';

export interface ActionInputs {
  github_token: string;
  file_size_limit: string;
  file_size_limit_enabled: string;
  file_lines_limit: string;
  file_lines_limit_enabled: string;
  pr_additions_limit: string;
  pr_additions_limit_enabled: string;
  pr_files_limit: string;
  pr_files_limit_enabled: string;
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
  fail_on_large_files: string;
  fail_on_too_many_files: string;
  fail_on_pr_size: string;
  enable_summary: string;
  additional_exclude_patterns: string;
  enable_directory_labeling: string;
  directory_labeler_config_path: string;
  max_labels: string;
  use_default_excludes: string;
  language: string;
}

export interface ActionOutputs {
  large_files: string;
  pr_additions: string;
  pr_files: string;
  exceeds_file_size: string;
  exceeds_file_lines: string;
  exceeds_additions: string;
  exceeds_file_count: string;
  has_violations: string;
}

export function getEnvVar(key: string): string | undefined {
  return process.env[key];
}

function resolveTokenValue(): string | undefined {
  return core.getInput('github_token') || getEnvVar('GITHUB_TOKEN') || getEnvVar('GH_TOKEN');
}

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

  core.setSecret(token);
  return ok(token);
}

function getInput(name: string, defaultValue: string): string {
  return core.getInput(name) || defaultValue;
}

export function getActionInputs(): ActionInputs {
  return {
    github_token: resolveTokenValue() || '',
    file_size_limit: getInput('file_size_limit', '100KB'),
    file_size_limit_enabled: getInput('file_size_limit_enabled', 'true'),
    file_lines_limit: getInput('file_lines_limit', '500'),
    file_lines_limit_enabled: getInput('file_lines_limit_enabled', 'true'),
    pr_additions_limit: getInput('pr_additions_limit', '5000'),
    pr_additions_limit_enabled: getInput('pr_additions_limit_enabled', 'true'),
    pr_files_limit: getInput('pr_files_limit', '50'),
    pr_files_limit_enabled: getInput('pr_files_limit_enabled', 'true'),
    size_enabled: getInput('size_enabled', 'true'),
    size_thresholds: getInput('size_thresholds', '{"small": 100, "medium": 500, "large": 1000}'),
    complexity_enabled: getInput('complexity_enabled', 'false'),
    complexity_thresholds: getInput('complexity_thresholds', '{"medium": 15, "high": 30}'),
    category_enabled: getInput('category_enabled', 'true'),
    risk_enabled: getInput('risk_enabled', 'true'),
    large_files_label: getInput('large_files_label', VIOLATION_LABELS.largeFiles),
    too_many_files_label: getInput('too_many_files_label', VIOLATION_LABELS.tooManyFiles),
    too_many_lines_label: getInput('too_many_lines_label', VIOLATION_LABELS.tooManyLines),
    excessive_changes_label: getInput('excessive_changes_label', VIOLATION_LABELS.excessiveChanges),
    skip_draft_pr: getInput('skip_draft_pr', 'true'),
    comment_on_pr: getInput('comment_on_pr', 'auto'),
    fail_on_large_files: getInput('fail_on_large_files', ''),
    fail_on_too_many_files: getInput('fail_on_too_many_files', ''),
    fail_on_pr_size: getInput('fail_on_pr_size', ''),
    enable_summary: getInput('enable_summary', 'true'),
    additional_exclude_patterns: getInput('additional_exclude_patterns', ''),
    enable_directory_labeling: getInput('enable_directory_labeling', 'false'),
    directory_labeler_config_path: getInput('directory_labeler_config_path', '.github/directory-labeler.yml'),
    max_labels: getInput('max_labels', '10'),
    use_default_excludes: getInput('use_default_excludes', 'true'),
    language: getInput('language', 'en'),
  };
}

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

export function logInfo(message: string): void {
  core.info(message);
}

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

export function logDebug(message: string): void {
  core.debug(message);
}

export function logWarning(message: string): void {
  core.warning(message);
}

export function logError(message: string): void {
  core.error(message);
}

export function setFailed(message: string): void {
  core.setFailed(message);
}

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

export function logInfoI18n(key: string, params?: Record<string, unknown>): void {
  if (!isInitialized()) {
    logInfo(formatFallbackMessage(key, params));
    return;
  }
  const message = t('logs', key, params);
  core.info(message);
}

export function logWarningI18n(key: string, params?: Record<string, unknown>): void {
  if (!isInitialized()) {
    logWarning(formatFallbackMessage(key, params));
    return;
  }
  const message = t('logs', key, params);
  core.warning(message);
}

export function logErrorI18n(key: string, params?: Record<string, unknown>): void {
  if (!isInitialized()) {
    logError(formatFallbackMessage(key, params));
    return;
  }
  const message = t('logs', key, params);
  core.error(message);
}

export function logDebugI18n(key: string, params?: Record<string, unknown>): void {
  if (!isInitialized()) {
    logDebug(formatFallbackMessage(key, params));
    return;
  }
  const message = t('logs', key, params);
  core.debug(message);
}
