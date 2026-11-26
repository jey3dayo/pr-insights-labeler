import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { aggregateMetrics, createComplexityAnalyzer } from '../src/complexity-analyzer.js';
import type { FileComplexity } from '../src/labeler-types.js';

describe('ComplexityAnalyzer (real ESLint, unmocked)', () => {
  it('uses the real analyzer factory, not a mock', () => {
    expect(vi.isMockFunction(createComplexityAnalyzer)).toBe(false);
  });
  describe('analyzeFile', () => {
    const analyzer = createComplexityAnalyzer();
    const fixturesDir = path.join(__dirname, 'fixtures');

    it('should analyze a valid TypeScript file', async () => {
      const filePath = path.join(fixturesDir, 'complexity-sample.ts');
      const result = await analyzer.analyzeFile(filePath);

      if (result.isErr()) {
        console.error('analyzeFile failed:', JSON.stringify(result.error, null, 2));
      }

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const complexity = result.value;
        expect(complexity.path).toBe(filePath);
        expect(complexity.complexity).toBeGreaterThan(0);
        expect(complexity.functions).toBeInstanceOf(Array);
        expect(complexity.functions.length).toBeGreaterThan(0);
        expect(complexity.isSyntaxError).toBe(false);
      }
    });

    it('should handle syntax error files (complexity 0)', async () => {
      const filePath = path.join(fixturesDir, 'syntax-error.ts');
      const result = await analyzer.analyzeFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const complexity = result.value;
        expect(complexity.path).toBe(filePath);
        expect(complexity.complexity).toBe(0);
        expect(complexity.isSyntaxError).toBe(true);
        expect(complexity.functions).toEqual([]);
      }
    });

    it('should skip files larger than maxFileSize', async () => {
      const filePath = path.join(fixturesDir, 'complexity-sample.ts');
      const result = await analyzer.analyzeFile(filePath, { maxFileSize: 100 });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const error = result.error;
        expect(error.reason).toBe('too_large');
        expect(error.filename).toBe(filePath);
      }
    });

    it('should accept a file whose size equals maxFileSize', async () => {
      const filePath = path.join(fixturesDir, 'complexity-sample.ts');
      const { size } = await fs.stat(filePath);
      const result = await analyzer.analyzeFile(filePath, { maxFileSize: size });

      expect(result.isOk()).toBe(true);
    });

    it('should include filename and details when the file cannot be read', async () => {
      const filePath = path.join(fixturesDir, 'non-existent.ts');
      const result = await analyzer.analyzeFile(filePath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const error = result.error;
        expect(error.reason).toBe('analysis_failed');
        expect(error.filename).toBe(filePath);
        expect(error.details).toContain('Failed to stat file');
        expect(error.details).toContain(filePath);
      }
    });

    it('should analyze a TSX file containing JSX', async () => {
      const filePath = path.join(fixturesDir, 'complexity-jsx.tsx');
      const result = await analyzer.analyzeFile(filePath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const complexity = result.value;
        expect(complexity.isSyntaxError).toBe(false);
        expect(complexity.functions.length).toBeGreaterThan(0);
        expect(complexity.complexity).toBeGreaterThan(0);
      }
    });
  });

  describe('analyzeFiles', () => {
    const analyzer = createComplexityAnalyzer();
    const fixturesDir = path.join(__dirname, 'fixtures');

    it('should analyze multiple files in parallel', async () => {
      const filePaths = [path.join(fixturesDir, 'complexity-sample.ts'), path.join(fixturesDir, 'syntax-error.ts')];

      const result = await analyzer.analyzeFiles(filePaths);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.analyzedFiles).toBe(2);
        expect(metrics.files).toHaveLength(2);
        expect(metrics.syntaxErrorFiles).toEqual([path.join(fixturesDir, 'syntax-error.ts')]);
        expect(metrics.skippedFiles).toHaveLength(0);
        expect(metrics.hasTsconfig).toBe(true);
      }
    });

    it('should handle skipped files correctly', async () => {
      const filePaths = [path.join(fixturesDir, 'complexity-sample.ts'), path.join(fixturesDir, 'non-existent.ts')];

      const result = await analyzer.analyzeFiles(filePaths);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.analyzedFiles).toBe(1);
        expect(metrics.skippedFiles).toHaveLength(1);
        expect(metrics.skippedFiles[0]?.reason).toBe('analysis_failed');
      }
    });

    it('should set truncated to false and include details for skipped files', async () => {
      const filePaths = [path.join(fixturesDir, 'complexity-sample.ts'), path.join(fixturesDir, 'non-existent.ts')];

      const result = await analyzer.analyzeFiles(filePaths);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const metrics = result.value;
        expect(metrics.truncated).toBe(false);
        expect(metrics.skippedFiles).toHaveLength(1);
        expect(metrics.skippedFiles[0]?.details).toContain('Failed to stat file');
      }
    });
  });

  describe('aggregateMetrics', () => {
    it('should calculate max complexity correctly', () => {
      const results: FileComplexity[] = [
        { path: 'a.ts', complexity: 10, functions: [], isSyntaxError: false },
        { path: 'b.ts', complexity: 25, functions: [], isSyntaxError: false },
        { path: 'c.ts', complexity: 15, functions: [], isSyntaxError: false },
      ];

      const metrics = aggregateMetrics(results);

      expect(metrics).toBeDefined();
      expect(metrics?.maxComplexity).toBe(25);
    });

    it('should calculate average complexity correctly', () => {
      const results: FileComplexity[] = [
        { path: 'a.ts', complexity: 10, functions: [], isSyntaxError: false },
        { path: 'b.ts', complexity: 20, functions: [], isSyntaxError: false },
        { path: 'c.ts', complexity: 15, functions: [], isSyntaxError: false },
      ];

      const metrics = aggregateMetrics(results);

      expect(metrics).toBeDefined();
      expect(metrics?.avgComplexity).toBe(15.0);
    });

    it('should round average complexity to 1 decimal place', () => {
      const results: FileComplexity[] = [
        { path: 'a.ts', complexity: 10, functions: [], isSyntaxError: false },
        { path: 'b.ts', complexity: 11, functions: [], isSyntaxError: false },
        { path: 'c.ts', complexity: 12, functions: [], isSyntaxError: false },
      ];

      const metrics = aggregateMetrics(results);

      expect(metrics).toBeDefined();
      expect(metrics?.avgComplexity).toBe(11.0);
    });

    it('should include syntax error files in aggregation (complexity 0)', () => {
      const results: FileComplexity[] = [
        { path: 'valid.ts', complexity: 20, functions: [], isSyntaxError: false },
        { path: 'syntax-error.ts', complexity: 0, functions: [], isSyntaxError: true },
        { path: 'valid2.ts', complexity: 30, functions: [], isSyntaxError: false },
      ];

      const metrics = aggregateMetrics(results);

      expect(metrics).toBeDefined();
      expect(metrics?.maxComplexity).toBe(30);
      expect(metrics?.avgComplexity).toBe(16.7);
      expect(metrics?.analyzedFiles).toBe(3);
      expect(metrics?.syntaxErrorFiles).toEqual(['syntax-error.ts']);
    });

    it('should return undefined for empty results', () => {
      const results: FileComplexity[] = [];

      const metrics = aggregateMetrics(results);

      expect(metrics).toBeUndefined();
    });

    it('should handle all syntax error files correctly', () => {
      const results: FileComplexity[] = [
        { path: 'error1.ts', complexity: 0, functions: [], isSyntaxError: true },
        { path: 'error2.ts', complexity: 0, functions: [], isSyntaxError: true },
      ];

      const metrics = aggregateMetrics(results);

      expect(metrics).toBeDefined();
      expect(metrics?.maxComplexity).toBe(0);
      expect(metrics?.avgComplexity).toBe(0);
      expect(metrics?.analyzedFiles).toBe(2);
      expect(metrics?.syntaxErrorFiles).toHaveLength(2);
      expect(metrics?.syntaxErrorFiles).toContain('error1.ts');
      expect(metrics?.syntaxErrorFiles).toContain('error2.ts');
    });

    it('should calculate analyzedFiles count correctly', () => {
      const results: FileComplexity[] = [
        { path: 'a.ts', complexity: 10, functions: [], isSyntaxError: false },
        { path: 'b.ts', complexity: 20, functions: [], isSyntaxError: false },
        { path: 'c.ts', complexity: 0, functions: [], isSyntaxError: true },
      ];

      const metrics = aggregateMetrics(results);

      expect(metrics).toBeDefined();
      expect(metrics?.analyzedFiles).toBe(3);
    });
  });
});
