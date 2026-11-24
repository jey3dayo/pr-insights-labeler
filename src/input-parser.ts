import * as core from '@actions/core';
import { err, ok, type Result } from 'neverthrow';

import type { ConfigurationError, ParseError } from './errors/index.js';
import { createConfigurationError } from './errors/index.js';
import {
  type ActionInputStrings,
  normalizeActionInputStrings,
  type NormalizedActionInputs,
} from './input/input-normalizer.js';

export interface ParsedInputs extends NormalizedActionInputs {
  language: string | undefined;
  githubToken: string;
}

export function parseActionInputs(): Result<ParsedInputs, ConfigurationError | ParseError> {
  const rawLanguage = core.getInput('language');
  const language = rawLanguage || undefined;

  const githubToken = core.getInput('github_token');
  if (!githubToken) {
    return err(createConfigurationError('github_token', undefined, 'GitHub token is required'));
  }

  const rawInputs: ActionInputStrings = {
    file_size_limit: core.getInput('file_size_limit'),
    file_size_limit_enabled: core.getInput('file_size_limit_enabled'),
    file_lines_limit: core.getInput('file_lines_limit'),
    file_lines_limit_enabled: core.getInput('file_lines_limit_enabled'),
    pr_additions_limit: core.getInput('pr_additions_limit'),
    pr_additions_limit_enabled: core.getInput('pr_additions_limit_enabled'),
    pr_files_limit: core.getInput('pr_files_limit'),
    pr_files_limit_enabled: core.getInput('pr_files_limit_enabled'),
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
