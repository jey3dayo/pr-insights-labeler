import * as github from '@actions/github';

import { logDebugI18n, logErrorI18n, logInfoI18n, logWarning, logWarningI18n } from '../../actions-io';
import { getCIStatus } from '../../ci-status.js';
import { DEFAULT_CATEGORIES } from '../../configs/categories.js';
import { convertCategoriesToDirectoryConfig } from '../../directory-labeler/category-to-directory-config.js';
import { loadDirectoryLabelerConfig } from '../../directory-labeler/config-loader.js';
import { decideLabelsForFiles, filterByMaxLabels } from '../../directory-labeler/decision-engine.js';
import { applyDirectoryLabels } from '../../directory-labeler/label-applicator.js';
import type { AppError } from '../../errors/index.js';
import {
  createGitHubAPIError,
  createRateLimitError,
  ensureError,
  extractErrorStatus,
  ResultAsync,
  toAppError,
} from '../../errors/index.js';
import { applyLabels } from '../../label-applicator';
import { decideLabels } from '../../label-decision-engine';
import type { PRContext } from '../../types';
import { hasProperty, isNumber, isObject, isRecord, isString } from '../../utils/type-guards.js';
import type { AnalysisArtifacts, InitializationArtifacts } from '../types';

/**
 * Apply PR labels including directory-based labeling
 */
export function applyLabelsStage(
  context: InitializationArtifacts,
  artifacts: AnalysisArtifacts,
): ResultAsync<AnalysisArtifacts, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const { token, prContext, config, labelerConfig } = context;
      const { analysis, files, complexityMetrics } = artifacts;

      logInfoI18n('labels.decidingLabels');
      const prMetrics = {
        totalAdditions: analysis.metrics.totalAdditions,
        excludedAdditions: analysis.metrics.excludedAdditions,
        files: analysis.metrics.filesAnalyzed,
        allFiles: analysis.metrics.allFiles, // カテゴリラベル判定用の全ファイルパス
        ...(complexityMetrics && { complexity: complexityMetrics }),
      };

      const octokit = github.getOctokit(token);
      const extendedPRContext: PRContext = {
        owner: prContext.owner,
        repo: prContext.repo,
        pullNumber: prContext.pullNumber,
      };

      const useCiStatus = labelerConfig.risk.use_ci_status ?? true;
      if (useCiStatus) {
        logInfoI18n('ciStatus.fetching');
        const ciStatusResult = await getCIStatus(octokit, prContext.owner, prContext.repo, prContext.headSha);
        if (ciStatusResult.isOk()) {
          const ciStatus = ciStatusResult.value;
          if (ciStatus) {
            extendedPRContext.ciStatus = ciStatus;
            logInfoI18n('ciStatus.status', {
              tests: ciStatus.tests,
              typeCheck: ciStatus.typeCheck,
              build: ciStatus.build,
              lint: ciStatus.lint,
            });
          } else {
            logInfoI18n('ciStatus.notAvailable');
          }
        } else {
          logInfoI18n('ciStatus.notAvailable');
          logWarning(`CI status unavailable: ${ciStatusResult.error.message}`);
        }

        const commitMessagesResult = await fetchCommitMessages(
          octokit,
          prContext.owner,
          prContext.repo,
          prContext.pullNumber,
        );
        if (commitMessagesResult.isOk()) {
          const messages = commitMessagesResult.value;
          extendedPRContext.commitMessages = messages;
          logInfoI18n('ciStatus.fetchedCommits', { count: messages.length });
        } else {
          logInfoI18n('ciStatus.fetchCommitsFailed');
          logWarning(`Failed to fetch commit messages: ${commitMessagesResult.error.message}`);
        }
      }

      const labelerDecisions = decideLabels(prMetrics, labelerConfig, analysis.violations, extendedPRContext);
      if (labelerDecisions.isOk()) {
        const decisions = labelerDecisions.value;
        logInfoI18n('labels.labelsToAdd', { labels: decisions.labelsToAdd.join(', ') || 'none' });
        logInfoI18n('labels.labelsToRemove', { labels: decisions.labelsToRemove.join(', ') || 'none' });

        // Store label decisions in artifacts for Summary generation
        artifacts.labelDecisions = decisions;

        if (labelerConfig.runtime.dry_run) {
          logInfoI18n('labels.dryRun');
        } else {
          logInfoI18n('labels.applying');
          const applyResult = await applyLabels(
            token,
            {
              owner: prContext.owner,
              repo: prContext.repo,
              pullNumber: prContext.pullNumber,
            },
            decisions,
            labelerConfig.labels,
          );

          if (applyResult.isErr()) {
            if (applyResult.error.status === 403) {
              logWarningI18n('labels.skipped');
            } else if (labelerConfig.runtime.fail_on_error) {
              logErrorI18n('labels.applyFailed', { message: applyResult.error.message });
              throw applyResult.error;
            } else {
              logWarningI18n('labels.applyFailed', { message: applyResult.error.message });
            }
          } else {
            const update = applyResult.value;
            logInfoI18n('labels.applied', { added: update.added.length, removed: update.removed.length });
            logInfoI18n('labels.apiCalls', { count: update.apiCalls });
          }
        }
      }

      if (!config.enableDirectoryLabeling) {
        return artifacts;
      }

      logInfoI18n('directoryLabeling.starting');
      const dirConfigResult = loadDirectoryLabelerConfig(config.directoryLabelerConfigPath);

      let dirConfig;
      if (dirConfigResult.isErr()) {
        if (dirConfigResult.error.type === 'FileSystemError') {
          // Configuration file not found, use DEFAULT_CATEGORIES as fallback
          logInfoI18n('directoryLabeling.configNotFound', { path: config.directoryLabelerConfigPath });
          logInfoI18n('directoryLabeling.usingDefaultCategories');
          dirConfig = convertCategoriesToDirectoryConfig(DEFAULT_CATEGORIES);
        } else {
          logWarningI18n('directoryLabeling.configLoadFailed', { message: dirConfigResult.error.message });
          logInfoI18n('directoryLabeling.skipped');
          return artifacts;
        }
      } else {
        dirConfig = dirConfigResult.value;
      }
      dirConfig.useDefaultExcludes = config.useDefaultExcludes;

      const fileList = files.map(file => file.filename);
      const directoryDecisionsResult = decideLabelsForFiles(fileList, dirConfig);

      if (directoryDecisionsResult.isErr()) {
        logWarningI18n('directoryLabeling.decideFailed', { message: directoryDecisionsResult.error.message });
        return artifacts;
      }

      const directoryDecisions = directoryDecisionsResult.value;

      if (directoryDecisions.length === 0) {
        logInfoI18n('directoryLabeling.noLabelsMatched');
        return artifacts;
      }

      logInfoI18n('directoryLabeling.decided', { count: directoryDecisions.length });

      const { selected, rejected } = filterByMaxLabels(directoryDecisions, config.maxLabels);

      if (rejected.length > 0) {
        logWarningI18n('directoryLabeling.rejected', { count: rejected.length });
        for (const rejectedDecision of rejected) {
          logDebugI18n('directoryLabeling.rejectedDetail', {
            label: rejectedDecision.label,
            reason: rejectedDecision.reason,
          });
        }
      }

      const applyDirectoryResult = await applyDirectoryLabels(
        octokit,
        {
          repo: {
            owner: prContext.owner,
            repo: prContext.repo,
          },
          issue: {
            number: prContext.pullNumber,
          },
        },
        selected,
        dirConfig.namespaces || { exclusive: ['size', 'area', 'type'], additive: ['scope', 'meta'] },
      );

      if (applyDirectoryResult.isErr()) {
        if (applyDirectoryResult.error.type === 'PermissionError') {
          logWarningI18n('directoryLabeling.permissionError', { message: applyDirectoryResult.error.message });
          logWarningI18n('directoryLabeling.permissionHint');
        } else {
          logWarningI18n('directoryLabeling.applyFailed', { message: applyDirectoryResult.error.message });
        }
        return artifacts;
      }

      const result = applyDirectoryResult.value;
      logInfoI18n('directoryLabeling.applyResult', {
        applied: result.applied.length,
        skipped: result.skipped.length,
        removed: result.removed?.length || 0,
        failed: result.failed.length,
      });

      if (result.failed.length > 0) {
        for (const failed of result.failed) {
          logWarningI18n('directoryLabeling.failedDetail', { label: failed.label, reason: failed.reason });
        }
      }

      return artifacts;
    })(),
    toAppError,
  );
}

function fetchCommitMessages(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  pullNumber: number,
): ResultAsync<string[], AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const commits = await octokit.paginate(
        octokit.rest.pulls.listCommits,
        {
          owner,
          repo,
          pull_number: pullNumber,
          per_page: 100,
        },
        response => response.data,
      );

      const messages: string[] = [];
      for (const commit of commits) {
        const msg = commit.commit.message;
        if (msg !== null && msg !== undefined) {
          const subject = msg.split('\n')[0];
          if (subject) {
            messages.push(subject);
          }
        }
      }
      return messages;
    })(),
    error => {
      const ensured = ensureError(error);
      const status = extractErrorStatus(error);
      if (status === 429 || (status === 403 && /rate limit|abuse/i.test(ensured.message))) {
        return createRateLimitError(parseRetryAfterSeconds(error));
      }
      return createGitHubAPIError(`Failed to fetch commit messages: ${ensured.message}`, status);
    },
  );
}

function parseRetryAfterSeconds(error: unknown): number | undefined {
  if (!isObject(error) || !hasProperty(error, 'response')) {
    return undefined;
  }
  const response = error.response;
  if (!isObject(response) || !hasProperty(response, 'headers') || !isRecord(response.headers)) {
    return undefined;
  }
  const headers = response.headers as Record<string, unknown>;
  const retryAfterRaw = headers['retry-after'] ?? headers['Retry-After'];
  if (isString(retryAfterRaw)) {
    const parsed = Number.parseInt(retryAfterRaw, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (isNumber(retryAfterRaw)) {
    return retryAfterRaw;
  }
  return undefined;
}
