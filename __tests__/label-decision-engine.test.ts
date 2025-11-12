import { describe, expect, it } from 'vitest';

import {
  decideCategoryLabels,
  decideCategoryLabelsWithFiles,
  decideComplexityLabel,
  decideLabels,
  decideRiskLabel,
  decideSizeLabel,
  decideViolationLabels,
} from '../src/label-decision-engine';
import { DEFAULT_LABELER_CONFIG, type PRMetrics } from '../src/labeler-types';
import {
  ciCdCategory,
  defaultCategories,
  defaultComplexityThresholds,
  defaultRiskConfig,
  defaultSizeThresholds,
  docsCategory,
  testCategory,
} from './__fixtures__/index.js';

describe('Label Decision Engine', () => {
  // Empty violations object for tests where no violations exist
  const emptyViolations = {
    largeFiles: [],
    exceedsFileLines: [],
    exceedsAdditions: false,
    exceedsFileCount: false,
  };

  describe('decideSizeLabel', () => {
    const thresholds = defaultSizeThresholds;

    it('should return size/small for additions < 200', () => {
      expect(decideSizeLabel(0, thresholds)).toBe('size/small');
      expect(decideSizeLabel(100, thresholds)).toBe('size/small');
      expect(decideSizeLabel(199, thresholds)).toBe('size/small');
    });

    it('should return size/medium for 200 <= additions < 500', () => {
      expect(decideSizeLabel(200, thresholds)).toBe('size/medium');
      expect(decideSizeLabel(350, thresholds)).toBe('size/medium');
      expect(decideSizeLabel(499, thresholds)).toBe('size/medium');
    });

    it('should return size/large for 500 <= additions < 1000', () => {
      expect(decideSizeLabel(500, thresholds)).toBe('size/large');
      expect(decideSizeLabel(750, thresholds)).toBe('size/large');
      expect(decideSizeLabel(999, thresholds)).toBe('size/large');
    });

    it('should return size/xlarge for 1000 <= additions < 3000', () => {
      expect(decideSizeLabel(1000, thresholds)).toBe('size/xlarge');
      expect(decideSizeLabel(2000, thresholds)).toBe('size/xlarge');
      expect(decideSizeLabel(2999, thresholds)).toBe('size/xlarge');
    });

    it('should return size/xxlarge for additions >= 3000', () => {
      expect(decideSizeLabel(3000, thresholds)).toBe('size/xxlarge');
      expect(decideSizeLabel(5000, thresholds)).toBe('size/xxlarge');
      expect(decideSizeLabel(10000, thresholds)).toBe('size/xxlarge');
    });
  });

  describe('decideComplexityLabel', () => {
    const thresholds = defaultComplexityThresholds;

    it('should return null for low complexity', () => {
      expect(decideComplexityLabel(0, thresholds)).toBeNull();
      expect(decideComplexityLabel(5, thresholds)).toBeNull();
      expect(decideComplexityLabel(9, thresholds)).toBeNull();
    });

    it('should return complexity/medium for medium complexity', () => {
      expect(decideComplexityLabel(10, thresholds)).toBe('complexity/medium');
      expect(decideComplexityLabel(15, thresholds)).toBe('complexity/medium');
      expect(decideComplexityLabel(19, thresholds)).toBe('complexity/medium');
    });

    it('should return complexity/high for high complexity', () => {
      expect(decideComplexityLabel(20, thresholds)).toBe('complexity/high');
      expect(decideComplexityLabel(25, thresholds)).toBe('complexity/high');
      expect(decideComplexityLabel(100, thresholds)).toBe('complexity/high');
    });
  });

  describe('decideCategoryLabels', () => {
    const categories = [testCategory, ciCdCategory, docsCategory];

    it('should return empty array for no matches', () => {
      const files = ['src/index.ts', 'src/utils.ts'];
      expect(decideCategoryLabels(files, categories)).toEqual([]);
    });

    it('should return single category label', () => {
      const files = ['__tests__/foo.test.ts'];
      expect(decideCategoryLabels(files, categories)).toEqual(['category/tests']);
    });

    it('should return multiple category labels', () => {
      const files = ['__tests__/foo.test.ts', 'docs/README.md', '.github/workflows/ci.yml'];
      const result = decideCategoryLabels(files, categories);
      expect(result).toContain('category/tests');
      expect(result).toContain('category/ci-cd');
      expect(result).toContain('category/documentation');
      expect(result).toHaveLength(3);
    });

    it('should match glob patterns correctly', () => {
      const files = ['src/components/Button.test.ts'];
      expect(decideCategoryLabels(files, categories)).toEqual(['category/tests']);
    });
  });

  describe('decideRiskLabel', () => {
    const config = {
      high_if_no_tests_for_core: defaultRiskConfig.high_if_no_tests_for_core,
      core_paths: defaultRiskConfig.core_paths,
      config_files: defaultRiskConfig.config_files,
    };

    it('should return null for docs-only changes', () => {
      const files = ['docs/README.md', 'CHANGELOG.md'];
      expect(decideRiskLabel(files, config)).toBeNull();
    });

    it('should return risk/high for core changes without tests', () => {
      const files = ['src/index.ts', 'src/utils.ts'];
      expect(decideRiskLabel(files, config)).toBe('risk/high');
    });

    it('should return null for core changes with tests', () => {
      const files = ['src/index.ts', '__tests__/index.test.ts'];
      expect(decideRiskLabel(files, config)).toBeNull();
    });

    it('should return risk/medium for config file changes', () => {
      const files = ['package.json', '__tests__/foo.test.ts'];
      expect(decideRiskLabel(files, config)).toBe('risk/medium');
    });

    it('should return risk/medium for workflow changes', () => {
      const files = ['.github/workflows/ci.yml'];
      expect(decideRiskLabel(files, config)).toBe('risk/medium');
    });

    it('should prioritize risk/high over risk/medium', () => {
      const files = ['src/index.ts', 'package.json'];
      expect(decideRiskLabel(files, config)).toBe('risk/high');
    });

    describe('with CI status and commit messages', () => {
      const configWithCI = {
        ...config,
        use_ci_status: true,
      };

      it('should return null for refactoring with all CI passed', () => {
        const files = ['src/index.ts', 'src/utils.ts'];
        const prContext = {
          owner: 'test',
          repo: 'test',
          pullNumber: 1,
          ciStatus: {
            tests: 'passed' as const,
            typeCheck: 'passed' as const,
            build: 'passed' as const,
            lint: 'passed' as const,
          },
          commitMessages: ['refactor: improve code structure'],
        };
        expect(decideRiskLabel(files, configWithCI, prContext)).toBeNull();
      });

      it('should return risk/high for feature without tests', () => {
        const files = ['src/index.ts', 'src/new-feature.ts'];
        const prContext = {
          owner: 'test',
          repo: 'test',
          pullNumber: 1,
          ciStatus: {
            tests: 'passed' as const,
            typeCheck: 'passed' as const,
            build: 'passed' as const,
            lint: 'passed' as const,
          },
          commitMessages: ['feat: add new feature'],
        };
        expect(decideRiskLabel(files, configWithCI, prContext)).toBe('risk/high');
      });

      it('should return risk/high when CI checks fail', () => {
        const files = ['src/index.ts', '__tests__/index.test.ts'];
        const prContext = {
          owner: 'test',
          repo: 'test',
          pullNumber: 1,
          ciStatus: {
            tests: 'failed' as const,
            typeCheck: 'passed' as const,
            build: 'passed' as const,
            lint: 'passed' as const,
          },
          commitMessages: ['refactor: improve code structure'],
        };
        expect(decideRiskLabel(files, configWithCI, prContext)).toBe('risk/high');
      });

      it('should fallback to original logic when use_ci_status is false', () => {
        const files = ['src/index.ts', 'src/utils.ts'];
        const configNoCi = {
          ...config,
          use_ci_status: false,
        };
        const prContext = {
          owner: 'test',
          repo: 'test',
          pullNumber: 1,
          ciStatus: {
            tests: 'passed' as const,
            typeCheck: 'passed' as const,
            build: 'passed' as const,
            lint: 'passed' as const,
          },
          commitMessages: ['refactor: improve code structure'],
        };
        // Should use original logic (no tests + core changes = risk/high)
        expect(decideRiskLabel(files, configNoCi, prContext)).toBe('risk/high');
      });

      it('should work without prContext (backward compatibility)', () => {
        const files = ['src/index.ts', 'src/utils.ts'];
        // Should use original logic without prContext
        expect(decideRiskLabel(files, configWithCI)).toBe('risk/high');
      });
    });
  });

  describe('decideLabels', () => {
    const config = DEFAULT_LABELER_CONFIG;

    it('should decide all label types for a typical PR', () => {
      const metrics: PRMetrics = {
        totalAdditions: 250,
        excludedAdditions: 0,
        files: [
          { path: 'src/index.ts', size: 5000, lines: 150, additions: 100, deletions: 20 },
          { path: '__tests__/index.test.ts', size: 3000, lines: 80, additions: 50, deletions: 10 },
          { path: 'docs/README.md', size: 2000, lines: 50, additions: 100, deletions: 5 },
        ],
        allFiles: ['src/index.ts', '__tests__/index.test.ts', 'docs/README.md'],
      };

      const result = decideLabels(metrics, config, emptyViolations);
      expect(result.isOk()).toBe(true);

      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd).toContain('size/medium');
      expect(decisions.labelsToAdd).toContain('category/tests');
      expect(decisions.labelsToAdd).toContain('category/documentation');
      expect(decisions.labelsToRemove).toContain('size/*');
    });

    it('should decide size/small for small PRs', () => {
      const metrics: PRMetrics = {
        totalAdditions: 50,
        excludedAdditions: 0,
        files: [{ path: 'src/small.ts', size: 1000, lines: 30, additions: 50, deletions: 5 }],
        allFiles: ['src/small.ts'],
      };

      const result = decideLabels(metrics, config, emptyViolations);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd).toContain('size/small');
    });

    it('should decide risk/high for core changes without tests', () => {
      const metrics: PRMetrics = {
        totalAdditions: 100,
        excludedAdditions: 0,
        files: [{ path: 'src/core.ts', size: 5000, lines: 150, additions: 100, deletions: 10 }],
        allFiles: ['src/core.ts'],
      };

      const result = decideLabels(metrics, config, emptyViolations);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd).toContain('risk/high');
    });

    it('should include reasoning for each label', () => {
      const metrics: PRMetrics = {
        totalAdditions: 150,
        excludedAdditions: 0,
        files: [{ path: 'src/index.ts', size: 5000, lines: 150, additions: 150, deletions: 20 }],
        allFiles: ['src/index.ts'],
      };

      const result = decideLabels(metrics, config, emptyViolations);
      const decisions = result._unsafeUnwrap();

      expect(decisions.reasoning).toHaveLength(decisions.labelsToAdd.length);
      expect(decisions.reasoning[0]?.category).toBe('size');
    });

    it('should not add complexity label when metrics.complexity is undefined', () => {
      const metrics: PRMetrics = {
        totalAdditions: 120,
        excludedAdditions: 0,
        files: [{ path: 'src/a.ts', size: 1000, lines: 50, additions: 120, deletions: 0 }],
        allFiles: ['src/a.ts'],
      };

      const result = decideLabels(metrics, config, emptyViolations);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd.find(l => l.startsWith('complexity/'))).toBeUndefined();
    });

    it('should not add complexity label when disabled in config', () => {
      const customConfig = {
        ...config,
        complexity: { ...config.complexity, enabled: false },
      };

      const metrics: PRMetrics = {
        totalAdditions: 120,
        excludedAdditions: 0,
        files: [{ path: 'src/a.ts', size: 1000, lines: 50, additions: 120, deletions: 0 }],
        allFiles: ['src/a.ts'],
        complexity: {
          maxComplexity: 99,
          avgComplexity: 50,
          analyzedFiles: 0,
          files: [],
          skippedFiles: [],
          syntaxErrorFiles: [],
          truncated: false,
          hasTsconfig: true,
        },
      };

      const result = decideLabels(metrics, customConfig, emptyViolations);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd.find(l => l.startsWith('complexity/'))).toBeUndefined();
    });

    it('should not add size label when disabled in config', () => {
      const customConfig = {
        ...config,
        size: { ...config.size, enabled: false },
      };

      const metrics: PRMetrics = {
        totalAdditions: 1200,
        excludedAdditions: 0,
        files: [{ path: 'src/a.ts', size: 1000, lines: 50, additions: 1200, deletions: 0 }],
        allFiles: ['src/a.ts'],
      };

      const result = decideLabels(metrics, customConfig, emptyViolations);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd.find(l => l.startsWith('size/'))).toBeUndefined();
      expect(decisions.reasoning.find(r => r.category === 'size')).toBeUndefined();
    });

    it('should not add category labels when disabled in config', () => {
      const customConfig = {
        ...config,
        categoryLabeling: { enabled: false },
      };

      const metrics: PRMetrics = {
        totalAdditions: 120,
        excludedAdditions: 0,
        files: [
          { path: '__tests__/foo.test.ts', size: 1000, lines: 50, additions: 120, deletions: 0 },
          { path: 'docs/guide.md', size: 500, lines: 20, additions: 30, deletions: 0 },
        ],
        allFiles: ['__tests__/foo.test.ts', 'docs/guide.md'],
      };

      const result = decideLabels(metrics, customConfig, emptyViolations);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd.find(l => l.startsWith('category/'))).toBeUndefined();
      expect(decisions.reasoning.find(r => r.category === 'category')).toBeUndefined();
    });

    it('should not add risk label when disabled in config', () => {
      const customConfig = {
        ...config,
        risk: { ...config.risk, enabled: false },
      };

      const metrics: PRMetrics = {
        totalAdditions: 120,
        excludedAdditions: 0,
        files: [{ path: 'src/critical.ts', size: 1000, lines: 50, additions: 120, deletions: 0 }],
        allFiles: ['src/critical.ts'],
      };

      const result = decideLabels(metrics, customConfig, emptyViolations);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd.find(l => l.startsWith('risk/'))).toBeUndefined();
      expect(decisions.reasoning.find(r => r.category === 'risk')).toBeUndefined();
    });

    it('should work with all label types disabled', () => {
      const customConfig = {
        ...config,
        size: { ...config.size, enabled: false },
        complexity: { ...config.complexity, enabled: false },
        categoryLabeling: { enabled: false },
        risk: { ...config.risk, enabled: false },
      };

      const metrics: PRMetrics = {
        totalAdditions: 1200,
        excludedAdditions: 0,
        files: [{ path: '__tests__/foo.test.ts', size: 1000, lines: 50, additions: 1200, deletions: 0 }],
        allFiles: ['__tests__/foo.test.ts'],
        complexity: {
          maxComplexity: 99,
          avgComplexity: 50,
          analyzedFiles: 1,
          files: [],
          skippedFiles: [],
          syntaxErrorFiles: [],
          truncated: false,
          hasTsconfig: true,
        },
      };

      const result = decideLabels(metrics, customConfig, emptyViolations);
      const decisions = result._unsafeUnwrap();
      expect(decisions.labelsToAdd).toEqual([]);
      expect(decisions.reasoning).toEqual([]);
    });
  });

  describe('decideCategoryLabels - New Categories', () => {
    const categories = defaultCategories;

    describe('category/feature', () => {
      it('should apply category/feature for feature files', () => {
        const files = ['src/features/auth.ts'];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/feature');
      });

      it('should apply category/feature for component files', () => {
        const files = ['src/components/Button.tsx'];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/feature');
      });

      it('should not apply category/feature for test files', () => {
        const files = ['src/components/Button.test.tsx'];
        const result = decideCategoryLabels(files, categories);
        expect(result).not.toContain('category/feature');
        expect(result).toContain('category/tests');
      });
    });

    describe('category/infrastructure', () => {
      it('should apply category/ci-cd (not infrastructure) for GitHub workflows', () => {
        const files = ['.github/workflows/ci.yml'];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/ci-cd');
        expect(result).not.toContain('category/infrastructure');
      });

      it('should apply category/infrastructure for Dockerfile', () => {
        const files = ['Dockerfile'];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/infrastructure');
      });

      it('should apply category/infrastructure for terraform files', () => {
        const files = ['terraform/main.tf'];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/infrastructure');
      });

      it('should apply category/infrastructure for k8s files', () => {
        const files = ['k8s/deployment.yaml'];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/infrastructure');
      });
    });

    describe('category/security', () => {
      it('should apply category/security for auth middleware', () => {
        const files = ['src/lib/auth/middleware.ts'];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/security');
      });

      it('should apply category/security for JWT utils', () => {
        const files = ['src/utils/jwt.ts'];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/security');
      });

      it('should apply category/security for .env files', () => {
        const files = ['.env.local'];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/security');
      });

      it('should apply category/security for secrets directory', () => {
        const files = ['secrets/api-keys.json'];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/security');
      });
    });

    describe('Multiple categories integration', () => {
      it('should apply multiple categories when multiple patterns match', () => {
        const files = ['src/features/auth.ts', '.github/workflows/ci.yml', 'src/utils/jwt.ts', 'docs/README.md'];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/feature');
        expect(result).toContain('category/ci-cd');
        expect(result).toContain('category/security');
        expect(result).toContain('category/documentation');
        expect(result).not.toContain('category/infrastructure');
        expect(result.length).toBeGreaterThanOrEqual(4);
      });

      it('should preserve existing category labels behavior', () => {
        const files = [
          '__tests__/foo.test.ts',
          '.github/workflows/ci.yml',
          'docs/README.md',
          'package.json',
          'tsconfig.json',
          '.kiro/specs/feature.md',
        ];
        const result = decideCategoryLabels(files, categories);
        expect(result).toContain('category/tests');
        expect(result).toContain('category/ci-cd');
        expect(result).toContain('category/documentation');
        expect(result).toContain('category/dependencies');
        expect(result).toContain('category/config');
        expect(result).toContain('category/spec');
      });

      it('should follow additive policy - categories do not conflict', () => {
        const files = ['src/features/profile.ts', '.github/workflows/deploy.yml'];
        const result = decideCategoryLabels(files, categories);
        // Both categories should be applied (additive policy)
        expect(result).toContain('category/feature');
        expect(result).toContain('category/ci-cd'); // .github/workflows/** matches ci-cd only
        expect(result).not.toContain('category/infrastructure'); // .github/** removed from infrastructure
        expect(result.length).toBe(2);
      });
    });
  });

  describe('decideCategoryLabelsWithFiles', () => {
    const categories = [testCategory, ciCdCategory, docsCategory];

    it('should return empty array for no matches', () => {
      const files = ['src/index.ts', 'src/utils.ts'];
      expect(decideCategoryLabelsWithFiles(files, categories)).toEqual([]);
    });

    it('should return single category label with matched files', () => {
      const files = ['__tests__/foo.test.ts', '__tests__/bar.test.ts'];
      const result = decideCategoryLabelsWithFiles(files, categories);
      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('category/tests');
      expect(result[0]?.matchedFiles).toEqual(['__tests__/foo.test.ts', '__tests__/bar.test.ts']);
    });

    it('should return multiple category labels with matched files', () => {
      const files = ['__tests__/foo.test.ts', 'docs/README.md', '.github/workflows/ci.yml', 'src/index.ts'];
      const result = decideCategoryLabelsWithFiles(files, categories);

      expect(result).toHaveLength(3);

      const testsResult = result.find(r => r.label === 'category/tests');
      expect(testsResult?.matchedFiles).toEqual(['__tests__/foo.test.ts']);

      const ciCdResult = result.find(r => r.label === 'category/ci-cd');
      expect(ciCdResult?.matchedFiles).toEqual(['.github/workflows/ci.yml']);

      const docsResult = result.find(r => r.label === 'category/documentation');
      expect(docsResult?.matchedFiles).toEqual(['docs/README.md']);
    });

    it('should match glob patterns correctly', () => {
      const files = ['src/components/Button.test.ts', 'src/utils/format.test.ts'];
      const result = decideCategoryLabelsWithFiles(files, categories);

      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('category/tests');
      expect(result[0]?.matchedFiles).toEqual(['src/components/Button.test.ts', 'src/utils/format.test.ts']);
    });

    it('should respect exclude patterns', () => {
      const categoriesWithExclude = [
        {
          label: 'category/source',
          patterns: ['src/**/*.ts'],
          exclude: ['**/*.test.ts'],
        },
      ];

      const files = ['src/index.ts', 'src/utils.test.ts', 'src/components/Button.ts'];
      const result = decideCategoryLabelsWithFiles(files, categoriesWithExclude);

      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('category/source');
      expect(result[0]?.matchedFiles).toEqual(['src/index.ts', 'src/components/Button.ts']);
      expect(result[0]?.matchedFiles).not.toContain('src/utils.test.ts');
    });

    it('should handle multiple files matching the same category', () => {
      const files = ['docs/README.md', 'docs/guide.md', 'docs/api/index.md'];
      const result = decideCategoryLabelsWithFiles(files, categories);

      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('category/documentation');
      expect(result[0]?.matchedFiles).toEqual(['docs/README.md', 'docs/guide.md', 'docs/api/index.md']);
    });
  });

  describe('decideLabels - matchedFiles validation', () => {
    const config = DEFAULT_LABELER_CONFIG;

    it('should include matchedFiles for size label', () => {
      const metrics: PRMetrics = {
        totalAdditions: 250,
        excludedAdditions: 0,
        files: [
          { path: 'src/file1.ts', size: 5000, lines: 150, additions: 150, deletions: 20 },
          { path: 'src/file2.ts', size: 3000, lines: 80, additions: 100, deletions: 10 },
        ],
        allFiles: ['src/file1.ts', 'src/file2.ts'],
      };

      const result = decideLabels(metrics, config, emptyViolations);
      const decisions = result._unsafeUnwrap();

      const sizeReasoning = decisions.reasoning.find(r => r.category === 'size');
      expect(sizeReasoning).toBeDefined();
      expect(sizeReasoning?.matchedFiles).toEqual(['src/file1.ts', 'src/file2.ts']);
    });

    it('should include matchedFiles for complexity label', () => {
      const metrics: PRMetrics = {
        totalAdditions: 120,
        excludedAdditions: 0,
        files: [{ path: 'src/complex.ts', size: 5000, lines: 150, additions: 120, deletions: 10 }],
        allFiles: ['src/complex.ts'],
        complexity: {
          maxComplexity: 25,
          avgComplexity: 25,
          analyzedFiles: 1,
          files: [{ path: 'src/complex.ts', complexity: 25, functions: [] }],
          skippedFiles: [],
          syntaxErrorFiles: [],
          truncated: false,
          hasTsconfig: true,
        },
      };

      const result = decideLabels(metrics, config, emptyViolations);
      const decisions = result._unsafeUnwrap();

      const complexityReasoning = decisions.reasoning.find(r => r.category === 'complexity');
      expect(complexityReasoning).toBeDefined();
      expect(complexityReasoning?.matchedFiles).toContain('src/complex.ts');
    });

    it('should include matchedFiles for category labels', () => {
      const metrics: PRMetrics = {
        totalAdditions: 100,
        excludedAdditions: 0,
        files: [{ path: '__tests__/test.test.ts', size: 3000, lines: 80, additions: 100, deletions: 10 }],
        allFiles: ['__tests__/test.test.ts', 'docs/README.md'],
      };

      const result = decideLabels(metrics, config, emptyViolations);
      const decisions = result._unsafeUnwrap();

      const categoryReasoning = decisions.reasoning.filter(r => r.category === 'category');
      expect(categoryReasoning.length).toBeGreaterThan(0);

      const testsReasoning = categoryReasoning.find(r => r.label === 'category/tests');
      expect(testsReasoning?.matchedFiles).toEqual(['__tests__/test.test.ts']);

      const docsReasoning = categoryReasoning.find(r => r.label === 'category/documentation');
      expect(docsReasoning?.matchedFiles).toEqual(['docs/README.md']);
    });

    it('should include matchedFiles for risk label', () => {
      const metrics: PRMetrics = {
        totalAdditions: 100,
        excludedAdditions: 0,
        files: [
          { path: 'src/core.ts', size: 5000, lines: 150, additions: 80, deletions: 10 },
          { path: 'package.json', size: 2000, lines: 50, additions: 20, deletions: 5 },
        ],
        allFiles: ['src/core.ts', 'package.json'],
      };

      const result = decideLabels(metrics, config, emptyViolations);
      const decisions = result._unsafeUnwrap();

      const riskReasoning = decisions.reasoning.find(r => r.category === 'risk');
      expect(riskReasoning).toBeDefined();
      expect(riskReasoning?.matchedFiles).toContain('src/core.ts');
      expect(riskReasoning?.matchedFiles).toContain('package.json');
    });
  });

  describe('decideViolationLabels', () => {
    it('should return empty arrays when no violations', () => {
      const result = decideViolationLabels(emptyViolations);
      expect(result.labels).toEqual([]);
      expect(result.reasoning).toEqual([]);
    });

    it('should add auto/large-files label when largeFiles violation exists', () => {
      const violations = {
        ...emptyViolations,
        largeFiles: [
          {
            file: 'large.ts',
            actualValue: 2048000,
            limit: 1048576,
            violationType: 'size' as const,
            severity: 'critical' as const,
          },
        ],
      };
      const result = decideViolationLabels(violations);
      expect(result.labels).toContain('auto/large-files');
      expect(result.reasoning).toHaveLength(1);
      expect(result.reasoning[0]?.category).toBe('violation');
      expect(result.reasoning[0]?.matchedFiles).toEqual(['large.ts']);
    });

    it('should add auto/too-many-lines label when exceedsFileLines violation exists', () => {
      const violations = {
        ...emptyViolations,
        exceedsFileLines: [
          {
            file: 'long.ts',
            actualValue: 600,
            limit: 500,
            violationType: 'lines' as const,
            severity: 'warning' as const,
          },
        ],
      };
      const result = decideViolationLabels(violations);
      expect(result.labels).toContain('auto/too-many-lines');
      expect(result.reasoning).toHaveLength(1);
      expect(result.reasoning[0]?.category).toBe('violation');
      expect(result.reasoning[0]?.matchedFiles).toEqual(['long.ts']);
    });

    it('should add auto/excessive-changes label when exceedsAdditions is true', () => {
      const violations = {
        ...emptyViolations,
        exceedsAdditions: true,
      };
      const result = decideViolationLabels(violations);
      expect(result.labels).toContain('auto/excessive-changes');
      expect(result.reasoning).toHaveLength(1);
      expect(result.reasoning[0]?.category).toBe('violation');
      expect(result.reasoning[0]?.matchedFiles).toEqual([]);
    });

    it('should add auto/too-many-files label when exceedsFileCount is true', () => {
      const violations = {
        ...emptyViolations,
        exceedsFileCount: true,
      };
      const result = decideViolationLabels(violations);
      expect(result.labels).toContain('auto/too-many-files');
      expect(result.reasoning).toHaveLength(1);
      expect(result.reasoning[0]?.category).toBe('violation');
      expect(result.reasoning[0]?.matchedFiles).toEqual([]);
    });

    it('should add multiple violation labels when multiple violations exist', () => {
      const violations = {
        largeFiles: [
          {
            file: 'large.ts',
            actualValue: 2048000,
            limit: 1048576,
            violationType: 'size' as const,
            severity: 'critical' as const,
          },
        ],
        exceedsFileLines: [
          {
            file: 'long.ts',
            actualValue: 600,
            limit: 500,
            violationType: 'lines' as const,
            severity: 'warning' as const,
          },
        ],
        exceedsAdditions: true,
        exceedsFileCount: true,
      };
      const result = decideViolationLabels(violations);
      expect(result.labels).toHaveLength(4);
      expect(result.labels).toContain('auto/large-files');
      expect(result.labels).toContain('auto/too-many-lines');
      expect(result.labels).toContain('auto/excessive-changes');
      expect(result.labels).toContain('auto/too-many-files');
      expect(result.reasoning).toHaveLength(4);
    });
  });
});
