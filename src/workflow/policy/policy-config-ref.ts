/**
 * Trust boundary for labeling policy files (`.github/pr-labeler.yml`,
 * `.github/directory-labeler.yml`).
 *
 * Under `pull_request_target` the head ref is fork-controlled while the workflow runs with
 * base repository permissions, so reading policy from head would let a PR rewrite its own
 * policy (e.g. disable `runtime.dry_run`, alter risk paths, relabel its own files). Policy is
 * therefore read from base, and never falls back to head: an unavailable base SHA falls back
 * to the repository default branch instead.
 *
 * The resolver stays a pure function (no env access, no logging) so the trust decision can be
 * tested without environment variables or i18n; callers read `GITHUB_EVENT_NAME` and log the
 * outcome themselves.
 */

export const PULL_REQUEST_TARGET_EVENT = 'pull_request_target';

/**
 * Where the policy file must be read from.
 *
 * - `head`: the local checkout is trusted for this event; read the PR head (preview semantics)
 * - `base`: read the trusted base commit over the API
 * - `default`: base SHA unavailable; read the repository default branch over the API
 */
export type PolicyConfigRefSource = 'head' | 'base' | 'default';

export interface PolicyConfigRefResolution {
  source: PolicyConfigRefSource;
  /** Commit SHA or ref to read from. `undefined` means the repository default branch. */
  ref: string | undefined;
}

export function resolvePolicyConfigRef(
  eventName: string | undefined,
  prContext: { baseSha: string; headSha: string },
): PolicyConfigRefResolution {
  if (eventName !== PULL_REQUEST_TARGET_EVENT) {
    return { source: 'head', ref: prContext.headSha };
  }

  if (prContext.baseSha) {
    return { source: 'base', ref: prContext.baseSha };
  }

  return { source: 'default', ref: undefined };
}
