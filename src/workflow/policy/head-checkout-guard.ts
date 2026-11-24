/**
 * Fail-closed guard ensuring the local checkout is the PR head under `pull_request_target`.
 *
 * Policy files are read from base over the API (see `policy-config-ref.ts`), but the analyzed
 * *file contents* come from the local checkout: `file-metrics/file-size-service.ts` probes the
 * local filesystem first and complexity analysis only ever reads local files. Under
 * `pull_request_target` the runner checks out base by default, so a workflow whose explicit PR
 * head checkout did not take effect would silently measure base instead of the PR — the exact
 * defect this trust-boundary change fixed. A warning cannot protect correctness here, so a
 * mismatch fails the action before any diff or file analysis runs.
 *
 * The guard is limited to `pull_request_target` on purpose: for `pull_request`, `actions/checkout`
 * legitimately checks out the merge commit, so HEAD differing from the event's head SHA is normal.
 *
 * `evaluateHeadCheckout` stays a pure function (no env access, no logging, no process spawning) so
 * the trust decision is testable without a real repository; the caller reads `GITHUB_EVENT_NAME`
 * and `GITHUB_WORKSPACE`, logs the outcome, and `readLocalHeadRevision` is injectable.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { err, ok, type Result } from 'neverthrow';

import type { AppError } from '../../errors/index.js';
import { createConfigurationError } from '../../errors/index.js';
import { t } from '../../i18n.js';
import { PULL_REQUEST_TARGET_EVENT } from './policy-config-ref.js';

const execFileAsync = promisify(execFile);

const HEAD_CHECKOUT_FIELD = 'head_checkout';

export type HeadCheckoutVerification = { status: 'skipped' } | { status: 'verified'; revision: string };

export type LocalHeadRevisionReader = (workspace: string | undefined) => Promise<string | undefined>;

export const readLocalHeadRevision: LocalHeadRevisionReader = async workspace => {
  if (!workspace) {
    return undefined;
  }

  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: workspace });
    return stdout;
  } catch {
    return undefined;
  }
};

export interface HeadCheckoutGuardInput {
  eventName: string | undefined;
  expectedHeadSha: string;
  workspace: string | undefined;
  localHeadRevision: string | undefined;
}

export function evaluateHeadCheckout(input: HeadCheckoutGuardInput): Result<HeadCheckoutVerification, AppError> {
  const { eventName, expectedHeadSha, workspace, localHeadRevision } = input;

  if (eventName !== PULL_REQUEST_TARGET_EVENT) {
    return ok({ status: 'skipped' });
  }

  const expected = expectedHeadSha.trim();
  if (!expected) {
    return err(
      createConfigurationError(HEAD_CHECKOUT_FIELD, undefined, t('errors', 'analysis.headCheckoutHeadShaMissing')),
    );
  }

  const actual = localHeadRevision?.trim();
  if (!actual) {
    return err(
      createConfigurationError(
        HEAD_CHECKOUT_FIELD,
        undefined,
        t('errors', 'analysis.headCheckoutUnavailable', { expected, workspace: workspace ?? '(unset)' }),
      ),
    );
  }

  if (actual !== expected) {
    return err(
      createConfigurationError(
        HEAD_CHECKOUT_FIELD,
        actual,
        t('errors', 'analysis.headCheckoutMismatch', { expected, actual }),
      ),
    );
  }

  return ok({ status: 'verified', revision: actual });
}

export async function verifyHeadCheckout(
  input: Omit<HeadCheckoutGuardInput, 'localHeadRevision'>,
  readHeadRevision: LocalHeadRevisionReader = readLocalHeadRevision,
): Promise<Result<HeadCheckoutVerification, AppError>> {
  if (input.eventName !== PULL_REQUEST_TARGET_EVENT) {
    return evaluateHeadCheckout({ ...input, localHeadRevision: undefined });
  }

  const localHeadRevision = await readHeadRevision(input.workspace);
  return evaluateHeadCheckout({ ...input, localHeadRevision });
}
