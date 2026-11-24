import * as github from '@actions/github';
import { err, ok, Result } from 'neverthrow';

import { logDebug, logInfo } from './actions-io';
import type { GitHubAPIError } from './errors/index.js';
import { createGitHubAPIError, ensureError } from './errors/index.js';
import type { AnalysisResult } from './file-metrics';
import { t } from './i18n';
import {
  formatBasicMetrics,
  formatBestPractices,
  formatFileAnalysis,
  formatImprovementActions,
  formatViolations,
} from './report-formatter';
import type { PRContext } from './types';

export interface CommentConfig {
  commentMode: 'always' | 'auto' | 'never';
}

export interface CommentResult {
  action: 'created' | 'updated' | 'deleted' | 'skipped';
  commentId: number | null;
}

export const COMMENT_SIGNATURE = '<!-- pr-labeler -->';

function hasViolations(analysisResult: AnalysisResult): boolean {
  return (
    analysisResult.violations.largeFiles.length > 0 ||
    analysisResult.violations.exceedsFileLines.length > 0 ||
    analysisResult.violations.exceedsAdditions ||
    analysisResult.violations.exceedsFileCount
  );
}

export function generateCommentBody(analysisResult: AnalysisResult): string {
  const { metrics, violations } = analysisResult;
  const hasViolationsFlag = hasViolations(analysisResult);

  let body = '';

  if (hasViolationsFlag) {
    body += `## 📊 ${t('common', 'comment.headerViolation')}\n\n`;
  } else {
    body += `## ✅ ${t('common', 'comment.headerPassed')}\n\n`;
  }

  const metricsSection = formatBasicMetrics(metrics, { includeTimestamp: false });
  body += metricsSection;

  body += formatViolations(violations);

  if (metrics.filesAnalyzed.length > 0) {
    body += formatFileAnalysis(violations, metrics.filesAnalyzed, 10);
  }

  body += formatImprovementActions(violations);
  body += formatBestPractices(violations, metrics);

  if (metrics.filesWithErrors.length > 0) {
    body += `### ⚠️ ${t('common', 'comment.analysisErrors')}\n\n`;
    body += `${t('common', 'comment.filesNotAnalyzed')}\n\n`;
    for (const file of metrics.filesWithErrors.slice(0, 10)) {
      body += `- ${file}\n`;
    }
    if (metrics.filesWithErrors.length > 10) {
      body += `- ${t('common', 'comment.andMore', { count: metrics.filesWithErrors.length - 10 })}\n`;
    }
    body += '\n';
  }

  body += '---\n';
  body += `*${t('common', 'comment.footer')}*\n`;
  body += COMMENT_SIGNATURE;

  return body;
}

export async function findExistingComment(
  token: string,
  context: PRContext,
): Promise<Result<number | null, GitHubAPIError>> {
  try {
    logDebug(`Searching for existing comment on PR #${context.pullNumber}`);

    const octokit = github.getOctokit(token);

    for await (const { data } of octokit.paginate.iterator(octokit.rest.issues.listComments, {
      owner: context.owner,
      repo: context.repo,
      issue_number: context.pullNumber,
      per_page: 100,
    })) {
      // Search for comment with our signature, posted by a bot account.
      // Restricting to type 'Bot' (rather than a fixed login) blocks third-party
      // spoofing of the signature while still allowing GitHub App-issued tokens,
      // which also post as bot accounts, to be recognized.
      for (const comment of data) {
        if (comment.body?.includes(COMMENT_SIGNATURE) && comment.user?.type === 'Bot') {
          logDebug(`Found existing comment with ID ${comment.id}`);
          return ok(comment.id);
        }
      }
    }

    logDebug('No existing comment found');
    return ok(null);
  } catch (error) {
    const e = ensureError(error);
    return err(createGitHubAPIError(`Failed to find existing comment: ${e.message}`));
  }
}

export async function postComment(
  body: string,
  token: string,
  context: PRContext,
): Promise<Result<number, GitHubAPIError>> {
  try {
    logInfo('Posting new comment on PR');

    const octokit = github.getOctokit(token);
    const response = await octokit.rest.issues.createComment({
      owner: context.owner,
      repo: context.repo,
      issue_number: context.pullNumber,
      body,
    });

    logInfo(`Comment posted successfully (ID: ${response.data.id})`);
    return ok(response.data.id);
  } catch (error) {
    const e = ensureError(error);
    return err(createGitHubAPIError(`Failed to post comment: ${e.message}`));
  }
}

export async function updateComment(
  commentId: number,
  body: string,
  token: string,
  context: PRContext,
): Promise<Result<void, GitHubAPIError>> {
  try {
    logInfo(`Updating comment ${commentId}`);

    const octokit = github.getOctokit(token);
    await octokit.rest.issues.updateComment({
      owner: context.owner,
      repo: context.repo,
      comment_id: commentId,
      body,
    });

    logInfo('Comment updated successfully');
    return ok(undefined);
  } catch (error) {
    const e = ensureError(error);
    return err(createGitHubAPIError(`Failed to update comment: ${e.message}`));
  }
}

export async function deleteComment(
  commentId: number,
  token: string,
  context: PRContext,
): Promise<Result<void, GitHubAPIError>> {
  try {
    logInfo(`Deleting comment ${commentId}`);

    const octokit = github.getOctokit(token);
    await octokit.rest.issues.deleteComment({
      owner: context.owner,
      repo: context.repo,
      comment_id: commentId,
    });

    logInfo('Comment deleted successfully');
    return ok(undefined);
  } catch (error) {
    const e = ensureError(error);
    return err(createGitHubAPIError(`Failed to delete comment: ${e.message}`));
  }
}

export async function manageComment(
  analysisResult: AnalysisResult,
  config: CommentConfig,
  token: string,
  context: PRContext,
): Promise<Result<CommentResult, GitHubAPIError>> {
  const hasViolationsFlag = hasViolations(analysisResult);

  const existingCommentResult = await findExistingComment(token, context);
  if (existingCommentResult.isErr()) {
    return err(existingCommentResult.error);
  }
  const existingCommentId = existingCommentResult.value;

  if (config.commentMode === 'never') {
    return handleSkipOrDelete(existingCommentId, token, context);
  }

  if (config.commentMode === 'auto') {
    if (!hasViolationsFlag) {
      return handleSkipOrDelete(existingCommentId, token, context);
    }
  }

  const commentBody = generateCommentBody(analysisResult);

  if (existingCommentId) {
    const updateResult = await updateComment(existingCommentId, commentBody, token, context);
    if (updateResult.isErr()) {
      return err(updateResult.error);
    }
    return ok({ action: 'updated', commentId: existingCommentId });
  } else {
    const postResult = await postComment(commentBody, token, context);
    if (postResult.isErr()) {
      return err(postResult.error);
    }
    return ok({ action: 'created', commentId: postResult.value });
  }
}

async function handleSkipOrDelete(
  existingCommentId: number | null,
  token: string,
  context: PRContext,
): Promise<Result<CommentResult, GitHubAPIError>> {
  if (!existingCommentId) {
    return ok({ action: 'skipped', commentId: null });
  }

  const deleteResult = await deleteComment(existingCommentId, token, context);
  if (deleteResult.isErr()) {
    return err(deleteResult.error);
  }
  return ok({ action: 'deleted', commentId: existingCommentId });
}
