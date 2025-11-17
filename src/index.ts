/**
 * PR Insights Labeler - Main entry point
 * Analyzes pull request files and enforces size limits
 */

import { ResultAsync } from 'neverthrow';

import { logErrorI18n, logInfoI18n, logWarningI18n, setFailed } from './actions-io';
import type { AppError } from './errors/index.js';
import { formatAppError, toAppError } from './errors/index.js';
import { t } from './i18n.js';
import { writeSummary } from './summary/summary-writer';
import { analyzePullRequest, applyLabelsStage, finalizeAction, initializeAction } from './workflow/pipeline';
import type { InitializationArtifacts } from './workflow/types';

/**
 * Main action function orchestrating the workflow pipeline
 */
async function run(): Promise<void> {
  const result = await executeAction();

  if (result.isErr()) {
    const formatted = formatAppError(result.error);
    logErrorI18n('completion.failed', { message: formatted });
    setFailed(formatted);
  }
}

function executeAction(): ResultAsync<void, AppError> {
  return initializeAction().andThen(context => {
    if (context.skipDraft) {
      return handleDraft(context);
    }

    return analyzePullRequest(context)
      .andThen(artifacts => applyLabelsStage(context, artifacts).map(() => artifacts))
      .andThen(artifacts => finalizeAction(context, artifacts));
  });
}

function handleDraft(context: InitializationArtifacts): ResultAsync<void, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      logInfoI18n('draft.skipping');

      if (context.config.enableSummary) {
        const title = t('summary', 'draftPr.title');
        const message = t('summary', 'draftPr.message');
        const summaryResult = await writeSummary(`## ⏭️ ${title}\n\n${message}`);
        if (summaryResult.isErr()) {
          logWarningI18n('draft.summaryWriteFailed', { message: summaryResult.error.message });
        } else {
          logInfoI18n('draft.summaryWritten');
        }
      }

      logInfoI18n('completion.skippedDraft');
    })(),
    toAppError,
  ).map(() => undefined);
}

// Run the action if this is the main module
if (require.main === module) {
  run();
}

// Export for testing
export { executeAction, run };
