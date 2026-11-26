import * as path from 'node:path';

import type { Linter } from 'eslint';
import { describe, expect, it, vi } from 'vitest';

import { createComplexityAnalyzer } from '../src/complexity-analyzer.js';

const lintState = vi.hoisted(() => ({
  messages: [] as Linter.LintMessage[],
}));

vi.mock('eslint', () => {
  class MockESLint {
    async lintFiles(): Promise<Array<{ messages: Linter.LintMessage[] }>> {
      return [{ messages: lintState.messages }];
    }
  }

  return { ESLint: MockESLint };
});

describe('ComplexityAnalyzer (mocked ESLint messages)', () => {
  const analyzer = createComplexityAnalyzer();
  const targetFile = path.join(__dirname, 'fixtures', 'complexity-sample.ts');

  it('parses two-digit complexity values and derives loc from line/endLine', async () => {
    lintState.messages = [
      {
        ruleId: 'complexity',
        message: "Function 'calculateTotal' has a complexity of 12",
        line: 7,
        endLine: 20,
        column: 1,
        severity: 2,
        nodeType: 'FunctionDeclaration',
      },
      {
        ruleId: 'complexity',
        message: "Function 'helper' has a complexity of 5",
        line: 3,
        column: 1,
        severity: 2,
        nodeType: 'FunctionDeclaration',
      },
    ];

    const result = await analyzer.analyzeFile(targetFile);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.complexity).toBe(17);
      expect(result.value.functions).toEqual([
        { name: 'calculateTotal', complexity: 12, loc: { start: 7, end: 20 } },
        { name: 'helper', complexity: 5, loc: { start: 3, end: 3 } },
      ]);
    }
  });

  it('treats a fatal message as a syntax error even without parsing-error text', async () => {
    lintState.messages = [
      {
        ruleId: null,
        message: 'Unexpected fatal problem while linting',
        fatal: true,
        line: 1,
        column: 1,
        severity: 2,
        nodeType: null,
      },
    ];

    const result = await analyzer.analyzeFile(targetFile);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.isSyntaxError).toBe(true);
      expect(result.value.complexity).toBe(0);
      expect(result.value.functions).toEqual([]);
    }
  });

  it('treats a parsing-error message as a syntax error even when other messages exist', async () => {
    lintState.messages = [
      {
        ruleId: 'complexity',
        message: "Function 'ok' has a complexity of 3",
        line: 2,
        column: 1,
        severity: 2,
        nodeType: 'FunctionDeclaration',
      },
      {
        ruleId: null,
        message: 'Parsing error: Unexpected token',
        line: 1,
        column: 1,
        severity: 2,
        nodeType: null,
      },
    ];

    const result = await analyzer.analyzeFile(targetFile);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.isSyntaxError).toBe(true);
      expect(result.value.complexity).toBe(0);
      expect(result.value.functions).toEqual([]);
    }
  });
});
