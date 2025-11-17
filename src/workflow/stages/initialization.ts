import { ResultAsync } from 'neverthrow';

import { getPullRequestContext, logInfoI18n, logWarningI18n } from '../../actions-io';
import { buildCompleteConfig } from '../../config-builder.js';
import { getDefaultLabelerConfig, loadConfig } from '../../config-loader';
import { loadEnvironmentConfig } from '../../environment-loader.js';
import type { AppError } from '../../errors/index.js';
import { toAppError } from '../../errors/index.js';
import { initializeI18n } from '../../i18n.js';
import { parseActionInputs } from '../../input-parser.js';
import type { InitializationArtifacts, PullRequestRuntimeContext } from '../types';

/**
 * Initialize action inputs, configuration, and i18n
 */
export function initializeAction(): ResultAsync<InitializationArtifacts, AppError> {
  return ResultAsync.fromPromise(
    (async () => {
      logInfoI18n('initialization.gettingInputs');
      const parsedInputsResult = parseActionInputs();
      if (parsedInputsResult.isErr()) {
        throw parsedInputsResult.error;
      }
      const parsedInputs = parsedInputsResult.value;

      const token = parsedInputs.githubToken;
      const prContext: PullRequestRuntimeContext = getPullRequestContext();

      logInfoI18n('initialization.analyzingPr', {
        prNumber: prContext.pullNumber,
        owner: prContext.owner,
        repo: prContext.repo,
      });

      const envConfig = loadEnvironmentConfig();

      logInfoI18n('labels.loading');
      const labelerConfigResult = await loadConfig(token, prContext.owner, prContext.repo, prContext.headSha);
      const labelerConfig = labelerConfigResult.unwrapOr(getDefaultLabelerConfig());

      const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

      const i18nResult = initializeI18n(config.language);
      if (i18nResult.isErr()) {
        logWarningI18n('initialization.i18nFailed', { message: i18nResult.error.message });
      }

      const skipDraft = prContext.isDraft && config.skipDraftPr;

      return {
        token,
        prContext,
        config,
        labelerConfig,
        skipDraft,
      } satisfies InitializationArtifacts;
    })(),
    toAppError,
  );
}
