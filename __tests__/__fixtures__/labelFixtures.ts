import { DEFAULT_CATEGORIES } from '../../src/configs/categories.js';
import type { CategoryConfig, ComplexityConfig, SizeConfig } from '../../src/labeler-types.js';
import type { RiskConfig } from '../../src/types/config.js';

export const defaultSizeThresholds = {
  small: 200,
  medium: 500,
  large: 1000,
  xlarge: 3000,
};

export const defaultComplexityThresholds = {
  medium: 10,
  high: 20,
};

export const relaxedSizeThresholds = {
  small: 500,
  medium: 1000,
  large: 2000,
  xlarge: 5000,
};

export const strictSizeThresholds = {
  small: 100,
  medium: 250,
  large: 500,
  xlarge: 1500,
};

export const relaxedComplexityThresholds = {
  medium: 15,
  high: 30,
};

export const strictComplexityThresholds = {
  medium: 5,
  high: 10,
};

export const defaultSizeConfig: SizeConfig = {
  enabled: true,
  thresholds: defaultSizeThresholds,
};

export const defaultComplexityConfig: ComplexityConfig = {
  enabled: true,
  metric: 'cyclomatic',
  thresholds: defaultComplexityThresholds,
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  exclude: ['**/dist/**', '**/build/**', '**/node_modules/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
};

export const defaultRiskConfig: RiskConfig = {
  enabled: true,
  high_if_no_tests_for_core: true,
  core_paths: ['src/**'],
  config_files: ['.github/workflows/**', 'package.json', 'tsconfig.json'],
  use_ci_status: true,
};

export const defaultCategories: CategoryConfig[] = DEFAULT_CATEGORIES;

export const testCategory: CategoryConfig = {
  label: 'category/tests',
  patterns: ['__tests__/**', '**/*.test.ts'],
};

export const ciCdCategory: CategoryConfig = {
  label: 'category/ci-cd',
  patterns: ['.github/workflows/**'],
};

export const docsCategory: CategoryConfig = {
  label: 'category/documentation',
  patterns: ['docs/**', '**/*.md'],
  exclude: ['.kiro/**', '.specify/**', 'spec/**', 'specs/**'],
};

export const configCategory: CategoryConfig = {
  label: 'category/config',
  patterns: ['**/*.config.js', '**/*.config.ts', '**/tsconfig.json', '**/.eslintrc*'],
};

export const specCategory: CategoryConfig = {
  label: 'category/spec',
  patterns: ['.kiro/**', '.specify/**', 'spec/**', 'specs/**'],
};

export const dependenciesCategory: CategoryConfig = {
  label: 'category/dependencies',
  patterns: ['**/package.json', '**/pnpm-lock.yaml', '**/yarn.lock', '**/package-lock.json'],
};

export const createMockSizeConfig = (overrides?: Partial<SizeConfig>): SizeConfig => ({
  ...defaultSizeConfig,
  ...overrides,
});

export const createMockComplexityConfig = (overrides?: Partial<ComplexityConfig>): ComplexityConfig => ({
  ...defaultComplexityConfig,
  ...overrides,
});

export const createMockRiskConfig = (overrides?: Partial<RiskConfig>): RiskConfig => ({
  ...defaultRiskConfig,
  ...overrides,
});

export const createMockCategoryConfig = (overrides?: Partial<CategoryConfig>): CategoryConfig => ({
  label: 'category/custom',
  patterns: ['custom/**'],
  ...overrides,
});

export const createMockCategories = (categories?: CategoryConfig[]): CategoryConfig[] => {
  return categories ?? defaultCategories;
};
