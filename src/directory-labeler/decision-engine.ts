import * as core from '@actions/core';
import { ok, type Result } from 'neverthrow';

import { createPatternError } from '../errors/index.js';
import { normalizePath } from '../utils/path-utils.js';
import { compilePatterns, matchIncludePatterns } from './pattern-matcher.js';
import { DEFAULT_EXCLUDES, DEFAULT_OPTIONS, type DirectoryLabelerConfig } from './types.js';

export interface LabelDecision {
  label: string;
  matchedPattern: string;
  matchedPatterns?: string[];
  matchedFiles: string[];
  priority: number;
  matchLength: number;
}

export function decideLabelsForFiles(
  files: string[],
  config: DirectoryLabelerConfig,
): Result<LabelDecision[], ReturnType<typeof createPatternError>> {
  if (files.length === 0) {
    core.debug('No files to process. Returning empty label decisions.');
    return ok([]);
  }

  if (config.rules.length === 0) {
    core.debug('No rules defined in configuration. Returning empty label decisions.');
    return ok([]);
  }

  const options = config.options || DEFAULT_OPTIONS;

  const defaultExcludePatterns =
    config.useDefaultExcludes !== false ? compilePatterns(DEFAULT_EXCLUDES as unknown as string[], options) : [];

  const labelToFiles = new Map<
    string,
    { files: Set<string>; pattern: string; priority: number; matchLength: number }
  >();

  for (const file of files) {
    const normalizedFile = normalizePath(file);

    let bestMatch: { label: string; pattern: string; priority: number; matchLength: number } | null = null;

    for (const rule of config.rules) {
      const includePatterns = compilePatterns(rule.include, options, rule.priority);

      const userExcludePatterns = rule.exclude ? compilePatterns(rule.exclude, options) : [];
      const allExcludePatterns = [...defaultExcludePatterns, ...userExcludePatterns];

      const matchResult = matchIncludePatterns(normalizedFile, includePatterns, allExcludePatterns);

      if (matchResult.matched && matchResult.matchedPattern && matchResult.matchLength !== undefined) {
        const currentPriority = matchResult.priority ?? 0;
        const currentMatchLength = matchResult.matchLength;

        if (
          !bestMatch ||
          currentPriority > bestMatch.priority ||
          (currentPriority === bestMatch.priority && currentMatchLength > bestMatch.matchLength)
        ) {
          bestMatch = {
            label: rule.label,
            pattern: matchResult.matchedPattern,
            priority: currentPriority,
            matchLength: currentMatchLength,
          };
        }
      }
    }

    if (bestMatch) {
      const existing = labelToFiles.get(bestMatch.label);
      if (existing) {
        existing.files.add(normalizedFile);
      } else {
        labelToFiles.set(bestMatch.label, {
          files: new Set([normalizedFile]),
          pattern: bestMatch.pattern,
          priority: bestMatch.priority,
          matchLength: bestMatch.matchLength,
        });
      }
    }
  }

  const decisions: LabelDecision[] = [];
  for (const [label, info] of labelToFiles.entries()) {
    decisions.push({
      label,
      matchedPattern: info.pattern,
      matchedFiles: Array.from(info.files),
      priority: info.priority,
      matchLength: info.matchLength,
    });
  }

  decisions.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return b.matchLength - a.matchLength;
  });

  core.debug(`Decided ${decisions.length} labels for ${files.length} files.`);
  return ok(decisions);
}

export function filterByMaxLabels(
  decisions: LabelDecision[],
  maxLabels: number,
): {
  selected: LabelDecision[];
  rejected: Array<{ label: string; reason: string }>;
} {
  if (maxLabels === 0 || decisions.length <= maxLabels) {
    return { selected: decisions, rejected: [] };
  }

  const sorted = [...decisions].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return b.matchLength - a.matchLength;
  });

  const selected = sorted.slice(0, maxLabels);
  const rejected = sorted.slice(maxLabels).map(d => ({
    label: d.label,
    reason: `Exceeded max_labels limit (${maxLabels}). Label priority: ${d.priority}, match length: ${d.matchLength}`,
  }));

  core.warning(
    `max_labels=${maxLabels} exceeded. Selected ${selected.length} labels, rejected ${rejected.length} labels.`,
  );

  return { selected, rejected };
}
