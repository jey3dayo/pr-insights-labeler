import { beforeEach, describe, expect, it } from 'vitest';

import type { FailureEvaluationInput } from '../src/failure-evaluator';
import { evaluateFailureConditions } from '../src/failure-evaluator';
import { changeLanguage, initializeI18n } from '../src/i18n';
import type { Config } from '../src/input-mapper';

describe('FailureEvaluator', () => {
  beforeEach(() => {
    initializeI18n('en');
    changeLanguage('en');
  });

  const createBaseConfig = (): Config => ({
    fileSizeLimit: 100000,
    fileSizeLimitEnabled: true,
    fileLinesLimit: 500,
    fileLinesLimitEnabled: true,
    prAdditionsLimitEnabled: true,
    prFilesLimitEnabled: true,
    prAdditionsLimit: 5000,
    prFilesLimit: 50,
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
                violationType: 'lines',
                severity: 'warning',
                actualValue: 1000,
                limit: 500,
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

      it('should ignore large-files when file size checks are disabled', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;
        config.fileSizeLimitEnabled = false;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/large-files'],
          violations: {
            largeFiles: [
              {
                file: 'large-file.ts',
                violationType: 'size',
                severity: 'critical',
                actualValue: 999999,
                limit: 100000,
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

      it('should skip too-many-lines when line limit checks are disabled', () => {
        const config = createBaseConfig();
        config.failOnLargeFiles = true;
        config.fileLinesLimitEnabled = false;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/too-many-lines'],
          violations: {
            largeFiles: [],
            exceedsFileLines: [
              {
                file: 'long-file.ts',
                violationType: 'lines',
                severity: 'warning',
                actualValue: 1200,
                limit: 500,
              },
            ],
            exceedsAdditions: false,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(0);
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

      it('should ignore too many files when file count check is disabled', () => {
        const config = createBaseConfig();
        config.failOnTooManyFiles = true;
        config.prFilesLimitEnabled = false;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/too-many-files'],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: false,
            exceedsFileCount: true,
          },
          metrics: { totalAdditions: 100, excludedAdditions: 0 },
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
          metrics: { totalAdditions: 600 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        expect(failures[0]).toContain('large');
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

      it('should ignore excessive changes when additions limit is disabled', () => {
        const config = createBaseConfig();
        config.failOnPrSize = 'large';
        config.prAdditionsLimitEnabled = false;

        const input: FailureEvaluationInput = {
          config,
          appliedLabels: ['auto/excessive-changes'],
          violations: {
            largeFiles: [],
            exceedsFileLines: [],
            exceedsAdditions: true,
            exceedsFileCount: false,
          },
          metrics: { totalAdditions: 100 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(0);
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
        expect(failures).toHaveLength(2);
        expect(failures.some(f => f.includes('PR additions exceed limit'))).toBe(true);
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
        expect(failures).toHaveLength(3);
        expect(failures.some(f => f.includes('Large files detected'))).toBe(true);
        expect(failures.some(f => f.includes('Too many files in PR'))).toBe(true);
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
          appliedLabels: undefined,
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
          metrics: { totalAdditions: 1500 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
        expect(failures[0]).toContain('size/xlarge');
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
          metrics: { totalAdditions: 500 },
          sizeThresholds: config.sizeThresholds,
        };

        const failures = evaluateFailureConditions(input);
        expect(failures).toHaveLength(1);
      });
    });
  });
});
