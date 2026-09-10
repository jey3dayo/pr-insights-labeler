import * as path from 'node:path';

import { ResultAsync } from 'neverthrow';

import {
  getEnvVar,
  logDebug,
  logError,
  logErrorI18n,
  logInfo,
  logInfoI18n,
  logWarning,
  logWarningI18n,
} from '../../actions-io';
import { createComplexityAnalyzer } from '../../complexity-analyzer';
import { getDiffFiles } from '../../diff-strategy';
import type { AppError } from '../../errors/index.js';
import { toAppError } from '../../errors/index.js';
import { analyzeFiles } from '../../file-metrics';
import { t } from '../../i18n.js';
import { verifyHeadCheckout } from '../policy/head-checkout-guard.js';
import type { AnalysisArtifacts, InitializationArtifacts } from '../types';

/**
 * Refuse to analyze a tree other than the PR head recorded in the event payload.
 *
 * Runs before any diff retrieval or file analysis: the analyzers read the local checkout, so a
 * checkout that is not the PR head would produce metrics for the wrong tree. See
 * `../policy/head-checkout-guard.js` for why this is fail-closed and limited to
 * `pull_request_target`.
 */
async function assertLocalCheckoutIsPrHead(headSha: string): Promise<void> {
  const verification = await verifyHeadCheckout({
    eventName: getEnvVar('GITHUB_EVENT_NAME'),
    expectedHeadSha: headSha,
    workspace: getEnvVar('GITHUB_WORKSPACE'),
  });

  if (verification.isErr()) {
    logError(verification.error.message);
    throw verification.error;
  }

  if (verification.value.status === 'verified') {
    logInfoI18n('analysis.headCheckoutVerified', { revision: verification.value.revision });
  }
}

/**
 * Analyze diff files and optional complexity metrics
 */
export function analyzePullRequest(context: InitializationArtifacts): ResultAsync<AnalysisArtifacts, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      const { token, prContext, config, labelerConfig } = context;

      await assertLocalCheckoutIsPrHead(prContext.headSha);

      logInfoI18n('analysis.gettingDiff');
      const diffResult = await getDiffFiles(
        {
          owner: prContext.owner,
          repo: prContext.repo,
          pullNumber: prContext.pullNumber,
          baseSha: prContext.baseSha,
          headSha: prContext.headSha,
        },
        token,
      );
      if (diffResult.isErr()) {
        throw diffResult.error;
      }

      const { files, strategy } = diffResult.value;
      logInfoI18n('analysis.retrievedFiles', { count: files.length, strategy });

      logInfoI18n('analysis.analyzingFiles');
      const excludePatterns = [...new Set([...config.additionalExcludePatterns, ...labelerConfig.exclude.additional])];
      const analysisResult = await analyzeFiles(
        files,
        {
          fileSizeLimit: config.fileSizeLimit,
          fileSizeLimitEnabled: config.fileSizeLimitEnabled,
          fileLineLimit: config.fileLinesLimit,
          fileLineLimitEnabled: config.fileLinesLimitEnabled,
          prAdditionsLimitEnabled: config.prAdditionsLimitEnabled,
          fileCountLimitEnabled: config.prFilesLimitEnabled,
          maxAddedLines: config.prAdditionsLimit,
          maxFileCount: config.prFilesLimit,
          excludePatterns,
          useDefaultExcludes: config.useDefaultExcludes,
        },
        token,
        {
          owner: prContext.owner,
          repo: prContext.repo,
          headSha: prContext.headSha,
        },
      );
      if (analysisResult.isErr()) {
        throw analysisResult.error;
      }

      const analysis = analysisResult.value;

      logInfoI18n('analysis.analysisComplete');
      logInfoI18n('analysis.filesAnalyzed', { count: analysis.metrics.filesAnalyzed.length });
      logInfoI18n('analysis.filesExcluded', { count: analysis.metrics.filesExcluded.length });
      logInfoI18n('analysis.binaryFilesSkipped', { count: analysis.metrics.filesSkippedBinary.length });
      logInfoI18n('analysis.totalAdditions', { count: analysis.metrics.totalAdditions });

      const hasViolations =
        analysis.violations.largeFiles.length > 0 ||
        analysis.violations.exceedsFileLines.length > 0 ||
        analysis.violations.exceedsAdditions ||
        analysis.violations.exceedsFileCount;

      if (hasViolations) {
        logWarning(`⚠️ ${t('logs', 'violations.detected')}`);
        if (analysis.violations.largeFiles.length > 0) {
          logWarningI18n('violations.largeFiles', { count: analysis.violations.largeFiles.length });
        }
        if (analysis.violations.exceedsFileLines.length > 0) {
          logWarningI18n('violations.exceedsFileLines', { count: analysis.violations.exceedsFileLines.length });
        }
        if (analysis.violations.exceedsAdditions) {
          logWarningI18n('violations.exceedsAdditions');
        }
        if (analysis.violations.exceedsFileCount) {
          logWarningI18n('violations.exceedsFileCount');
        }
      } else {
        logInfo(`✅ ${t('logs', 'violations.allChecksPassed')}`);
      }

      labelerConfig.size.enabled = config.sizeEnabled;
      labelerConfig.size.thresholds = config.sizeThresholds;
      labelerConfig.complexity.enabled = config.complexityEnabled;
      labelerConfig.complexity.thresholds = config.complexityThresholdsV2;
      labelerConfig.categoryLabeling.enabled = config.categoryEnabled;
      labelerConfig.risk.enabled = config.riskEnabled;
      logDebug(
        `  - Enabled flags: size=${config.sizeEnabled}, complexity=${config.complexityEnabled}, category=${config.categoryEnabled}, risk=${config.riskEnabled}`,
      );

      let complexityMetrics = undefined;
      if (labelerConfig.complexity.enabled) {
        logInfoI18n('analysis.complexityAnalyzing');
        const complexityAnalyzer = createComplexityAnalyzer();
        const complexityFiles = analysis.metrics.filesAnalyzed
          .map(file => file.path)
          .filter(filePath => {
            const ext = path.extname(filePath);
            return labelerConfig.complexity.extensions.includes(ext);
          });

        logInfoI18n('analysis.complexityFilesToAnalyze', { count: complexityFiles.length });
        if (complexityFiles.length === 0) {
          logInfoI18n('analysis.complexitySkipped');
        } else {
          const complexityResult = await complexityAnalyzer.analyzeFiles(complexityFiles, {
            extensions: labelerConfig.complexity.extensions,
            exclude: labelerConfig.complexity.exclude,
          });

          if (complexityResult.isOk()) {
            complexityMetrics = complexityResult.value;
            logInfoI18n('analysis.complexityResults', {
              max: complexityMetrics.maxComplexity,
              avg: complexityMetrics.avgComplexity,
              files: complexityMetrics.analyzedFiles,
            });
          } else if (labelerConfig.runtime.fail_on_error) {
            logErrorI18n('analysis.complexityFailed', { message: complexityResult.error.message });
            throw complexityResult.error;
          } else {
            logWarningI18n('analysis.complexityFailed', { message: complexityResult.error.message });
          }
        }
      }

      const artifacts: AnalysisArtifacts = {
        files,
        analysis,
        hasViolations,
        ...(complexityMetrics ? { complexityMetrics } : {}),
      };

      return artifacts;
    })(),
    toAppError,
  );
}
