import { minimatch } from 'minimatch';

import { DEFAULT_EXCLUDE_PATTERNS } from './configs/default-excludes.js';
import { normalizePath } from './utils/path-utils.js';

export function getDefaultExcludePatterns(): string[] {
  return [...DEFAULT_EXCLUDE_PATTERNS];
}

export function normalizePattern(pattern: string): string {
  return normalizePath(pattern);
}

export function isExcluded(filePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) {
    return false;
  }

  const normalizedPath = normalizePattern(filePath);

  let excluded = false;

  for (const pattern of patterns) {
    const isNegation = pattern.startsWith('!');
    const normalizedPattern = normalizePattern(isNegation ? pattern.slice(1) : pattern);

    const options = {
      dot: true,
      matchBase: !normalizedPattern.includes('/'),
      windowsPathsNoEscape: true,
    };

    if (minimatch(normalizedPath, normalizedPattern, options)) {
      if (isNegation) {
        return false;
      }
      excluded = true;
    }
  }

  return excluded;
}
