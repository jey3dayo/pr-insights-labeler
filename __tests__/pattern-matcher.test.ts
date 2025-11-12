import { describe, expect, it } from 'vitest';

import { getDefaultExcludePatterns, isExcluded, normalizePattern } from '../src/pattern-matcher';

describe('PatternMatcher', () => {
  describe('getDefaultExcludePatterns', () => {
    it('should return comprehensive default exclusion patterns', () => {
      const patterns = getDefaultExcludePatterns();

      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBeGreaterThanOrEqual(40);

      // Verify some key patterns are included
      const expectedCategories = [
        '*.lock', // lock files
        '**/node_modules/**', // dependencies
        '*.min.js', // minified files
        '**/dist/**', // build outputs (any location)
        '*.map', // source maps
        'coverage/**', // test coverage
        '*.log', // log files
        '.git/**', // git directory
      ];

      expectedCategories.forEach(pattern => {
        expect(patterns).toContain(pattern);
      });
    });

    it('should include all major lock file patterns', () => {
      const patterns = getDefaultExcludePatterns();

      const lockFiles = [
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'Gemfile.lock',
        'Cargo.lock',
        'composer.lock',
        'poetry.lock',
        'Pipfile.lock',
      ];

      lockFiles.forEach(lockFile => {
        // Either the specific file or a pattern that matches it should be included
        const hasPattern = patterns.some(p => p === lockFile || p === '*.lock' || p === `**/${lockFile}`);
        expect(hasPattern).toBe(true);
      });
    });

    it('should include build and compiled output patterns', () => {
      const patterns = getDefaultExcludePatterns();

      const buildPatterns = [
        '**/dist/**',
        '**/build/**',
        '**/out/**',
        '.next/**',
        '_next/**',
        '**/target/**',
        '*.min.js',
        '*.min.css',
        '*.bundle.js',
      ];

      buildPatterns.forEach(pattern => {
        expect(patterns).toContain(pattern);
      });
    });

    it('should include IDE and editor patterns', () => {
      const patterns = getDefaultExcludePatterns();

      const idePatterns = ['.vscode/**', '.idea/**', '*.swp', '*.swo', '.DS_Store'];

      idePatterns.forEach(pattern => {
        expect(patterns).toContain(pattern);
      });
    });

    it('should include generated and cache patterns', () => {
      const patterns = getDefaultExcludePatterns();

      const generatedPatterns = ['*.generated.*', '*.gen.ts', '*.pb.go', '.cache/**', '.parcel-cache/**', '.turbo/**'];

      generatedPatterns.forEach(pattern => {
        expect(patterns).toContain(pattern);
      });
    });

    it('should include spec-driven metadata and documentation patterns', () => {
      const patterns = getDefaultExcludePatterns();

      const metadataPatterns = ['.claude/**', '.codex/**', '.kiro/**', 'docs/**', 'documentation/**'];

      metadataPatterns.forEach(pattern => {
        expect(patterns).toContain(pattern);
      });
    });
  });

  describe('normalizePattern', () => {
    it('should normalize paths to use forward slashes', () => {
      expect(normalizePattern('src\\test\\file.ts')).toBe('src/test/file.ts');
      expect(normalizePattern('src/test/file.ts')).toBe('src/test/file.ts');
      expect(normalizePattern('C:\\Users\\test\\file.ts')).toBe('C:/Users/test/file.ts');
    });

    it('should remove leading ./ from patterns', () => {
      expect(normalizePattern('./src/test.ts')).toBe('src/test.ts');
      expect(normalizePattern('.\\src\\test.ts')).toBe('src/test.ts');
      expect(normalizePattern('src/test.ts')).toBe('src/test.ts');
    });

    it('should handle empty strings and edge cases', () => {
      expect(normalizePattern('')).toBe('');
      expect(normalizePattern('.')).toBe('.');
      expect(normalizePattern('./')).toBe('');
      expect(normalizePattern('/')).toBe('/');
    });

    it('should preserve glob patterns', () => {
      expect(normalizePattern('**/*.ts')).toBe('**/*.ts');
      expect(normalizePattern('src/**/*.{ts,js}')).toBe('src/**/*.{ts,js}');
      expect(normalizePattern('*.lock')).toBe('*.lock');
      expect(normalizePattern('[!.]*.js')).toBe('[!.]*.js');
    });
  });

  describe('isExcluded', () => {
    it('should exclude files matching default patterns', () => {
      const defaultPatterns = getDefaultExcludePatterns();

      // Test lock files
      expect(isExcluded('package-lock.json', defaultPatterns)).toBe(true);
      expect(isExcluded('yarn.lock', defaultPatterns)).toBe(true);
      expect(isExcluded('src/package-lock.json', defaultPatterns)).toBe(true);

      // Test node_modules
      expect(isExcluded('node_modules/react/index.js', defaultPatterns)).toBe(true);
      expect(isExcluded('packages/app/node_modules/test.js', defaultPatterns)).toBe(true);

      // Test minified files
      expect(isExcluded('app.min.js', defaultPatterns)).toBe(true);
      expect(isExcluded('styles.min.css', defaultPatterns)).toBe(true);

      // Test build directories (root level)
      expect(isExcluded('dist/index.js', defaultPatterns)).toBe(true);
      expect(isExcluded('build/app.js', defaultPatterns)).toBe(true);

      // Test nested build directories (monorepo, nested structures)
      expect(isExcluded('packages/app/dist/index.js', defaultPatterns)).toBe(true);
      expect(isExcluded('packages/lib/build/main.js', defaultPatterns)).toBe(true);
      expect(isExcluded('src/compiled/dist/output.js', defaultPatterns)).toBe(true);
      expect(isExcluded('apps/web/out/bundle.js', defaultPatterns)).toBe(true);

      // Test files
      expect(isExcluded('__tests__/unit.test.ts', defaultPatterns)).toBe(true);
      expect(isExcluded('src/components/__tests__/Button.test.tsx', defaultPatterns)).toBe(true);
      expect(isExcluded('tests/unit.spec.js', defaultPatterns)).toBe(true);
    });

    it('should not exclude files that dont match patterns', () => {
      const defaultPatterns = getDefaultExcludePatterns();

      expect(isExcluded('src/index.ts', defaultPatterns)).toBe(false);
      expect(isExcluded('README.md', defaultPatterns)).toBe(false);
      expect(isExcluded('src/components/Button.tsx', defaultPatterns)).toBe(false);
    });

    it('should work with custom patterns', () => {
      const customPatterns = ['*.test.ts', 'src/temp/**', '*.tmp'];

      expect(isExcluded('app.test.ts', customPatterns)).toBe(true);
      expect(isExcluded('src/temp/file.js', customPatterns)).toBe(true);
      expect(isExcluded('data.tmp', customPatterns)).toBe(true);
      expect(isExcluded('app.ts', customPatterns)).toBe(false);
      expect(isExcluded('src/main/file.js', customPatterns)).toBe(false);
    });

    it('should combine default and custom patterns', () => {
      const defaultPatterns = getDefaultExcludePatterns();
      const customPatterns = ['*.custom', 'temp/**'];
      const allPatterns = [...defaultPatterns, ...customPatterns];

      // Should match default patterns
      expect(isExcluded('package-lock.json', allPatterns)).toBe(true);
      expect(isExcluded('node_modules/test.js', allPatterns)).toBe(true);

      // Should match custom patterns
      expect(isExcluded('file.custom', allPatterns)).toBe(true);
      expect(isExcluded('temp/data.json', allPatterns)).toBe(true);

      // Should not match either
      expect(isExcluded('src/index.ts', allPatterns)).toBe(false);
    });

    it('should handle paths with backslashes correctly', () => {
      const patterns = ['src/test/**', '*.lock'];

      // Windows-style paths should be normalized and matched
      expect(isExcluded('src\\test\\file.ts', patterns)).toBe(true);
      expect(isExcluded('src\\other\\file.ts', patterns)).toBe(false);
      expect(isExcluded('package.lock', patterns)).toBe(true);
    });

    it('should handle complex glob patterns', () => {
      const patterns = ['**/*.{min,bundle}.{js,css}', 'src/**/test-*.ts', 'build/**/*.js'];

      expect(isExcluded('dist/app.min.js', patterns)).toBe(true);
      expect(isExcluded('styles.bundle.css', patterns)).toBe(true);
      expect(isExcluded('src/utils/test-helper.ts', patterns)).toBe(true);
      expect(isExcluded('build/output/app.js', patterns)).toBe(true);
      expect(isExcluded('app.js', patterns)).toBe(false);
      expect(isExcluded('src/utils/helper.ts', patterns)).toBe(false);
    });

    it('should be case-sensitive by default', () => {
      const patterns = ['*.TXT', 'README.MD'];

      expect(isExcluded('file.TXT', patterns)).toBe(true);
      expect(isExcluded('file.txt', patterns)).toBe(false);
      expect(isExcluded('README.MD', patterns)).toBe(true);
      expect(isExcluded('readme.md', patterns)).toBe(false);
    });

    it('should match nested patterns correctly', () => {
      const patterns = ['**/node_modules/**', '**/coverage/**', '**/.git/**'];

      expect(isExcluded('node_modules/package/index.js', patterns)).toBe(true);
      expect(isExcluded('packages/app/node_modules/lib/file.js', patterns)).toBe(true);
      expect(isExcluded('coverage/lcov.info', patterns)).toBe(true);
      expect(isExcluded('src/coverage/report.html', patterns)).toBe(true);
      expect(isExcluded('.git/config', patterns)).toBe(true);
      expect(isExcluded('project/.git/hooks/pre-commit', patterns)).toBe(true);
    });

    it('should handle empty pattern arrays', () => {
      expect(isExcluded('any-file.ts', [])).toBe(false);
      expect(isExcluded('node_modules/test.js', [])).toBe(false);
    });
  });
});
