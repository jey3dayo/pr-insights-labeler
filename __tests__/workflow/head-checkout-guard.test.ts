import { describe, expect, it, vi } from 'vitest';

import type { LocalHeadRevisionReader } from '../../src/workflow/policy/head-checkout-guard';
import { evaluateHeadCheckout, verifyHeadCheckout } from '../../src/workflow/policy/head-checkout-guard';

// Render the key plus its interpolation values so assertions can check that the message carries
// both the expected and the actual revision without depending on the wording of the locale files.
vi.mock('../../src/i18n.js', () => ({
  t: (_ns: string, key: string, params?: Record<string, unknown>) =>
    [key, ...Object.entries(params ?? {}).map(([name, value]) => `${name}=${String(value)}`)].join(' '),
}));

const HEAD_SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);

describe('workflow/policy/head-checkout-guard', () => {
  describe('evaluateHeadCheckout', () => {
    it('verifies the checkout on pull_request_target when HEAD matches the event head SHA', () => {
      const result = evaluateHeadCheckout({
        eventName: 'pull_request_target',
        expectedHeadSha: HEAD_SHA,
        workspace: '/workspace',
        // `git rev-parse HEAD` emits a trailing newline; the raw output must still match.
        localHeadRevision: `${HEAD_SHA}\n`,
      });

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ status: 'verified', revision: HEAD_SHA });
    });

    it('fails on pull_request_target when HEAD is a different revision than the event head SHA', () => {
      const result = evaluateHeadCheckout({
        eventName: 'pull_request_target',
        expectedHeadSha: HEAD_SHA,
        workspace: '/workspace',
        localHeadRevision: OTHER_SHA,
      });

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error.type).toBe('ConfigurationError');
      expect(error.message).toContain(HEAD_SHA);
      expect(error.message).toContain(OTHER_SHA);
    });

    it('fails closed on pull_request_target when the local HEAD revision cannot be read', () => {
      const result = evaluateHeadCheckout({
        eventName: 'pull_request_target',
        expectedHeadSha: HEAD_SHA,
        workspace: undefined,
        localHeadRevision: undefined,
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().type).toBe('ConfigurationError');
      expect(result._unsafeUnwrapErr().message).toContain(HEAD_SHA);
    });

    it('fails closed on pull_request_target when the event carries no head SHA', () => {
      const result = evaluateHeadCheckout({
        eventName: 'pull_request_target',
        expectedHeadSha: '',
        workspace: '/workspace',
        localHeadRevision: HEAD_SHA,
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().type).toBe('ConfigurationError');
    });

    it.each([['pull_request'], ['push'], [undefined]])(
      'skips the check for event %s even when HEAD differs from the event head SHA',
      eventName => {
        // `actions/checkout` legitimately checks out the merge commit for `pull_request`, so a
        // differing HEAD must not fail the action.
        const result = evaluateHeadCheckout({
          eventName,
          expectedHeadSha: HEAD_SHA,
          workspace: '/workspace',
          localHeadRevision: OTHER_SHA,
        });

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toEqual({ status: 'skipped' });
      },
    );
  });

  describe('verifyHeadCheckout', () => {
    it('reads the local revision from the provided workspace on pull_request_target', async () => {
      const reader: LocalHeadRevisionReader = vi.fn(async () => `${HEAD_SHA}\n`);

      const result = await verifyHeadCheckout(
        { eventName: 'pull_request_target', expectedHeadSha: HEAD_SHA, workspace: '/workspace' },
        reader,
      );

      expect(result.isOk()).toBe(true);
      expect(reader).toHaveBeenCalledWith('/workspace');
    });

    it('fails closed when reading the local revision is not possible', async () => {
      const result = await verifyHeadCheckout(
        { eventName: 'pull_request_target', expectedHeadSha: HEAD_SHA, workspace: '/workspace' },
        async () => undefined,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().type).toBe('ConfigurationError');
    });

    it('does not read the local revision for events other than pull_request_target', async () => {
      const reader: LocalHeadRevisionReader = vi.fn(async () => OTHER_SHA);

      const result = await verifyHeadCheckout(
        { eventName: 'pull_request', expectedHeadSha: HEAD_SHA, workspace: '/workspace' },
        reader,
      );

      expect(result._unsafeUnwrap()).toEqual({ status: 'skipped' });
      expect(reader).not.toHaveBeenCalled();
    });
  });
});
