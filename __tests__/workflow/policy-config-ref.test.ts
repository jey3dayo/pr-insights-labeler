import { describe, expect, it } from 'vitest';

import { resolvePolicyConfigRef } from '../../src/workflow/policy/policy-config-ref';

describe('workflow/policy/policy-config-ref', () => {
  const prContext = { baseSha: 'base-sha', headSha: 'head-sha' };

  it('resolves to the trusted base SHA on pull_request_target', () => {
    expect(resolvePolicyConfigRef('pull_request_target', prContext)).toEqual({ source: 'base', ref: 'base-sha' });
  });

  it('resolves to the default branch, never head, when the base SHA is unavailable on pull_request_target', () => {
    expect(resolvePolicyConfigRef('pull_request_target', { ...prContext, baseSha: '' })).toEqual({
      source: 'default',
      ref: undefined,
    });
  });

  it('resolves to the head SHA on pull_request', () => {
    expect(resolvePolicyConfigRef('pull_request', prContext)).toEqual({ source: 'head', ref: 'head-sha' });
  });

  it('resolves to the head SHA when the event name is unavailable', () => {
    expect(resolvePolicyConfigRef(undefined, prContext)).toEqual({ source: 'head', ref: 'head-sha' });
  });
});
