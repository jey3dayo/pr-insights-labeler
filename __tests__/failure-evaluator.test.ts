/**
 * Tests for failure-evaluator.ts
 * Comprehensive test coverage for label-based workflow failure control
 */

import { beforeEach, describe, expect, it } from 'vitest';

import type { FailureEvaluationInput } from '../src/failure-evaluator';
import { evaluateFailureConditions } from '../src/failure-evaluator';
import { changeLanguage, initializeI18n } from '../src/i18n';
import type { Config } from '../src/input-mapper';

describe('FailureEvaluator', () => {
  beforeEach(() => {
    // Initialize i18n with English for consistent test output
    initializeI18n('en');
    changeLanguage('en'); // Ensure English is active
  });

  const createBaseConfig = (): Config => ({
    fileSizeLimit: 100000,
    fileLinesLimit: 500,
    prAdditionsLimit: 5000,
    prFilesLimit: 50,
    autoRemoveLabels: true,
    sizeEnabled: true,
    sizeThresholds: { small: 200, medium: 500, large: 1000, xlarge: 3000 },
    complexityEnabled: false,
    complexityThresholdsV2: { medium: 15, high: 30 },
    categoryEnabled: true,
    riskEnabled: true,
    largeFilesLabel: 'auto/large-files',
    tooManyFilesLabel: 'auto/too-many-files',
    tooManyLinesLabel: 'auto/too-many-lines',
    excessiveChangesLabel: 'auto/excessive-changes',
    skipDraftPr: true,
    commentOnPr: 'auto',
    failOnLargeFiles: false,
    failOnTooManyFiles: false,
    failOnPrSize: '',
    enableSummary: true,
    additionalExcludePatterns: [],
    githubToken: 'test-token',
    enableDirectoryLabeling: false,
    directoryLabelerConfigPath: '.github/directory-labeler.yml',
    maxLabels: 10,
    useDefaultExcludes: true,
    language: 'en',
  });

  describe('evaluateFailureConditions', () => {
    describe('fail_on_large_files', () => {
      it('should detect large files from label', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/large-files'],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        expect(failures[0]).toContain('Large files detected');
      });

      it('should detect large files from violation', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: [],
          violations: {
            largeFiles: [
              {
                file: 'large-file.ts',
                reason: 'size',
                size: 200000,
                lines: 300,
                additions: 100,
                deletions: 50,
              },
            ],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        expect(failures[0]).toContain('Large files detected');
      });

      it('should detect too-many-lines from label', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/too-many-lines'],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        expect(failures[0]).toContain('Files with too many lines detected');
      });

      it('should detect too-many-lines from violation', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: [],
          violations: {
            largeFiles: [],
            exceedsFileLines: [
              {
                file: 'long-file.ts',
                reason: 'lines',
                size: 50000,
                lines: 1000,
                additions: 100,
                deletions: 50,
              },
            ],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        expect(failures[0]).toContain('Files with too many lines detected');
      });

      it('should handle both largeFiles and tooManyLines simultaneously (no duplication)', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/large-files', 'auto/too-many-lines'],
          violations: {
            largeFiles: [
              {
                file: 'large-file.ts',
                reason: 'size',
                size: 200000,
                lines: 300,
                additions: 100,
                deletions: 50,
              },
            ],
            exceedsFileLines: [
              {
                file: 'long-file.ts',
                reason: 'lines',
                size: 50000,
                lines: 1000,
                additions: 100,
                deletions: 50,
              },
            ],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        // Should have 2 distinct failures: largeFiles and tooManyLines
        expect(failures).toHaveLength(2);
        expect(failures.some(f => f.includes('Large files detected'))).toBe(true);
        expect(failures.some(f => f.includes('Files with too many lines detected'))).toBe(true);
      });

      it('should not fail when disabled', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = false;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/large-files'],
          violations: {
            largeFiles: [
              {
                file: 'large-file.ts',
                reason: 'size',
                size: 200000,
                lines: 300,
                additions: 100,
                deletions: 50,
              },
            ],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(0);
      });
    });

    describe('fail_on_too_many_files', () => {
      it('should detect too many files from label', () => {
        const config = createBaseConfig();
        config.failOnTooManyFiles = true;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/too-many-files'],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        expect(failures[0]).toContain('Too many files in PR');
      });

      it('should detect too many files from violation', () => {
        const config = createBaseConfig();
        config.failOnTooManyFiles = true;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: [],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: true,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        expect(failures[0]).toContain('Too many files in PR');
      });

      it('should not fail when disabled', () => {
        const config = createBaseConfig();
        config.failOnTooManyFiles = false;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/too-many-files'],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: true,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(0);
      });
    });

    describe('fail_on_pr_size', () => {
      it('should detect PR size from label', () => {
        const config = createBaseConfig();
        config.failOnPrSize = 'medium';

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['size/large'],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 600 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        // Size label is normalized from "size/large" to "large"
        expect(failures[0]).toContain('large');
        expect(failures[0]).toContain('medium');
      });

      it('should calculate PR size from metrics when no label', () => {
        const config = createBaseConfig();
        config.failOnPrSize = 'medium';

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: [],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 600 }, // large size (500-1000)
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        // Size is calculated as "large", not "size/large"
        expect(failures[0]).toContain('large'); // 600 is in large range
      });

      it('should detect excessive changes from label', () => {
        const config = createBaseConfig();
        config.failOnPrSize = 'large';

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/excessive-changes'],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        expect(failures[0]).toContain('PR additions exceed limit');
      });

      it('should detect excessive changes from violation', () => {
        const config = createBaseConfig();
        config.failOnPrSize = 'large';

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: [],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: true,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 6000 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        // Should have 2 failures: excessive changes + prSize (xxlarge >= large)
        expect(failures).toHaveLength(2);
        expect(failures.some(f => f.includes('PR additions exceed limit'))).toBe(true);
        // Size is calculated as "xxlarge", not "size/xxlarge"
        expect(failures.some(f => f.includes('xxlarge'))).toBe(true);
      });

      it('should not fail when threshold not met', () => {
        const config = createBaseConfig();
        config.failOnPrSize = 'large';

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['size/small'],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(0);
      });

      it('should not fail when disabled (empty string)', () => {
        const config = createBaseConfig();
        config.failOnPrSize = '';

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['size/xxlarge'],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: true,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 10000 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(0);
      });
    });

    describe('Multiple conditions (combination tests)', () => {
      it('should handle all conditions enabled with mixed violations', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;
        config.failOnTooManyFiles = true;
        config.failOnPrSize = 'medium';

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/large-files', 'auto/too-many-files', 'size/large'],
          violations: {
            largeFiles: [
              {
                file: 'large-file.ts',
                reason: 'size',
                size: 200000,
                lines: 300,
                additions: 100,
                deletions: 50,
              },
            ],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: true,
          },
          metrics: { totalAdditions: 800 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        // Should have 3 distinct failures: largeFiles, tooManyFiles, prSize
        expect(failures).toHaveLength(3);
        expect(failures.some(f => f.includes('Large files detected'))).toBe(true);
        expect(failures.some(f => f.includes('Too many files in PR'))).toBe(true);
        // Size label is normalized from "size/large" to "large"
        expect(failures.some(f => f.includes('large'))).toBe(true);
      });

      it('should handle largeFiles and tooManyFiles simultaneously without duplication', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;
        config.failOnTooManyFiles = true;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/large-files', 'auto/too-many-files', 'auto/too-many-lines'],
          violations: {
            largeFiles: [
              {
                file: 'large-file.ts',
                reason: 'size',
                size: 200000,
                lines: 300,
                additions: 100,
                deletions: 50,
              },
            ],
            exceedsFileLines: [
              {
                file: 'long-file.ts',
                reason: 'lines',
                size: 50000,
                lines: 1000,
                additions: 100,
                deletions: 50,
              },
            ],
            exceedsAdditions: false,
            exceedsFileCount: true,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        // Should have 3 distinct failures: largeFiles, tooManyLines, tooManyFiles
        expect(failures).toHaveLength(3);
        expect(failures.some(f => f.includes('Large files detected'))).toBe(true);
        expect(failures.some(f => f.includes('Files with too many lines detected'))).toBe(true);
        expect(failures.some(f => f.includes('Too many files in PR'))).toBe(true);
      });

      it('should handle all conditions disabled', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = false;
        config.failOnTooManyFiles = false;
        config.failOnPrSize = '';

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/large-files', 'auto/too-many-files', 'size/xxlarge'],
          violations: {
            largeFiles: [
              {
                file: 'large-file.ts',
                reason: 'size',
                size: 200000,
                lines: 300,
                additions: 100,
                deletions: 50,
              },
            ],
            exceedsFileLines: [],
            exceedsAdditions: true,
            exceedsFileCount: true,
          },
          metrics: { totalAdditions: 10000 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(0);
      });
    });

    describe('Graceful degradation (label fetch failure)', () => {
      it('should evaluate based on violations when appliedLabels is undefined', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;
        config.failOnTooManyFiles = true;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: undefined, // Label fetch failed
          violations: {
            largeFiles: [
              {
                file: 'large-file.ts',
                reason: 'size',
                size: 200000,
                lines: 300,
                additions: 100,
                deletions: 50,
              },
            ],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: true,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(2);
        expect(failures.some(f => f.includes('Large files detected'))).toBe(true);
        expect(failures.some(f => f.includes('Too many files in PR'))).toBe(true);
      });

      it('should calculate PR size from metrics when labels unavailable', () => {
        const config = createBaseConfig();
        config.failOnPrSize = 'medium';

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: undefined,
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 1500 }, // xlarge size (1000-3000)
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        expect(failures[0]).toContain('size/xlarge'); // 1500 is in xlarge range
      });
    });

    describe('Edge cases', () => {
      it('should handle empty labels array', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: [],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(0);
      });

      it('should handle no violations', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;
        config.failOnTooManyFiles = true;
        config.failOnPrSize = 'large';

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: [],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(0);
      });

      it('should handle size threshold boundary (exactly at threshold)', () => {
        const config = createBaseConfig();
        config.failOnPrSize = 'medium';

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: [],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 500 }, // exactly at medium threshold
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        // At threshold should be classified as medium (>= threshold logic)
        expect(failures).toHaveLength(1);
      });
    });
  });
});
