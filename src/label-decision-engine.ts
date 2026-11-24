import { minimatch } from 'minimatch';
import { ok, Result } from 'neverthrow';

import { COMPLEXITY_LABELS, VIOLATION_LABELS } from './configs/label-defaults.js';
import type { Violations } from './errors/types.js';
import { t } from './i18n.js';
import { decideRiskLabel, getRiskAffectedFiles, getRiskReason } from './label-decisions/risk-evaluator.js';
import type { LabelDecisions, LabelerConfig, LabelReasoning, PRMetrics } from './labeler-types.js';
import type { PRContext } from './types.js';
import { extractNamespace, matchesNamespacePattern } from './utils/namespace-utils.js';
import { calculateSizeLabel } from './utils/size-label-utils.js';

export function decideLabels(
  metrics: PRMetrics,
  config: LabelerConfig,
  violations: Violations,
  prContext?: PRContext,
  violationLabels?: ViolationLabelNames,
): Result<LabelDecisions, never> {
  const reasoning: LabelReasoning[] = [];
  const labelsToAdd: string[] = [];

  if (config.size.enabled) {
    const sizeLabel = decideSizeLabel(metrics.totalAdditions, config.size.thresholds);
    labelsToAdd.push(sizeLabel);
    reasoning.push({
      label: sizeLabel,
      reason: t('labels', 'reasoning.size', { additions: metrics.totalAdditions, label: sizeLabel }),
      category: 'size',
      matchedFiles: metrics.files.map(f => f.path),
    });
  }

  if (metrics.complexity && config.complexity.enabled) {
    const complexityLabel = decideComplexityLabel(metrics.complexity.maxComplexity, config.complexity.thresholds);
    if (complexityLabel) {
      labelsToAdd.push(complexityLabel);
      const level = complexityLabel.split('/')[1];
      reasoning.push({
        label: complexityLabel,
        reason: t('labels', 'reasoning.complexity', { maxComplexity: metrics.complexity.maxComplexity, level }),
        category: 'complexity',
        matchedFiles: metrics.complexity.files
          .filter(f => f.complexity >= config.complexity.thresholds.medium)
          .map(f => f.path),
      });
    }
  }

  if (config.categoryLabeling.enabled) {
    const categoryResults = decideCategoryLabelsWithFiles(metrics.filesForClassification, config.categories);
    labelsToAdd.push(...categoryResults.map(r => r.label));
    for (const result of categoryResults) {
      reasoning.push({
        label: result.label,
        reason: t('labels', 'reasoning.category', { label: result.label }),
        category: 'category',
        matchedFiles: result.matchedFiles,
      });
    }
  }

  if (config.risk.enabled) {
    const files = metrics.filesForClassification;
    const riskLabel = decideRiskLabel(files, config.risk, prContext);
    if (riskLabel) {
      labelsToAdd.push(riskLabel);
      const riskFiles = getRiskAffectedFiles(files, config.risk);
      reasoning.push({
        label: riskLabel,
        reason: getRiskReason(files, config.risk, riskLabel, prContext),
        category: 'risk',
        matchedFiles: riskFiles,
      });
    }
  }

  const violationLabelsResult = decideViolationLabels(violations, violationLabels);
  labelsToAdd.push(...violationLabelsResult.labels);
  reasoning.push(...violationLabelsResult.reasoning);

  const labelsToRemove = determineLabelsToRemove(labelsToAdd, config.labels.namespace_policies);

  return ok({
    labelsToAdd,
    labelsToRemove,
    reasoning,
  });
}

export function decideSizeLabel(
  additions: number,
  thresholds: { small: number; medium: number; large: number; xlarge: number },
): string {
  return calculateSizeLabel(additions, thresholds);
}

export function decideComplexityLabel(complexity: number, thresholds: { medium: number; high: number }): string | null {
  if (complexity >= thresholds.high) {
    return COMPLEXITY_LABELS.high;
  }
  if (complexity >= thresholds.medium) {
    return COMPLEXITY_LABELS.medium;
  }
  return null;
}

export function decideCategoryLabels(
  files: string[],
  categories: Array<{ label: string; patterns: string[]; exclude?: string[] }>,
): string[] {
  const matchedLabels: string[] = [];

  for (const category of categories) {
    const matchedFiles = matchCategoryFiles(files, category);
    if (matchedFiles.length > 0) {
      matchedLabels.push(category.label);
    }
  }

  return matchedLabels;
}

export function decideCategoryLabelsWithFiles(
  files: string[],
  categories: Array<{ label: string; patterns: string[]; exclude?: string[] }>,
): Array<{ label: string; matchedFiles: string[] }> {
  const results: Array<{ label: string; matchedFiles: string[] }> = [];

  for (const category of categories) {
    const matchedFiles = matchCategoryFiles(files, category);
    if (matchedFiles.length > 0) {
      results.push({ label: category.label, matchedFiles });
    }
  }

  return results;
}

function matchCategoryFiles(
  files: string[],
  category: { label: string; patterns: string[]; exclude?: string[] },
): string[] {
  return files.filter(file => {
    const matchesPattern = category.patterns.some(pattern => minimatch(file, pattern));
    if (!matchesPattern) {
      return false;
    }

    if (category.exclude) {
      const matchesExclude = category.exclude.some(pattern => minimatch(file, pattern));
      if (matchesExclude) {
        return false;
      }
    }

    return true;
  });
}

function determineLabelsToRemove(labelsToAdd: string[], policies: Record<string, 'replace' | 'additive'>): string[] {
  const namespacesToReplace = new Set<string>();

  for (const label of labelsToAdd) {
    const namespace = extractNamespace(label);
    if (namespace) {
      for (const [policyPattern, policy] of Object.entries(policies)) {
        if (policy === 'replace' && matchesNamespacePattern(namespace, policyPattern)) {
          namespacesToReplace.add(policyPattern);
        }
      }
    }
  }

  return Array.from(namespacesToReplace);
}

export interface ViolationLabelNames {
  largeFiles?: string;
  tooManyFiles?: string;
  tooManyLines?: string;
  excessiveChanges?: string;
}

export function decideViolationLabels(
  violations: Violations,
  violationLabels?: ViolationLabelNames,
): {
  labels: string[];
  reasoning: LabelReasoning[];
} {
  const labels: string[] = [];
  const reasoning: LabelReasoning[] = [];

  const largeFilesLabel = violationLabels?.largeFiles || VIOLATION_LABELS.largeFiles;
  const tooManyLinesLabel = violationLabels?.tooManyLines || VIOLATION_LABELS.tooManyLines;
  const excessiveChangesLabel = violationLabels?.excessiveChanges || VIOLATION_LABELS.excessiveChanges;
  const tooManyFilesLabel = violationLabels?.tooManyFiles || VIOLATION_LABELS.tooManyFiles;

  if (violations.largeFiles.length > 0) {
    labels.push(largeFilesLabel);
    reasoning.push({
      label: largeFilesLabel,
      reason: t('labels', 'reasoning.largeFiles', { count: violations.largeFiles.length }),
      category: 'violation',
      matchedFiles: violations.largeFiles.map(v => v.file),
    });
  }

  if (violations.exceedsFileLines.length > 0) {
    labels.push(tooManyLinesLabel);
    reasoning.push({
      label: tooManyLinesLabel,
      reason: t('labels', 'reasoning.tooManyLines', { count: violations.exceedsFileLines.length }),
      category: 'violation',
      matchedFiles: violations.exceedsFileLines.map(v => v.file),
    });
  }

  if (violations.exceedsAdditions) {
    labels.push(excessiveChangesLabel);
    reasoning.push({
      label: excessiveChangesLabel,
      reason: t('labels', 'reasoning.excessiveChanges'),
      category: 'violation',
      matchedFiles: [],
    });
  }

  if (violations.exceedsFileCount) {
    labels.push(tooManyFilesLabel);
    reasoning.push({
      label: tooManyFilesLabel,
      reason: t('labels', 'reasoning.tooManyFiles'),
      category: 'violation',
      matchedFiles: [],
    });
  }

  return { labels, reasoning };
}
