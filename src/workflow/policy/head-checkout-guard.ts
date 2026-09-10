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

/** Configuration field reported on guard failures. */
const HEAD_CHECKOUT_FIELD = 'head_checkout';

/**
 * Outcome of the guard.
 *
 * - `skipped`: the event is not `pull_request_target`; the checkout is not constrained
 * - `verified`: the local checkout is the head revision recorded in the event payload
 */
export type HeadCheckoutVerification = { status: 'skipped' } | { status: 'verified'; revision: string };

/**
 * Reads the revision currently checked out in `workspace`.
 *
 * Returns `undefined` when the revision cannot be determined (workspace unset, not a repository,
 * git unavailable). The failure is not swallowed: `evaluateHeadCheckout` turns it into a
 * fail-closed `AppError` that the stage propagates, because an unverifiable checkout is exactly
 * the situation the guard must refuse.
 */
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
  /** `GITHUB_EVENT_NAME`, read by the caller. */
  eventName: string | undefined;
  /** Head SHA recorded in the event payload. */
  expectedHeadSha: string;
  /** `GITHUB_WORKSPACE`, read by the caller; reported in the error message. */
  workspace: string | undefined;
  /** Raw output of `git rev-parse HEAD`, or `undefined` when unavailable. */
  localHeadRevision: string | undefined;
}

/**
 * Decides whether analysis may proceed. Pure: trims the raw git output and compares.
 */
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

/**
 * Reads the local revision (only when the event requires it) and applies {@link evaluateHeadCheckout}.
 */
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
