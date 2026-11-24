import { describe, expect, it } from 'vitest';

import { convertCategoriesToDirectoryConfig } from '../../src/directory-labeler/category-to-directory-config.js';
import type { CategoryConfig } from '../../src/types.js';

describe('convertCategoriesToDirectoryConfig', () => {
  it('should convert simple category config to directory labeler config', () => {
    const categories: CategoryConfig[] = [
      {
        label: 'category/tests',
        patterns: ['__tests__/**', '**/*.test.ts'],
      },
    ];

    const result = convertCategoriesToDirectoryConfig(categories);

    expect(result).toEqual({
      version: 1,
      rules: [
        {
          label: 'category/tests',
          include: ['__tests__/**', '**/*.test.ts'],
        },
      ],
      useDefaultExcludes: true,
    });
  });

  it('should convert category config with exclude patterns', () => {
    const categories: CategoryConfig[] = [
      {
        label: 'category/tests',
        patterns: ['__tests__/**', '**/*.test.ts'],
        exclude: ['**/*.skip.test.ts'],
      },
    ];

    const result = convertCategoriesToDirectoryConfig(categories);

    expect(result).toEqual({
      version: 1,
      rules: [
        {
          label: 'category/tests',
          include: ['__tests__/**', '**/*.test.ts'],
          exclude: ['**/*.skip.test.ts'],
        },
      ],
      useDefaultExcludes: true,
    });
  });

  it('should convert multiple categories', () => {
    const categories: CategoryConfig[] = [
      {
        label: 'category/tests',
        patterns: ['__tests__/**'],
      },
      {
        label: 'category/docs',
        patterns: ['docs/**', '**/*.md'],
      },
      {
        label: 'category/ci-cd',
        patterns: ['.github/workflows/**'],
        exclude: ['.github/workflows/*.bak'],
      },
    ];

    const result = convertCategoriesToDirectoryConfig(categories);

    expect(result).toEqual({
      version: 1,
      rules: [
        {
          label: 'category/tests',
          include: ['__tests__/**'],
        },
        {
          label: 'category/docs',
          include: ['docs/**', '**/*.md'],
        },
        {
          label: 'category/ci-cd',
          include: ['.github/workflows/**'],
          exclude: ['.github/workflows/*.bak'],
        },
      ],
      useDefaultExcludes: true,
    });
  });

  it('should handle empty categories array', () => {
    const categories: CategoryConfig[] = [];

    const result = convertCategoriesToDirectoryConfig(categories);

    expect(result).toEqual({
      version: 1,
      rules: [],
      useDefaultExcludes: true,
    });
  });

  it('should handle category without exclude field', () => {
    const categories: CategoryConfig[] = [
      {
        label: 'category/backend',
        patterns: ['src/api/**', 'src/services/**'],
      },
    ];

    const result = convertCategoriesToDirectoryConfig(categories);

    expect(result.rules[0]).toEqual({
      label: 'category/backend',
      include: ['src/api/**', 'src/services/**'],
    });
    expect(result.rules[0]).not.toHaveProperty('exclude');
  });

  it('should handle category with empty exclude array', () => {
    const categories: CategoryConfig[] = [
      {
        label: 'category/config',
        patterns: ['*.config.js', '*.config.ts'],
        exclude: [],
      },
    ];

    const result = convertCategoriesToDirectoryConfig(categories);

    expect(result.rules[0]).toEqual({
      label: 'category/config',
      include: ['*.config.js', '*.config.ts'],
    });
    expect(result.rules[0]).not.toHaveProperty('exclude');
  });

  it('should preserve pattern arrays (no shared references)', () => {
    const categories: CategoryConfig[] = [
      {
        label: 'category/tests',
        patterns: ['__tests__/**'],
        exclude: ['**/*.skip.ts'],
      },
    ];

    const result = convertCategoriesToDirectoryConfig(categories);

    categories[0].patterns.push('new-pattern');
    categories[0].exclude?.push('new-exclude');

    expect(result.rules[0].include).toEqual(['__tests__/**']);
    expect(result.rules[0].exclude).toEqual(['**/*.skip.ts']);
  });
});
