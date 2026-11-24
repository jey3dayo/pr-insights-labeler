import { minimatch } from 'minimatch';

import { normalizePath as normalizePathUtil } from '../utils/path-utils.js';
import type { MinimatchOptions } from './types.js';

export interface CompiledPattern {
  pattern: string;
  matcher: (path: string) => boolean;
  priority?: number;
}

export interface MatchResult {
  matched: boolean;
  matchedPattern?: string;
  matchLength?: number;
  priority?: number;
}

export function compilePatterns(patterns: string[], options: MinimatchOptions, priority?: number): CompiledPattern[] {
  const minimatchOptions = {
    dot: options.dot ?? true,
    nocase: options.nocase ?? false,
    matchBase: options.matchBase ?? false,
    windowsPathsNoEscape: true,
  };

  return patterns.map(pattern => {
    const normalizedPattern = normalizePathUtil(pattern);

    const compiled: CompiledPattern = {
      pattern: normalizedPattern,
      matcher: (path: string) => {
        const normalizedPath = normalizePathUtil(path);
        return minimatch(normalizedPath, normalizedPattern, minimatchOptions);
      },
    };

    if (priority !== undefined) {
      compiled.priority = priority;
    }

    return compiled;
  });
}

export function matchIncludePatterns(
  filePath: string,
  includePatterns: CompiledPattern[],
  excludePatterns: CompiledPattern[],
): MatchResult {
  const normalizedPath = normalizePathUtil(filePath);

  for (const excludePattern of excludePatterns) {
    if (excludePattern.matcher(normalizedPath)) {
      return { matched: false };
    }
  }

  const matches: Array<{
    pattern: string;
    matchLength: number;
    priority: number;
    index: number;
  }> = [];

  for (let i = 0; i < includePatterns.length; i++) {
    const includePattern = includePatterns[i];
    if (!includePattern) {
      continue;
    }

    if (includePattern.matcher(normalizedPath)) {
      const matchLength = calculateMatchLength(includePattern.pattern, normalizedPath);

      matches.push({
        pattern: includePattern.pattern,
        matchLength,
        priority: includePattern.priority ?? 0,
        index: i,
      });
    }
  }

  if (matches.length === 0) {
    return { matched: false };
  }

  matches.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    if (a.matchLength !== b.matchLength) {
      return b.matchLength - a.matchLength;
    }

    return a.index - b.index;
  });

  const bestMatch = matches[0];
  if (!bestMatch) {
    return { matched: false };
  }

  return {
    matched: true,
    matchedPattern: bestMatch.pattern,
    matchLength: bestMatch.matchLength,
    priority: bestMatch.priority,
  };
}

function calculateMatchLength(pattern: string, _path: string): number {
  return pattern.length;
}
