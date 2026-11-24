import type { ComplexityMetrics, FileComplexity, FileMetrics, PRMetrics } from '../../src/labeler-types.js';

export const smallTsFile: FileMetrics = {
  path: 'src/utils/helper.ts',
  size: 3000,
  lines: 80,
  additions: 50,
  deletions: 10,
};

export const mediumTestFile: FileMetrics = {
  path: '__tests__/feature.test.ts',
  size: 5000,
  lines: 150,
  additions: 100,
  deletions: 20,
};

export const largeDocFile: FileMetrics = {
  path: 'docs/architecture.md',
  size: 10000,
  lines: 300,
  additions: 200,
  deletions: 50,
};

export const configFile: FileMetrics = {
  path: '.github/workflows/ci.yml',
  size: 1500,
  lines: 50,
  additions: 20,
  deletions: 5,
};

export const lowComplexityFunction: FileComplexity = {
  path: 'src/utils/simple.ts',
  complexity: 3,
  functions: [{ name: 'simpleFunction', complexity: 3, loc: { start: 1, end: 10 } }],
};

export const mediumComplexityFunction: FileComplexity = {
  path: 'src/services/processor.ts',
  complexity: 15,
  functions: [{ name: 'processData', complexity: 15, loc: { start: 1, end: 50 } }],
};

export const highComplexityFunction: FileComplexity = {
  path: 'src/core/engine.ts',
  complexity: 25,
  functions: [{ name: 'complexEngine', complexity: 25, loc: { start: 1, end: 100 } }],
};

export const defaultComplexityMetrics: ComplexityMetrics = {
  maxComplexity: 15,
  avgComplexity: 8.5,
  analyzedFiles: 3,
  files: [lowComplexityFunction, mediumComplexityFunction],
  skippedFiles: [],
  syntaxErrorFiles: [],
  truncated: false,
  hasTsconfig: true,
};

export const smallPRMetrics: PRMetrics = {
  totalAdditions: 150,
  excludedAdditions: 0,
  files: [smallTsFile, mediumTestFile],
};

export const mediumPRMetrics: PRMetrics = {
  totalAdditions: 350,
  excludedAdditions: 0,
  files: [smallTsFile, mediumTestFile, largeDocFile],
};

export const largePRMetrics: PRMetrics = {
  totalAdditions: 750,
  excludedAdditions: 0,
  files: [smallTsFile, mediumTestFile, largeDocFile, { ...largeDocFile, path: 'docs/api.md', additions: 400 }],
};

export const xlargePRMetrics: PRMetrics = {
  totalAdditions: 2000,
  excludedAdditions: 0,
  files: [
    smallTsFile,
    mediumTestFile,
    largeDocFile,
    { ...largeDocFile, path: 'docs/api.md', additions: 800 },
    { ...largeDocFile, path: 'docs/guide.md', additions: 750 },
  ],
};

export const xxlargePRMetrics: PRMetrics = {
  totalAdditions: 5000,
  excludedAdditions: 0,
  files: [
    smallTsFile,
    mediumTestFile,
    largeDocFile,
    { ...largeDocFile, path: 'docs/api.md', additions: 1500 },
    { ...largeDocFile, path: 'docs/guide.md', additions: 1500 },
    { ...largeDocFile, path: 'docs/tutorial.md', additions: 1500 },
  ],
};

export const defaultPRMetrics: PRMetrics = mediumPRMetrics;

export const prWithComplexity: PRMetrics = {
  ...mediumPRMetrics,
  complexity: defaultComplexityMetrics,
};

export const createMockFileMetrics = (overrides?: Partial<FileMetrics>): FileMetrics => ({
  ...smallTsFile,
  ...overrides,
});

export const createMockPRMetrics = (overrides?: Partial<PRMetrics>): PRMetrics => ({
  ...defaultPRMetrics,
  ...overrides,
});

export const createMockComplexityMetrics = (overrides?: Partial<ComplexityMetrics>): ComplexityMetrics => ({
  ...defaultComplexityMetrics,
  ...overrides,
});

export const createPRBySize = (size: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge'): PRMetrics => {
  switch (size) {
    case 'small':
      return smallPRMetrics;
    case 'medium':
      return mediumPRMetrics;
    case 'large':
      return largePRMetrics;
    case 'xlarge':
      return xlargePRMetrics;
    case 'xxlarge':
      return xxlargePRMetrics;
  }
};
