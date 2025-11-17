import { vi } from 'vitest';

export interface MockOctokit {
  rest: {
    issues: {
      listLabelsOnIssue: ReturnType<typeof vi.fn>;
      addLabels: ReturnType<typeof vi.fn>;
      removeLabel: ReturnType<typeof vi.fn>;
      createLabel: ReturnType<typeof vi.fn>;
    };
  };
}

export function createMockOctokit(): MockOctokit {
  return {
    rest: {
      issues: {
        listLabelsOnIssue: vi.fn(),
        addLabels: vi.fn(),
        removeLabel: vi.fn(),
        createLabel: vi.fn(),
      },
    },
  };
}
