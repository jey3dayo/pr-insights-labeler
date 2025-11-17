/**
 * Directory-Based Labeler: ラベル適用機能
 *
 * 名前空間ポリシー適用、冪等性保証、GitHub API呼び出し調整を担当
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { err, ok, type Result } from 'neverthrow';

import { DEFAULT_LABEL_COLOR, DEFAULT_LABEL_DESCRIPTION } from '../configs/directory-labeler-defaults.js';
import {
  createGitHubAPIError,
  createPermissionError,
  createRateLimitError,
  ensureError,
  extractErrorStatus,
} from '../errors/index.js';
import { extractNamespace } from '../utils/namespace-utils.js';
import { isNumber, isRecord, isString } from '../utils/type-guards.js';
import type { LabelDecision } from './decision-engine.js';
import type { NamespacePolicy } from './types.js';

type Octokit = ReturnType<typeof github.getOctokit>;

/**
 * PRコンテキスト情報
 */
export interface PullRequestContext {
  repo: {
    owner: string;
    repo: string;
  };
  issue: {
    number: number;
  };
}

/**
 * ラベル適用結果
 */
export interface ApplyResult {
  /** 適用されたラベル */
  applied: string[];
  /** スキップされたラベル（既存重複） */
  skipped: string[];
  /** 削除されたラベル */
  removed?: string[];
  /** 失敗したラベル */
  failed: Array<{ label: string; reason: string }>;
}

interface OctokitErrorResponse {
  response?: {
    headers?: Record<string, unknown>;
  };
}

/**
 * Directory-Based Labelerのラベルを適用
 *
 * Labels are always auto-created if they don't exist (using fixed defaults: color=cccccc, description="")
 *
 * @param octokit - GitHub APIクライアント
 * @param context - PRコンテキスト
 * @param decisions - ラベル決定結果
 * @param namespaces - 名前空間ポリシー
 * @returns 適用結果またはエラー
 */
export async function applyDirectoryLabels(
  octokit: Octokit,
  context: PullRequestContext,
  decisions: LabelDecision[],
  namespaces: Required<NamespacePolicy>,
): Promise<
  Result<
    ApplyResult,
    | ReturnType<typeof createGitHubAPIError>
    | ReturnType<typeof createPermissionError>
    | ReturnType<typeof createRateLimitError>
  >
> {
  const result: ApplyResult = {
    applied: [],
    skipped: [],
    removed: [],
    failed: [],
  };

  // 空のdecisions配列は何もしない
  if (decisions.length === 0) {
    core.debug('No label decisions to apply.');
    return ok(result);
  }

  // 既存ラベルを取得
  let existingLabels: string[];
  try {
    const { data } = await octokit.rest.issues.listLabelsOnIssue({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
    });
    existingLabels = data.map(label => label.name);
    core.debug(`Existing labels: ${existingLabels.join(', ')}`);
  } catch (error) {
    const e = ensureError(error);
    const status = extractErrorStatus(error);

    if (status === 403) {
      return err(createPermissionError('issues: read', `Failed to list labels: ${e.message}`));
    }

    if (status === 429) {
      // Extract Retry-After header if available
      const errorWithResponse = error as OctokitErrorResponse;
      const rawHeaders = errorWithResponse.response?.headers;
      const headers = isRecord(rawHeaders) ? rawHeaders : {};
      const retryAfterHeader = headers['retry-after'] ?? headers['Retry-After'];
      const retryAfter = isString(retryAfterHeader)
        ? Number.parseInt(retryAfterHeader, 10)
        : isNumber(retryAfterHeader)
          ? retryAfterHeader
          : undefined;
      return err(createRateLimitError(Number.isFinite(retryAfter) ? (retryAfter as number) : undefined));
    }

    return err(createGitHubAPIError(`Failed to list labels: ${e.message}`, status));
  }

  // 名前空間ポリシーに基づいて削除すべきラベルを決定
  const labelsToRemove = new Set<string>();
  const newLabels = decisions.map(d => d.label);

  for (const newLabel of newLabels) {
    const namespace = extractNamespace(newLabel, ':');

    // exclusive名前空間の場合、同一名前空間の既存ラベルを削除
    if (namespace && namespaces.exclusive.includes(namespace)) {
      for (const existingLabel of existingLabels) {
        const existingNamespace = extractNamespace(existingLabel, ':');
        if (existingNamespace === namespace && existingLabel !== newLabel) {
          labelsToRemove.add(existingLabel);
        }
      }
    }
  }

  // ラベルを削除
  for (const label of labelsToRemove) {
    try {
      await octokit.rest.issues.removeLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        name: label,
      });
      result.removed?.push(label);
      core.info(`Removed label: ${label}`);
    } catch (error) {
      const e = ensureError(error);
      core.warning(`Failed to remove label "${label}": ${e.message}`);
      result.failed.push({ label, reason: `Failed to remove: ${e.message}` });
    }
  }

  // 追加すべきラベルを決定（既存重複を除外）
  const labelsToAdd = newLabels.filter(label => !existingLabels.includes(label));

  // スキップされたラベルを記録
  for (const label of newLabels) {
    if (existingLabels.includes(label)) {
      result.skipped.push(label);
      core.debug(`Skipped label (already exists): ${label}`);
    }
  }

  // ラベルを追加
  if (labelsToAdd.length > 0) {
    try {
      await octokit.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        labels: labelsToAdd,
      });
      result.applied.push(...labelsToAdd);
      core.info(`Applied labels: ${labelsToAdd.join(', ')}`);
    } catch (error) {
      const e = ensureError(error);
      const status = extractErrorStatus(error);

      // ラベル未存在エラー（422）の場合、常にラベルを作成
      if (status === 422) {
        core.info('Some labels do not exist. Attempting to create them...');
        await createMissingLabels(octokit, context, labelsToAdd, result);
      } else {
        // その他のエラーは失敗として記録
        for (const label of labelsToAdd) {
          result.failed.push({ label, reason: e.message });
        }
        core.error(`Failed to add labels: ${e.message}`);
      }
    }
  }

  core.debug(
    `Applied: ${result.applied.length}, Skipped: ${result.skipped.length}, Removed: ${result.removed?.length ?? 0}, Failed: ${result.failed.length}`,
  );
  return ok(result);
}

/**
 * 未存在のラベルを作成して追加
 *
 * Labels are created with fixed defaults: color=cccccc, description=""
 */
async function createMissingLabels(
  octokit: Octokit,
  context: PullRequestContext,
  labels: string[],
  result: ApplyResult,
): Promise<void> {
  for (const label of labels) {
    // 1) Try to add the label individually (handles labels that already exist in the repo)
    try {
      await octokit.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        labels: [label],
      });
      result.applied.push(label);
      core.info(`Applied label: ${label}`);
      continue; // next label
    } catch (error) {
      const status = extractErrorStatus(error);
      // 422 ⇒ label likely doesn't exist in the repo; try to create
      if (status !== 422) {
        const e = ensureError(error);
        result.failed.push({ label, reason: `Failed to add: ${e.message}` });
        core.warning(`Failed to add label "${label}": ${e.message}`);
        continue;
      }
      // Fall through to create label
    }

    // 2) Create the missing label (ignore 422 already_exists) then add again
    try {
      await octokit.rest.issues.createLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: label,
        color: DEFAULT_LABEL_COLOR,
        description: DEFAULT_LABEL_DESCRIPTION,
      });
      core.info(`Created label: ${label}`);
    } catch (error) {
      const status = extractErrorStatus(error);
      const e = ensureError(error);
      // If it already exists (422), proceed to add; otherwise record failure and continue
      if (status !== 422) {
        result.failed.push({ label, reason: `Failed to create: ${e.message}` });
        core.warning(`Failed to create label "${label}": ${e.message}`);
        continue;
      }
    }

    try {
      await octokit.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        labels: [label],
      });
      result.applied.push(label);
      core.info(`Applied label: ${label}`);
    } catch (error) {
      const e = ensureError(error);
      result.failed.push({ label, reason: `Failed to apply after create: ${e.message}` });
      core.warning(`Failed to apply label "${label}" after create: ${e.message}`);
    }
  }
}
