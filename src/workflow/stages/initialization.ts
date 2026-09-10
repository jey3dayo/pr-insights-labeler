import { ResultAsync } from 'neverthrow';

import { getEnvVar, getPullRequestContext, logInfoI18n, logWarningI18n } from '../../actions-io';
import { buildCompleteConfig } from '../../config-builder.js';
import { getDefaultLabelerConfig, loadConfig } from '../../config-loader';
import { loadEnvironmentConfig } from '../../environment-loader.js';
import type { AppError } from '../../errors/index.js';
import { toAppError } from '../../errors/index.js';
import { initializeI18n } from '../../i18n.js';
import { parseActionInputs } from '../../input-parser.js';
import type { PolicyConfigRefResolution } from '../policy/policy-config-ref.js';
import { resolvePolicyConfigRef } from '../policy/policy-config-ref.js';
import type { InitializationArtifacts, PullRequestRuntimeContext } from '../types';

/**
 * Report which ref the labeling policy was read from, so the trust boundary is visible in logs.
 */
function logPolicyConfigRefResolution(resolution: PolicyConfigRefResolution): void {
  if (resolution.source === 'base') {
    logInfoI18n('initialization.policyConfigFromBase', { ref: resolution.ref });
    return;
  }
  if (resolution.source === 'default') {
    logWarningI18n('initialization.policyConfigBaseShaMissing');
  }
}

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
      const policyConfigRef = resolvePolicyConfigRef(getEnvVar('GITHUB_EVENT_NAME'), prContext);
      logPolicyConfigRefResolution(policyConfigRef);
      const labelerConfigResult = await loadConfig(token, prContext.owner, prContext.repo, policyConfigRef.ref);
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
