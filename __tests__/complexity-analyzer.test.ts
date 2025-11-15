/**
 * Tests for Complexity Analyzer
 */

import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { aggregateMetrics, createComplexityAnalyzer } from '../src/complexity-analyzer.js';
import type { FileComplexity } from '../src/labeler-types.js';

describe('ComplexityAnalyzer', () => {
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
      const result = await analyzer.analyzeFile(filePath, { maxFileSize: 100 }); // 100 bytes limit

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const error = result.error;
        expect(error.reason).toBe('too_large');
        expect(error.filename).toBe(filePath);
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
        expect(metrics.analyzedFiles).toBe(2); // Both files included
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
        expect(metrics.analyzedFiles).toBe(1); // Only complexity-sample.ts
        expect(metrics.skippedFiles).toHaveLength(1);
        expect(metrics.skippedFiles[0]?.reason).toBe('analysis_failed');
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
      // Average = (10 + 20 + 15) / 3 = 15.0
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
      // Average = (10 + 11 + 12) / 3 = 11.0
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
      // Max should be 30 (ignoring syntax error file)
      expect(metrics?.maxComplexity).toBe(30);
      // Average = (20 + 0 + 30) / 3 = 16.7
      expect(metrics?.avgComplexity).toBe(16.7);
      // Analyzed files should be 3 (including syntax error)
      expect(metrics?.analyzedFiles).toBe(3);
      // Syntax error files should be tracked separately
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
      // Max should be 0 (all syntax errors)
      expect(metrics?.maxComplexity).toBe(0);
      // Average should be 0
      expect(metrics?.avgComplexity).toBe(0);
      // Analyzed files should be 2
      expect(metrics?.analyzedFiles).toBe(2);
      // Both files should be in syntax error list
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
      expect(metrics?.analyzedFiles).toBe(3); // All files including syntax errors
    });
  });
});
