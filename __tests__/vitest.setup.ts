import * as core from '@actions/core';
import { vi } from 'vitest';

vi.mock('@actions/core', async () => {
  const actual = await vi.importActual<typeof core>('@actions/core');
  return {
    ...actual,
    debug: vi.fn(),
    setSecret: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    setFailed: vi.fn(),
    setOutput: vi.fn(),
    getInput: vi.fn(),
    getBooleanInput: vi.fn(),
    getMultilineInput: vi.fn(),
  };
});
